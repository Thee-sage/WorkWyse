/**
 * The extension API's own security surface: key-based auth (distinct from
 * the session/JWT flow), and the SSRF guard on its lookup endpoint.
 *
 * Route-level auth here uses requireApiKey, not authenticate/authorize —
 * this suite exists specifically because that is a different code path
 * from everything security.auth.test.ts already covers, and a regression
 * here (e.g. accepting a session JWT as an API key, or vice versa) would
 * not be caught by any existing suite.
 */

import request from 'supertest';
import crypto from 'crypto';
import dns from 'dns';
import type { Application } from 'express';
import { createFullApp, generateTestToken } from './helpers/testApp';

/** Points every hostname lookup at a public address, so a legitimate-URL
 *  case does not depend on real DNS resolving in whatever environment the
 *  suite runs in (offline CI included). */
function mockPublicDns() {
  return jest
    .spyOn(dns.promises, 'lookup')
    .mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
}

jest.mock('../config/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
  resetCloudinaryConfig: jest.fn(),
}));

jest.mock('../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn(), debug: jest.fn() },
}));

const VALID_RAW_KEY = 'wwx_test-key-abc123';
const VALID_HASH = crypto.createHash('sha256').update(VALID_RAW_KEY).digest('hex');

const REVOKED_RAW_KEY = 'wwx_revoked-key-xyz789';
const REVOKED_HASH = crypto.createHash('sha256').update(REVOKED_RAW_KEY).digest('hex');

jest.mock('../models/ApiKey', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn((query: { keyHash: string }) => {
      if (query.keyHash === VALID_HASH) {
        return Promise.resolve({
          _id: 'key-id-1',
          keyHash: VALID_HASH,
          scopes: ['extension:lookup'],
          revokedAt: undefined,
          userId: undefined,
        });
      }
      if (query.keyHash === REVOKED_HASH) {
        return Promise.resolve({
          _id: 'key-id-2',
          keyHash: REVOKED_HASH,
          scopes: ['extension:lookup'],
          revokedAt: new Date('2020-01-01'),
        });
      }
      return Promise.resolve(null);
    }),
    updateOne: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../models/Job', () => ({
  __esModule: true,
  Job: {
    findOne: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) }),
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
    }),
  },
}));

jest.mock('../models/Company', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) }),
  },
}));

jest.mock('../models/Report', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn().mockResolvedValue(0) },
}));

describe('Extension API — key-based authentication', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  it('rejects a request with no X-API-Key header', async () => {
    const res = await request(app)
      .post('/api/extension/lookup')
      .send({ url: 'https://jobs.example.com/1' });

    expect(res.status).toBe(401);
  });

  it('rejects an unknown key', async () => {
    const res = await request(app)
      .post('/api/extension/lookup')
      .set('X-API-Key', 'wwx_not-a-real-key')
      .send({ url: 'https://jobs.example.com/1' });

    expect(res.status).toBe(401);
  });

  it('rejects a revoked key', async () => {
    const res = await request(app)
      .post('/api/extension/lookup')
      .set('X-API-Key', REVOKED_RAW_KEY)
      .send({ url: 'https://jobs.example.com/1' });

    expect(res.status).toBe(401);
  });

  it('accepts a valid, unrevoked key', async () => {
    mockPublicDns();
    const res = await request(app)
      .post('/api/extension/lookup')
      .set('X-API-Key', VALID_RAW_KEY)
      .send({ url: 'https://jobs.example.com/1' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('unknown');
    jest.restoreAllMocks();
  });

  it('rejects a session access token used as an API key', async () => {
    // The two credential types must never be interchangeable.
    const sessionToken = generateTestToken();
    const res = await request(app)
      .post('/api/extension/lookup')
      .set('X-API-Key', sessionToken)
      .send({ url: 'https://jobs.example.com/1' });

    expect(res.status).toBe(401);
  });

  it('does not accept the key via Authorization Bearer instead of X-API-Key', async () => {
    const res = await request(app)
      .post('/api/extension/lookup')
      .set('Authorization', `Bearer ${VALID_RAW_KEY}`)
      .send({ url: 'https://jobs.example.com/1' });

    expect(res.status).toBe(401);
  });
});

describe('Extension API — input validation and SSRF guard', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  it('rejects a non-URL string', async () => {
    const res = await request(app)
      .post('/api/extension/lookup')
      .set('X-API-Key', VALID_RAW_KEY)
      .send({ url: 'not a url' });

    expect(res.status).toBe(400);
  });

  it('rejects a missing url field', async () => {
    const res = await request(app)
      .post('/api/extension/lookup')
      .set('X-API-Key', VALID_RAW_KEY)
      .send({});

    expect(res.status).toBe(400);
  });

  it.each([
    'http://169.254.169.254/metadata',
    'http://127.0.0.1:5000/api/admin/users',
    'http://10.0.0.5/internal',
    'file:///etc/passwd',
  ])('rejects %s as a lookup target', async (url) => {
    const res = await request(app)
      .post('/api/extension/lookup')
      .set('X-API-Key', VALID_RAW_KEY)
      .send({ url });

    expect(res.status).toBe(400);
  });

  it('never exposes user-identifying fields in an unknown-listing response', async () => {
    mockPublicDns();
    const res = await request(app)
      .post('/api/extension/lookup')
      .set('X-API-Key', VALID_RAW_KEY)
      .send({ url: 'https://jobs.example.com/1' });

    const body = JSON.stringify(res.body).toLowerCase();
    for (const forbidden of ['username', 'email', 'password', 'uid', 'submittedby']) {
      expect(body).not.toContain(forbidden);
    }
    jest.restoreAllMocks();
  });
});
