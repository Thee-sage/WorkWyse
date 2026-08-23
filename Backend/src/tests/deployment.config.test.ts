/**
 * Deployment configuration invariants for the Vercel + Azure topology.
 *
 * The frontend runs on Vercel and the API on Azure App Service, which are
 * different registrable domains. That single fact drives several settings
 * that are easy to get wrong and produce a *silently* broken or insecure
 * production deployment rather than a crash — the kind of defect that only
 * shows up after launch. Each one is pinned here.
 *
 * These tests reload config/env under different process.env values, so they
 * exercise the real schema, the real derived defaults, and the real
 * fail-fast checks.
 */

import express from 'express';
import request from 'supertest';

/** Baseline environment that satisfies the schema. */
const BASE_ENV: Record<string, string> = {
  NODE_ENV: 'production',
  PORT: '8080',
  MONGODB_URI: 'mongodb+srv://user:placeholder@fake-cluster.example.invalid/workwyse',
  JWT_SECRET: 'production-access-secret-at-least-32-chars',
  JWT_REFRESH_SECRET: 'production-refresh-secret-at-least-32-chars',
  GMAIL_USER: 'noreply@workwyse.com',
  GMAIL_APP_PASSWORD: 'app-password',
  CORS_ORIGIN: 'https://workwyse.vercel.app',
  LINKEDIN_CLIENT_ID: 'client-id',
  LINKEDIN_CLIENT_SECRET: 'client-secret',
  LINKEDIN_REDIRECT_URI: 'https://workwyse.vercel.app/auth/linkedin/callback',
  ADMIN_ACCESS_PASSPHRASE: 'a-production-admin-passphrase-16plus',
};

interface LoadResult {
  env?: any;
  exited: boolean;
  exitCode?: number;
  errors: string;
}

/**
 * Load config/env in a fresh module registry under the given environment.
 *
 * process.exit is stubbed to throw so an intentionally invalid configuration
 * can be asserted on rather than terminating the Jest worker.
 */
function loadEnv(overrides: Record<string, string | undefined>): LoadResult {
  const saved = { ...process.env };
  const captured: string[] = [];

  jest.resetModules();

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`__process_exit__:${code ?? 0}`);
  }) as never);
  const errorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation((...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    });

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const env = require('../config/env').default;
    return { env, exited: false, errors: captured.join('\n') };
  } catch (err) {
    const match = /__process_exit__:(\d+)/.exec((err as Error).message);
    if (!match) throw err;
    return { exited: true, exitCode: Number(match[1]), errors: captured.join('\n') };
  } finally {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
    process.env = saved;
    jest.resetModules();
  }
}

