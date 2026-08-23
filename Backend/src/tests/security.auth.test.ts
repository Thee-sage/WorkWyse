/**
 * Authentication and authorization.
 *
 * Two halves:
 *
 *  1. Token forgery — every way a caller might try to manufacture or
 *     repurpose a credential (alg=none, wrong secret, refresh-as-access,
 *     tampered claims, expired tokens).
 *
 *  2. A route guard matrix — for each protected endpoint, assert it rejects
 *     an anonymous caller and a caller whose role or verification state is
 *     insufficient. Only the rejection direction is asserted, because a
 *     rejection happens in middleware and never reaches the database; that
 *     is also the direction that matters for confidentiality.
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { Application } from 'express';
import env from '../config/env';
import {
  createFullApp,
  generateTestToken,
  generateRefreshToken,
  generateUnverifiedToken,
} from './helpers/testApp';

jest.mock('../config/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
  resetCloudinaryConfig: jest.fn(),
}));

jest.mock('../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn(), debug: jest.fn() },
}));

const base64url = (value: object | string) =>
  Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** A protected endpoint used for generic token checks. */
const PROTECTED = { method: 'get' as const, path: '/api/notifications' };

describe('Token forgery and misuse', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  const hit = (token?: string) => {
    const req = request(app)[PROTECTED.method](PROTECTED.path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  it('rejects a request with no Authorization header', async () => {
    const res = await hit();
    expect(res.status).toBe(401);
  });

  it.each([
    ['an empty bearer value', 'Bearer '],
    ['a non-bearer scheme', 'Basic dXNlcjpwYXNz'],
    ['a bare token with no scheme', 'eyJhbGciOiJIUzI1NiJ9.e30.x'],
    ['a lowercase scheme', 'bearer sometoken'],
  ])('rejects %s', async (_label, header) => {
    const res = await request(app)[PROTECTED.method](PROTECTED.path).set('Authorization', header);
    expect(res.status).toBe(401);
  });

  it('rejects an alg=none token', async () => {
    // The canonical JWT bypass: strip the signature and claim the algorithm
    // is "none". jsonwebtoken must not accept it when a secret is supplied.
    const forged = [
      base64url({ alg: 'none', typ: 'JWT' }),
      base64url({ uid: 'attacker', username: 'attacker', role: 'admin', isEmailVerified: true, type: 'access' }),
      '',
    ].join('.');

    const res = await hit(forged);
    expect(res.status).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = generateTestToken({ secret: 'a-completely-different-secret-32-chars-long' });
    const res = await hit(forged);
    expect(res.status).toBe(401);
  });

  it('rejects a refresh token presented as a bearer access token', async () => {
    // Even though the refresh secret is valid, the type claim must gate it.
    const res = await hit(generateRefreshToken());
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/token type|invalid access token/i);
  });

  it('rejects an access-typed token signed with the refresh secret', async () => {
    const forged = jwt.sign(
      { uid: 'u', username: 'u', role: 'admin', isEmailVerified: true, type: 'access' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '1h' }
    );
    const res = await hit(forged);
    expect(res.status).toBe(401);
  });

  it('rejects a token with no type claim at all', async () => {
    const forged = jwt.sign(
      { uid: 'u', username: 'u', role: 'admin', isEmailVerified: true },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const res = await hit(forged);
    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign(
      { uid: 'u', username: 'u', role: 'user', isEmailVerified: true, type: 'access' },
      env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await hit(expired);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('rejects a token whose payload was tampered with after signing', async () => {
    const valid = generateTestToken({ role: 'user' });
    const [header, , signature] = valid.split('.');
    const escalated = base64url({
      uid: 'test-user-uid-123',
      username: 'testuser',
      role: 'admin',
      isEmailVerified: true,
      type: 'access',
    });

    const res = await hit([header, escalated, signature].join('.'));
    expect(res.status).toBe(401);
  });

  it('does not leak the signing secret or a stack trace in the rejection', async () => {
    const res = await hit('garbage.token.value');
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(env.JWT_SECRET);
    expect(body).not.toContain(env.JWT_REFRESH_SECRET);
    expect(body).not.toMatch(/at .*\.ts:\d+/);
  });
});

describe('Route guard matrix', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  const OBJECT_ID = '507f1f77bcf86cd799439011';

  type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

  const send = (method: Method, path: string, token?: string) => {
    const req = request(app)[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  /** Endpoints that must never serve an anonymous caller. */
  const requiresAuth: Array<[Method, string]> = [
    ['get', '/api/auth/me'],
    ['post', '/api/auth/logout'],
    ['put', '/api/auth/user-type'],
    ['get', '/api/notifications'],
    ['get', '/api/notifications/unread-count'],
    ['patch', '/api/notifications/read-all'],
    ['get', '/api/jobs/watching'],
    ['get', '/api/jobs/mine/contributions'],
    ['post', '/api/jobs'],
    ['post', '/api/jobs/extract'],
    ['put', `/api/jobs/${OBJECT_ID}`],
    ['delete', `/api/jobs/${OBJECT_ID}`],
    ['post', `/api/jobs/${OBJECT_ID}/vote`],
    ['get', `/api/jobs/${OBJECT_ID}/vote`],
    ['post', `/api/jobs/${OBJECT_ID}/reviews`],
    ['post', `/api/jobs/${OBJECT_ID}/evidence`],
    ['get', `/api/jobs/${OBJECT_ID}/watch`],
    ['post', `/api/jobs/${OBJECT_ID}/watch`],
    ['delete', `/api/jobs/${OBJECT_ID}/watch`],
    ['get', '/api/jobs/moderation/evidence-queue'],
    ['patch', `/api/jobs/${OBJECT_ID}/evidence/${OBJECT_ID}`],
    ['post', '/api/reports'],
    ['get', '/api/reports/mine'],
    ['get', '/api/reports'],
    ['patch', `/api/reports/${OBJECT_ID}/status`],
    ['post', '/api/companies'],
    ['put', `/api/companies/${OBJECT_ID}`],
    ['delete', `/api/companies/${OBJECT_ID}`],
    ['post', `/api/companies/${OBJECT_ID}/reviews`],
    ['get', '/api/admin/users'],
    ['patch', '/api/admin/users/some-uid/role'],
    ['post', '/api/admin/api-keys'],
    ['get', '/api/admin/api-keys'],
    ['delete', `/api/admin/api-keys/${OBJECT_ID}`],
    ['get', '/api/analytics/dashboard'],
    ['get', '/api/analytics/trends/jobs'],
    ['get', '/api/analytics/trends/reports'],
    ['get', '/api/activity'],
    ['get', '/api/export/jobs.csv'],
    ['get', '/api/export/reports.csv'],
    ['post', '/api/export/jobs/import'],
    ['post', '/api/upload'],
    ['post', `/api/jobs/${OBJECT_ID}/comments`],
  ];

  it.each(requiresAuth)('%s %s rejects an anonymous caller', async (method, path) => {
    const res = await send(method, path);
    expect(res.status).toBe(401);
  });

  /** Endpoints that must reject a plain authenticated user. */
  const requiresElevatedRole: Array<[Method, string]> = [
    ['get', '/api/admin/users'],
    ['patch', '/api/admin/users/some-uid/role'],
    ['post', '/api/admin/api-keys'],
    ['get', '/api/admin/api-keys'],
    ['delete', `/api/admin/api-keys/${OBJECT_ID}`],
    ['get', '/api/analytics/dashboard'],
    ['get', '/api/analytics/trends/jobs'],
    ['get', '/api/analytics/trends/reports'],
    ['get', '/api/activity'],
    ['get', '/api/reports'],
    ['patch', `/api/reports/${OBJECT_ID}/status`],
    ['get', '/api/jobs/moderation/evidence-queue'],
    ['patch', `/api/jobs/${OBJECT_ID}/evidence/${OBJECT_ID}`],
    ['post', '/api/companies'],
    ['put', `/api/companies/${OBJECT_ID}`],
    ['delete', `/api/companies/${OBJECT_ID}`],
    ['get', '/api/export/reports.csv'],
  ];

  it.each(requiresElevatedRole)(
    '%s %s rejects a standard user role',
    async (method, path) => {
      const res = await send(method, path, generateTestToken({ role: 'user' }));
      expect(res.status).toBe(403);
    }
  );

  /** Endpoints gated on a confirmed email address. */
  const requiresVerifiedEmail: Array<[Method, string]> = [
    ['post', '/api/jobs'],
    ['post', '/api/jobs/extract'],
    ['post', `/api/jobs/${OBJECT_ID}/vote`],
    ['post', `/api/jobs/${OBJECT_ID}/reviews`],
    ['post', `/api/jobs/${OBJECT_ID}/evidence`],
    ['post', '/api/reports'],
    ['post', `/api/companies/${OBJECT_ID}/reviews`],
    ['post', `/api/jobs/${OBJECT_ID}/comments`],
  ];

  it.each(requiresVerifiedEmail)(
    '%s %s rejects an account that never confirmed its OTP',
    async (method, path) => {
      const res = await send(method, path, generateUnverifiedToken());
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/verif/i);
    }
  );

  /**
   * A moderator must not be able to reach admin-only endpoints. This is the
   * privilege boundary most likely to erode as routes are added, because
   * "admin, moderator" reads as a natural pair everywhere else.
   */
  const adminOnly: Array<[Method, string]> = [
    ['get', '/api/admin/users'],
    ['patch', '/api/admin/users/some-uid/role'],
    ['post', '/api/admin/api-keys'],
    ['get', '/api/admin/api-keys'],
    ['delete', `/api/admin/api-keys/${OBJECT_ID}`],
    ['post', '/api/companies'],
    ['put', `/api/companies/${OBJECT_ID}`],
    ['delete', `/api/companies/${OBJECT_ID}`],
    ['get', '/api/export/reports.csv'],
  ];

  it.each(adminOnly)('%s %s rejects a moderator', async (method, path) => {
    const res = await send(method, path, generateTestToken({ role: 'moderator' }));
    expect(res.status).toBe(403);
  });

  /**
   * The admin passphrase second factor: holding a valid admin-role token is
   * no longer sufficient on its own to reach these routes — an unlock token
   * (X-Admin-Unlock) obtained via POST /api/admin/unlock is also required.
   * This is the boundary requireAdminUnlock exists to enforce, and it must
   * hold even for a genuinely valid admin session.
   */
  const requiresAdminUnlock: Array<[Method, string]> = [
    ['get', '/api/admin/users'],
    ['patch', '/api/admin/users/some-uid/role'],
    ['post', '/api/admin/api-keys'],
    ['get', '/api/admin/api-keys'],
    ['delete', `/api/admin/api-keys/${OBJECT_ID}`],
    ['patch', `/api/reports/${OBJECT_ID}/status`],
    ['get', '/api/reports/decision-requests'],
    ['patch', `/api/reports/decision-requests/${OBJECT_ID}/approve`],
    ['patch', `/api/reports/decision-requests/${OBJECT_ID}/reject`],
  ];

  it.each(requiresAdminUnlock)(
    '%s %s rejects a valid admin token with no unlock header',
    async (method, path) => {
      const res = await send(method, path, generateTestToken({ role: 'admin' }));
      expect(res.status).toBe(403);
    }
  );

  it.each(requiresAdminUnlock)(
    '%s %s rejects a valid admin token with a garbage unlock header',
    async (method, path) => {
      const res = await request(app)
        [method](path)
        .set('Authorization', `Bearer ${generateTestToken({ role: 'admin' })}`)
        .set('X-Admin-Unlock', 'not-a-real-token');
      expect(res.status).toBe(403);
    }
  );

  it('rejects an admin unlock token issued to a different admin account', async () => {
    // Bound to the uid it was issued for — one admin's unlock must not be
    // usable by any other account, including another admin.
    const jwt = require('jsonwebtoken');
    const foreignUnlock = jwt.sign(
      { uid: 'a-different-admin-uid', purpose: 'admin_unlock' },
      env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${generateTestToken({ uid: 'this-admin-uid', role: 'admin' })}`)
      .set('X-Admin-Unlock', foreignUnlock);

    expect(res.status).toBe(403);
  });

  it('rejects an expired admin unlock token', async () => {
    const jwt = require('jsonwebtoken');
    const expiredUnlock = jwt.sign(
      { uid: 'test-user-uid-123', purpose: 'admin_unlock' },
      env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${generateTestToken({ role: 'admin' })}`)
      .set('X-Admin-Unlock', expiredUnlock);

    expect(res.status).toBe(403);
  });

  it('accepts a valid admin token paired with its own genuine unlock token', async () => {
    const jwt = require('jsonwebtoken');
    const uid = 'test-user-uid-123';
    const unlock = jwt.sign({ uid, purpose: 'admin_unlock' }, env.JWT_SECRET, { expiresIn: '12h' });

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${generateTestToken({ uid, role: 'admin' })}`)
      .set('X-Admin-Unlock', unlock);

    // Reaches the controller — status depends on DB state, not on auth, so
    // the only thing pinned here is that auth itself did not reject it.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  describe('POST /api/admin/unlock', () => {
    it('rejects an anonymous caller', async () => {
      const res = await request(app).post('/api/admin/unlock').send({ passphrase: 'anything' });
      expect(res.status).toBe(401);
    });

    it('rejects a non-admin role even with the correct passphrase', async () => {
      const res = await request(app)
        .post('/api/admin/unlock')
        .set('Authorization', `Bearer ${generateTestToken({ role: 'user' })}`)
        .send({ passphrase: env.ADMIN_ACCESS_PASSPHRASE });
      expect(res.status).toBe(403);
    });

    it('rejects an admin with the wrong passphrase', async () => {
      const res = await request(app)
        .post('/api/admin/unlock')
        .set('Authorization', `Bearer ${generateTestToken({ role: 'admin' })}`)
        .send({ passphrase: 'definitely-not-the-right-passphrase' });
      expect(res.status).toBe(401);
    });

    it('issues an unlock token for an admin with the correct passphrase', async () => {
      const res = await request(app)
        .post('/api/admin/unlock')
        .set('Authorization', `Bearer ${generateTestToken({ role: 'admin' })}`)
        .send({ passphrase: env.ADMIN_ACCESS_PASSPHRASE });

      expect(res.status).toBe(200);
      expect(typeof res.body.data.unlockToken).toBe('string');
    });

    it('never echoes the configured passphrase back in any response', async () => {
      const res = await request(app)
        .post('/api/admin/unlock')
        .set('Authorization', `Bearer ${generateTestToken({ role: 'admin' })}`)
        .send({ passphrase: 'wrong-guess-at-the-passphrase' });

      expect(JSON.stringify(res.body)).not.toContain(env.ADMIN_ACCESS_PASSPHRASE);
    });
  });

  it('rejects an unrecognised role outright', async () => {
    const res = await send(
      'get',
      '/api/admin/users',
      generateTestToken({ role: 'superadmin' as never })
    );
    expect(res.status).toBe(403);
  });
});

describe('Public endpoints stay public', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  /**
   * These must not start demanding a token — a regression here is an outage
   * for anonymous visitors rather than a security hole, which is why the
   * assertion is only that the response is not 401.
   */
  const publicPaths = [
    '/health',
    '/api/analytics/public',
  ];

  it.each(publicPaths)('%s does not require authentication', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).not.toBe(401);
  });
});
