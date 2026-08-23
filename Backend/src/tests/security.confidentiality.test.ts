/**
 * Data confidentiality.
 *
 * Everything here answers one question: can a caller ever see a value they
 * are not entitled to? That covers credential material leaving in a response
 * body, internal details leaking through error paths, and secrets reaching
 * the logs.
 *
 * Fields that must never appear in any API response, regardless of caller.
 */
const FORBIDDEN_RESPONSE_FIELDS = ['password', 'refreshToken', '__v'];

import request from 'supertest';
import express from 'express';

jest.mock('../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn(), debug: jest.fn() },
}));

jest.mock('../services/emailService', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

/** A user document as it exists in MongoDB, credential material included. */
const STORED_USER = {
  _id: 'mongo-object-id',
  username: 'alice',
  email: 'alice@example.com',
  password: '$2a$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQR',
  uid: 'uid-alice-001',
  type: 'public',
  role: 'user',
  isEmailVerified: true,
  refreshToken: 'a-previously-issued-refresh-token',
  linkedinVerified: false,
  linkedinId: 'linkedin-sub-123',
  watchedJobs: [],
  __v: 0,
  save: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    compare: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue('$2a$12$hashed'),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const User = require('../models/User').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AuthService = require('../services/AuthService').default;

/** Recursively collect every key present in a structure. */
function allKeys(value: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => allKeys(item, found));
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      found.add(key);
      allKeys(nested, found);
    }
  }
  return found;
}

beforeEach(() => {
  jest.clearAllMocks();
  STORED_USER.save = jest.fn().mockResolvedValue(undefined);
});

describe('Credential material never leaves in a response', () => {
  it('login returns only the safe projection of a user', async () => {
    User.findOne.mockResolvedValue({ ...STORED_USER });

    const result = await AuthService.login('alice', 'correct-password');
    const keys = allKeys(result.user);

    for (const field of FORBIDDEN_RESPONSE_FIELDS) {
      expect(keys.has(field)).toBe(false);
    }

    // Pin the allowed shape so a field added to the model is not silently
    // exposed by a future change to safeUser.
    expect(Object.keys(result.user).sort()).toEqual(
      [
        'email',
        'linkedinAvatarUrl',
        'linkedinDisplayName',
        'linkedinVerified',
        'role',
        'type',
        'uid',
        'username',
      ].sort()
    );
  });

  it('login never echoes the password hash anywhere in its result', async () => {
    User.findOne.mockResolvedValue({ ...STORED_USER });

    const result = await AuthService.login('alice', 'correct-password');
    const serialised = JSON.stringify(result);

    expect(serialised).not.toContain(STORED_USER.password);
    expect(serialised).not.toContain('$2a$12$');
  });

  it('login does not return the stored refresh token in the JSON body', async () => {
    // The refresh token is delivered as an httpOnly cookie by the
    // controller. If it also appeared in the body, JavaScript on the page
    // could read it and the httpOnly protection would be pointless.
    User.findOne.mockResolvedValue({ ...STORED_USER });

    const result = await AuthService.login('alice', 'correct-password');
    expect(JSON.stringify(result.user)).not.toContain(STORED_USER.refreshToken);
  });

  it('getMe returns the same safe projection', async () => {
    User.findOne.mockResolvedValue({ ...STORED_USER });

    const user = await AuthService.getMe('uid-alice-001');
    const keys = allKeys(user);

    for (const field of FORBIDDEN_RESPONSE_FIELDS) {
      expect(keys.has(field)).toBe(false);
    }
  });

  it('does not expose the internal Mongo _id', async () => {
    // _id is not secret, but leaking it invites enumeration and couples
    // clients to the storage layer; uid is the public identifier.
    User.findOne.mockResolvedValue({ ...STORED_USER });

    const user = await AuthService.getMe('uid-alice-001');
    expect(allKeys(user).has('_id')).toBe(false);
  });
});