describe('Cross-site cookie configuration (Vercel frontend, Azure API)', () => {
  it('defaults to SameSite=None and Secure in production', () => {
    // Anything stricter is simply not attached to a cross-site XHR, so
    // POST /api/auth/refresh would arrive with no cookie and every session
    // would end at access-token expiry with a forced logout.
    const { env } = loadEnv({ ...BASE_ENV });
    expect(env.COOKIE_SAMESITE).toBe('none');
    expect(env.COOKIE_SECURE).toBe(true);
  });

  it('defaults to SameSite=Lax outside production so local http development works', () => {
    const { env } = loadEnv({ ...BASE_ENV, NODE_ENV: 'development', CORS_ORIGIN: 'http://localhost:3000' });
    expect(env.COOKIE_SAMESITE).toBe('lax');
  });

  it('forces Secure on whenever SameSite is None, even if not asked for', () => {
    // Browsers silently discard a SameSite=None cookie that is not Secure.
    const { env } = loadEnv({
      ...BASE_ENV,
      NODE_ENV: 'development',
      CORS_ORIGIN: 'http://localhost:3000',
      COOKIE_SAMESITE: 'none',
      COOKIE_SECURE: 'false',
    });
    expect(env.COOKIE_SAMESITE).toBe('none');
    expect(env.COOKIE_SECURE).toBe(true);
  });

  it('honours an explicit override', () => {
    const { env } = loadEnv({ ...BASE_ENV, COOKIE_SAMESITE: 'strict' });
    expect(env.COOKIE_SAMESITE).toBe('strict');
  });

  it('emits a refresh cookie a browser will actually keep and send', async () => {
    const saved = { ...process.env };
    jest.resetModules();
    Object.assign(process.env, BASE_ENV);

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { setRefreshCookie, REFRESH_COOKIE } = require('../utils/cookie');

      const app = express();
      app.get('/set', (_req: express.Request, res: express.Response) => {
        setRefreshCookie(res, 'a-refresh-token');
        res.json({ ok: true });
      });

      const res = await request(app).get('/set');
      const header = String(res.headers['set-cookie']);

      expect(header).toContain(`${REFRESH_COOKIE}=`);
      expect(header).toContain('HttpOnly');          // unreadable from JS, so XSS cannot steal it
      expect(header).toContain('Secure');            // required alongside SameSite=None
      expect(header).toContain('SameSite=None');     // required for Vercel -> Azure
      expect(header).toContain('Path=/api/auth');    // not sent to any other route
      expect(header).toMatch(/Max-Age=\d+/);
    } finally {
      process.env = saved;
      jest.resetModules();
    }
  });

  it('clears the cookie with attributes that match how it was set', async () => {
    const saved = { ...process.env };
    jest.resetModules();
    Object.assign(process.env, BASE_ENV);

    try {
      // A clear whose Path or SameSite differs is ignored by the browser,
      // leaving a valid refresh cookie in place after logout.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { clearRefreshCookie } = require('../utils/cookie');

      const app = express();
      app.get('/clear', (_req: express.Request, res: express.Response) => {
        clearRefreshCookie(res);
        res.json({ ok: true });
      });

      const header = String((await request(app).get('/clear')).headers['set-cookie']);

      expect(header).toContain('Path=/api/auth');
      expect(header).toContain('SameSite=None');
      expect(header).toContain('Secure');
      expect(header).toContain('HttpOnly');
    } finally {
      process.env = saved;
      jest.resetModules();
    }
  });
});

describe('Azure proxy awareness', () => {
  it('trusts exactly one proxy hop by default', () => {
    // App Service terminates TLS at a front end. Without this, req.ip is the
    // proxy address and every visitor shares one rate-limit bucket.
    const { env } = loadEnv({ ...BASE_ENV });
    expect(env.TRUST_PROXY_HOPS).toBe(1);
  });

  it('reports the client address from X-Forwarded-For once configured', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.get('/ip', (req: express.Request, res: express.Response) => res.json({ ip: req.ip }));

    const res = await request(app).get('/ip').set('X-Forwarded-For', '203.0.113.7');
    expect(res.body.ip).toBe('203.0.113.7');
  });

  it('does not let a client spoof extra hops beyond what is trusted', async () => {
    // With a hop count of 1, only the last entry (added by the real proxy)
    // is honoured; earlier entries are attacker-supplied.
    const app = express();
    app.set('trust proxy', 1);
    app.get('/ip', (req: express.Request, res: express.Response) => res.json({ ip: req.ip }));

    const res = await request(app).get('/ip').set('X-Forwarded-For', '1.1.1.1, 203.0.113.7');
    expect(res.body.ip).toBe('203.0.113.7');
    expect(res.body.ip).not.toBe('1.1.1.1');
  });
});

