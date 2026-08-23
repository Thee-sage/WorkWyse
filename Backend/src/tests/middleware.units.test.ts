/**
 * Direct tests for middleware branches the route-level suites never reach.
 *
 * Three of these matter well beyond their coverage contribution:
 *
 *  - the wildcard CORS matcher, which is hand-rolled glob logic guarding who
 *    may call the API with credentials;
 *  - optionalAuth, which decides whether an anonymous caller silently becomes
 *    an authenticated one;
 *  - requirePermission's unknown-permission path, which must fail closed.
 */

import express, { Application, Request, Response } from 'express';
import request from 'supertest';
import { generateTestToken, generateRefreshToken } from './helpers/testApp';

jest.mock('../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn(), debug: jest.fn() },
}));

/** Build an app whose CORS allowlist is the supplied value. */
function appWithCorsOrigin(origins: string): Application {
  const saved = { ...process.env };
  jest.resetModules();
  process.env.CORS_ORIGIN = origins;

  try {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { corsMiddleware } = require('../middleware/cors');
    const { errorHandler } = require('../middleware/errorHandler');
    /* eslint-enable @typescript-eslint/no-var-requires */

    const app = express();
    app.use(corsMiddleware);
    app.get('/probe', (_req: Request, res: Response) => res.json({ ok: true }));
    app.use(errorHandler);
    return app;
  } finally {
    process.env = saved;
  }
}

describe('CORS wildcard matching', () => {
  // Vercel mints a fresh domain per preview deployment, so those origins
  // cannot be enumerated ahead of time.
  const ALLOWLIST = 'https://workwyse.com,https://*.vercel.app';

  const accepted = [
    'https://workwyse.com',
    'https://workwyse.vercel.app',
    'https://workwyse-git-main.vercel.app',
    'https://workwyse-abc123.vercel.app',
  ];

  it.each(accepted)('accepts %s', async (origin) => {
    const res = await request(appWithCorsOrigin(ALLOWLIST)).get('/probe').set('Origin', origin);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
  });

  const rejected: Array<[string, string]> = [
    ['https://workwyse.vercel.app.evil.com', 'suffix extension of an allowed host'],
    ['https://evil.com', 'unrelated origin'],
    ['http://workwyse.vercel.app', 'right host over plaintext http'],
    ['https://a.b.vercel.app', 'wildcard must not span a dot'],
    ['https://vercel.app', 'bare apex, wildcard requires a label'],
    ['https://workwyse.com.evil.com', 'exact entry used as a prefix'],
    ['https://evil.com/https://workwyse.vercel.app', 'allowed origin embedded in a path'],
  ];

  it.each(rejected)('rejects %s (%s)', async (origin) => {
    const res = await request(appWithCorsOrigin(ALLOWLIST)).get('/probe').set('Origin', origin);
    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does not treat a regex metacharacter in the allowlist as a pattern', async () => {
    // The matcher is deliberately not regex-based; a dot in an entry must
    // match only a literal dot.
    const res = await request(appWithCorsOrigin('https://work-wyse.com'))
      .get('/probe')
      .set('Origin', 'https://workXwyse.com');

    expect(res.status).toBe(403);
  });

  it('handles an allowlist entry that ends in a wildcard', async () => {
    const app = appWithCorsOrigin('https://preview-*');

    const allowed = await request(app).get('/probe').set('Origin', 'https://preview-42');
    expect(allowed.status).toBe(200);

    const denied = await request(app).get('/probe').set('Origin', 'https://preview-42.evil.com');
    expect(denied.status).toBe(403);
  });

  it('tolerates whitespace around entries', async () => {
    const res = await request(appWithCorsOrigin(' https://workwyse.com , https://x.com '))
      .get('/probe')
      .set('Origin', 'https://x.com');

    expect(res.status).toBe(200);
  });
});