describe('Authentication failures do not disclose account existence', () => {
  it('returns the same message whether the account exists or not', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require('bcryptjs').default;

    User.findOne.mockResolvedValue(null);
    const unknownAccount = await AuthService.login('ghost', 'whatever').catch((e: Error) => e);

    User.findOne.mockResolvedValue({ ...STORED_USER });
    bcrypt.compare.mockResolvedValue(false);
    const wrongPassword = await AuthService.login('alice', 'wrong').catch((e: Error) => e);

    expect((unknownAccount as Error).message).toBe((wrongPassword as Error).message);
    expect((unknownAccount as Error).message).toMatch(/invalid credentials/i);
  });

  it('password reset reports success for an address that does not exist', async () => {
    // Any difference here turns the endpoint into an account oracle.
    User.findOne.mockResolvedValue(null);
    await expect(AuthService.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
  });
});

describe('Error responses do not leak internals', () => {
  /**
   * Build an app whose single route throws the error produced by `make`.
   *
   * The factory receives the freshly-required ApiError class. Constructing
   * the error from the same module registry the handler uses matters:
   * jest.resetModules gives each require a distinct class object, and an
   * `instanceof` check across two of them is always false.
   */
  function appThrowing(make: (deps: { ApiError: any }) => Error, nodeEnv: string) {
    const saved = { ...process.env };
    jest.resetModules();
    process.env.NODE_ENV = nodeEnv;
    if (nodeEnv === 'production') {
      process.env.CORS_ORIGIN = 'https://workwyse.vercel.app';
    }

    try {
      /* eslint-disable @typescript-eslint/no-var-requires */
      const { errorHandler } = require('../middleware/errorHandler');
      const { ApiError } = require('../utils/ApiError');
      /* eslint-enable @typescript-eslint/no-var-requires */
      const error = make({ ApiError });
      const app = express();
      app.get('/boom', (_req, _res, next) => next(error));
      app.use(errorHandler);
      return app;
    } finally {
      process.env = saved;
    }
  }

  it('hides the message of an unexpected failure in production', async () => {
    const res = await request(
      appThrowing(
        () => new Error('connection to mongodb+srv://admin:hunter2@cluster.mongodb.net failed'),
        'production'
      )
    ).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
    expect(JSON.stringify(res.body)).not.toContain('mongodb+srv');
  });

  it('never includes a stack trace in production', async () => {
    const res = await request(appThrowing(() => new Error('kaboom'), 'production')).get('/boom');
    expect(res.body.stack).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/\.ts:\d+/);
  });

  it('still surfaces operational messages so clients can act on them', async () => {
    const res = await request(
      appThrowing(({ ApiError }) => ApiError.badRequest('Title is required'), 'production')
    ).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Title is required');
  });

  it('maps an invalid ObjectId to 400 without echoing the raw value', async () => {
    const res = await request(
      appThrowing(
        () =>
          Object.assign(new Error('Cast to ObjectId failed for value "../../etc/passwd"'), {
            name: 'CastError',
          }),
        'production'
      )
    ).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid ID format');
    expect(JSON.stringify(res.body)).not.toContain('etc/passwd');
  });

  it('maps a duplicate key error to 409 without naming the colliding index', async () => {
    const res = await request(
      appThrowing(
        () => Object.assign(new Error('E11000 duplicate key error'), { code: 11000 }),
        'production'
      )
    ).get('/boom');

    expect(res.status).toBe(409);
    expect(res.body.message).not.toContain('E11000');
  });
});

describe('Secrets do not reach the logs', () => {
  it('a failed login logs the account id but not the submitted password', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const logger = require('../config/logger').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require('bcryptjs').default;

    User.findOne.mockResolvedValue({ ...STORED_USER });
    bcrypt.compare.mockResolvedValue(false);

    await AuthService.login('alice', 'SuperSecret123').catch(() => undefined);

    const logged = JSON.stringify(logger.warn.mock.calls) + JSON.stringify(logger.info.mock.calls);
    expect(logged).not.toContain('SuperSecret123');
    expect(logged).not.toContain(STORED_USER.password);
  });

  it('a login for an unknown account does not log a password', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const logger = require('../config/logger').default;

    User.findOne.mockResolvedValue(null);
    await AuthService.login('ghost', 'AnotherSecret456').catch(() => undefined);

    const logged = JSON.stringify(logger.warn.mock.calls);
    expect(logged).not.toContain('AnotherSecret456');
  });
});