describe('Fail-fast configuration safety checks', () => {
  it('accepts a well-formed production configuration', () => {
    const result = loadEnv({ ...BASE_ENV });
    expect(result.exited).toBe(false);
  });

  it('refuses to start when the two JWT secrets are identical', () => {
    const shared = 'the-same-secret-used-for-both-at-least-32';
    const result = loadEnv({ ...BASE_ENV, JWT_SECRET: shared, JWT_REFRESH_SECRET: shared });
    expect(result.exited).toBe(true);
    expect(result.errors).toMatch(/must be different/i);
  });

  it('refuses a wildcard CORS origin in production', () => {
    const result = loadEnv({ ...BASE_ENV, CORS_ORIGIN: '*' });
    expect(result.exited).toBe(true);
    expect(result.errors).toMatch(/CORS_ORIGIN/);
  });

  it('refuses a plaintext http CORS origin in production', () => {
    // A Secure cookie is never sent to an http origin, so this configuration
    // would break authentication as well as weaken transport security.
    const result = loadEnv({ ...BASE_ENV, CORS_ORIGIN: 'http://workwyse.vercel.app' });
    expect(result.exited).toBe(true);
    expect(result.errors).toMatch(/https/i);
  });

  it('refuses to disable SSRF protection in production', () => {
    const result = loadEnv({ ...BASE_ENV, ALLOW_PRIVATE_NETWORK_FETCH: 'true' });
    expect(result.exited).toBe(true);
    expect(result.errors).toMatch(/ALLOW_PRIVATE_NETWORK_FETCH/);
  });

  it('refuses to start in production with no admin passphrase set', () => {
    // Without this, the admin surface would have no second factor at all
    // in the one environment that matters most.
    const result = loadEnv({ ...BASE_ENV, ADMIN_ACCESS_PASSPHRASE: '' });
    expect(result.exited).toBe(true);
    expect(result.errors).toMatch(/ADMIN_ACCESS_PASSPHRASE/);
  });

  it('refuses a production admin passphrase shorter than 16 characters', () => {
    const result = loadEnv({ ...BASE_ENV, ADMIN_ACCESS_PASSPHRASE: 'tooshort' });
    expect(result.exited).toBe(true);
    expect(result.errors).toMatch(/ADMIN_ACCESS_PASSPHRASE/);
  });

  it('accepts a well-formed production admin passphrase', () => {
    const result = loadEnv({
      ...BASE_ENV,
      ADMIN_ACCESS_PASSPHRASE: 'a-sufficiently-long-passphrase-value',
    });
    expect(result.exited).toBe(false);
  });

  it('refuses a placeholder secret copied from .env.example', () => {
    const result = loadEnv({
      ...BASE_ENV,
      JWT_SECRET: 'your-jwt-secret-here-at-least-32-characters',
    });
    expect(result.exited).toBe(true);
    expect(result.errors).toMatch(/placeholder/i);
  });

  it('refuses a JWT secret shorter than 32 characters', () => {
    const result = loadEnv({ ...BASE_ENV, JWT_SECRET: 'too-short' });
    expect(result.exited).toBe(true);
  });

  it('refuses to start with an empty MONGODB_URI', () => {
    // An empty string rather than a deleted key: config/env calls
    // dotenv.config(), which would repopulate a missing variable from the
    // developer's local .env and mask the failure.
    const result = loadEnv({ ...BASE_ENV, MONGODB_URI: '' });
    expect(result.exited).toBe(true);
  });

  it('allows http origins and matching secrets checks to relax outside production', () => {
    const result = loadEnv({
      ...BASE_ENV,
      NODE_ENV: 'development',
      CORS_ORIGIN: 'http://localhost:3000',
    });
    expect(result.exited).toBe(false);
  });

  it('never prints a secret value in its error output', () => {
    const shared = 'the-same-secret-used-for-both-at-least-32';
    const result = loadEnv({ ...BASE_ENV, JWT_SECRET: shared, JWT_REFRESH_SECRET: shared });
    expect(result.errors).not.toContain(shared);
    expect(result.errors).not.toContain(BASE_ENV.MONGODB_URI);
  });
});

describe('Logging configuration', () => {
  it('does not write log files unless explicitly enabled', () => {
    // An App Service container has an ephemeral, sometimes read-only app
    // directory; an unconditional file transport can throw on write.
    const { env } = loadEnv({ ...BASE_ENV });
    expect(env.LOG_TO_FILE).toBe(false);
  });
});