describe('optionalAuth', () => {
  /** Route that reports whether a user was attached. */
  function app(): Application {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { optionalAuth } = require('../middleware/auth');

    const instance = express();
    instance.get('/who', optionalAuth, (req: Request, res: Response) =>
      res.json({ user: (req as Request & { user?: unknown }).user ?? null })
    );
    return instance;
  }

  it('leaves the request anonymous when no header is present', async () => {
    const res = await request(app()).get('/who');
    expect(res.body.user).toBeNull();
  });

  it('attaches the user for a valid access token', async () => {
    const res = await request(app())
      .get('/who')
      .set('Authorization', `Bearer ${generateTestToken({ uid: 'uid-42', username: 'zoe' })}`);

    expect(res.body.user).toMatchObject({ uid: 'uid-42', username: 'zoe' });
  });

  it('stays anonymous rather than erroring on a malformed token', async () => {
    const res = await request(app()).get('/who').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('stays anonymous for a token signed with the wrong secret', async () => {
    const forged = generateTestToken({ secret: 'an-entirely-different-secret-32-chars' });
    const res = await request(app()).get('/who').set('Authorization', `Bearer ${forged}`);
    expect(res.body.user).toBeNull();
  });

  it('ignores a refresh token instead of treating it as a session', async () => {
    const res = await request(app())
      .get('/who')
      .set('Authorization', `Bearer ${generateRefreshToken()}`);

    expect(res.body.user).toBeNull();
  });

  it('ignores a non-bearer scheme', async () => {
    const res = await request(app()).get('/who').set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(res.body.user).toBeNull();
  });
});

describe('requirePermission', () => {
  function app(permission: string): Application {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { authenticate } = require('../middleware/auth');
    const { requirePermission } = require('../middleware/rbac');
    const { errorHandler } = require('../middleware/errorHandler');
    /* eslint-enable @typescript-eslint/no-var-requires */

    const instance = express();
    instance.get('/guarded', authenticate, requirePermission(permission), (_req, res) =>
      res.json({ ok: true })
    );
    instance.use(errorHandler);
    return instance;
  }

  it('allows a role that holds the permission', async () => {
    const res = await request(app('analytics:view'))
      .get('/guarded')
      .set('Authorization', `Bearer ${generateTestToken({ role: 'admin' })}`);

    expect(res.status).toBe(200);
  });

  it('allows a moderator where the permission grants it', async () => {
    const res = await request(app('reports:review'))
      .get('/guarded')
      .set('Authorization', `Bearer ${generateTestToken({ role: 'moderator' })}`);

    expect(res.status).toBe(200);
  });

  it('denies a role that does not hold the permission', async () => {
    const res = await request(app('admin:users:role'))
      .get('/guarded')
      .set('Authorization', `Bearer ${generateTestToken({ role: 'user' })}`);

    expect(res.status).toBe(403);
  });

  it('denies an anonymous caller', async () => {
    const res = await request(app('analytics:view')).get('/guarded');
    expect(res.status).toBe(401);
  });

  it('fails closed on a permission name that is not in the map', async () => {
    // A typo in a permission string must never turn into an open door.
    const res = await request(app('permission:that:does:not:exist'))
      .get('/guarded')
      .set('Authorization', `Bearer ${generateTestToken({ role: 'admin' })}`);

    expect(res.status).toBe(500);
    expect(res.body.ok).toBeUndefined();
  });
});

describe('validate', () => {
  it('passes a non-Zod error through untouched', async () => {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { validate } = require('../middleware/validate');
    const { errorHandler } = require('../middleware/errorHandler');
    /* eslint-enable @typescript-eslint/no-var-requires */

    const exploding = {
      parse: () => {
        throw new Error('not a zod problem');
      },
    };

    const app = express();
    app.use(express.json());
    app.post('/x', validate({ body: exploding as never }), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);

    const res = await request(app).post('/x').send({});
    expect(res.status).toBe(500);
  });
});
