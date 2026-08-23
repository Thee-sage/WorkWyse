/**
 * Injection and malformed-input resistance.
 *
 * Covers the input-shaped attacks that reach this stack: NoSQL operator
 * injection through JSON bodies and query strings, prototype pollution,
 * HTTP parameter pollution, regular-expression denial of service, and
 * oversized or malformed payloads.
 *
 * The Mongoose models are mocked so that requests which pass validation
 * still resolve immediately. Without that, any route reaching the data layer
 * sits until Mongoose's buffering timeout and reports a 500, which would
 * mask the status codes these tests exist to pin.
 */

import request from 'supertest';
import type { Application } from 'express';
import { createFullApp, generateTestToken } from './helpers/testApp';
import { escapeRegex } from '../services/JobService';

jest.mock('../config/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
  resetCloudinaryConfig: jest.fn(),
}));

jest.mock('../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn(), debug: jest.fn() },
}));

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockResolvedValue(null),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    }),
  },
}));

jest.mock('../models/OTP', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockResolvedValue(null),
    deleteMany: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
  },
}));

describe('escapeRegex — regular-expression denial of service', () => {
  /**
   * Every user-supplied value that becomes part of a RegExp passes through
   * escapeRegex first. These cases confirm the escaping holds for inputs
   * that would otherwise either pin a CPU core or change the query's meaning.
   */
  const pathological = [
    'a'.repeat(5000),
    '('.repeat(2000),
    '(a+)+$',
    '(([a-z])+.)+[A-Z]([a-z])+$',
    '.*.*.*.*.*.*.*.*.*.*.*.*.*!',
    '['.repeat(1000),
    '\\'.repeat(500),
    '(a|a)*'.repeat(100),
    '^(a+)+$',
  ];

  it.each(pathological)('escapes case %# into a literal pattern that matches promptly', (input) => {
    const pattern = new RegExp(escapeRegex(input), 'i');

    // A catastrophically backtracking pattern would hang here rather than
    // returning; the timing assertion is what actually detects that.
    const started = Date.now();
    pattern.test('a'.repeat(5000) + 'X');
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(500);
  });

  it('produces a pattern that matches the literal input and nothing more', () => {
    // If the metacharacters were not escaped, this pattern would match any
    // string of a's rather than only the literal text.
    const pattern = new RegExp(escapeRegex('(a+)+'), 'i');

    expect(pattern.test('(a+)+')).toBe(true);
    expect(pattern.test('aaaaaa')).toBe(false);
  });

  it('neutralises a wildcard so a filter cannot match every record', () => {
    const pattern = new RegExp(escapeRegex('.*'), 'i');

    expect(pattern.test('.*')).toBe(true);
    expect(pattern.test('anything else')).toBe(false);
  });

  it('escapes every regex metacharacter', () => {
    for (const char of ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\']) {
      const pattern = new RegExp(escapeRegex(char));
      expect(pattern.test(char)).toBe(true);
    }
  });
});

describe('NoSQL operator injection', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  /**
   * Mongo treats an object like { $ne: null } as an operator, so a query
   * built from unvalidated input matches any document. Zod string schemas
   * are what stop this, and these cases pin that behaviour.
   */
  const operatorPayloads = [
    { $ne: null },
    { $gt: '' },
    { $regex: '.*' },
    { $where: 'return true' },
    { $exists: true },
  ];

  it.each(operatorPayloads)('rejects %j as a login identifier', async (payload) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: payload, password: 'anything' });

    expect(res.status).toBe(400);
  });

  it.each(operatorPayloads)('rejects %j as a login password', async (payload) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'alice', password: payload });

    expect(res.status).toBe(400);
  });

  it('rejects an operator object in the registration email field', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'attacker',
        email: { $ne: null },
        password: 'ValidPass123',
      });

    expect(res.status).toBe(400);
  });

  it('rejects an array smuggled in where a string is expected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: ['alice', 'bob'], password: 'anything' });

    expect(res.status).toBe(400);
  });

  it('rejects an operator object in the password-reset email field', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: { $gt: '' } });

    expect(res.status).toBe(400);
  });

  it('treats an operator-looking string as a plain string, not an operator', async () => {
    // A literal string can never become an operator, so this must not fail
    // validation — it should simply match no account.
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: '{"$ne":null}', password: 'anything' });

    expect(res.status).toBe(401);
  });
});

describe('Prototype pollution', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  afterEach(() => {
    // Undo any successful pollution so one failure cannot cascade.
    delete (Object.prototype as Record<string, unknown>).polluted;
    delete (Object.prototype as Record<string, unknown>).isAdmin;
  });

  it('does not let __proto__ in a JSON body reach Object.prototype', async () => {
    await request(app)
      .post('/api/auth/login')
      .send(JSON.parse('{"identifier":"a","password":"b","__proto__":{"polluted":"yes"}}'));

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('does not let constructor.prototype in a body pollute globals', async () => {
    await request(app)
      .post('/api/auth/login')
      .send(
        JSON.parse('{"identifier":"a","password":"b","constructor":{"prototype":{"isAdmin":true}}}')
      );

    expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
  });

  it('does not let __proto__ in a query string pollute globals', async () => {
    await request(app).get('/api/jobs?__proto__[polluted]=yes');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('HTTP parameter pollution', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  it('collapses a repeated query parameter to a single value', async () => {
    // Without hpp, req.query.page becomes an array and any Number(...) or
    // string method downstream behaves unpredictably.
    const res = await request(app).get('/api/jobs?page=1&page=2&page=3');
    expect(res.status).not.toBe(500);
  });

  it('survives a repeated parameter on a validated route', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .query({ identifier: ['a', 'b'] })
      .send({ identifier: 'alice', password: 'pass' });

    expect(res.status).not.toBe(500);
  });
});

describe('Malformed and oversized payloads', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  it('rejects a body over the 10kb limit with 413 rather than 500', async () => {
    // body-parser raises a PayloadTooLargeError carrying its own status.
    // The error handler has to read that, or a client mistake is reported
    // as a server fault and looks retryable when it is not.
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ identifier: 'a'.repeat(20000), password: 'b' }));

    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
  });

  it('accepts a larger body on the CSV import route', async () => {
    // The import endpoint carries a spreadsheet in a JSON field and is
    // mounted with a 1mb limit, so it must not hit the global 10kb cap.
    const res = await request(app)
      .post('/api/export/jobs/import')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ csv: 'x'.repeat(50_000) }));

    // Unauthenticated, so 401 — the point is that it is not 413.
    expect(res.status).not.toBe(413);
  });

  it('rejects syntactically invalid JSON with 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"identifier": "alice", ');

    expect(res.status).toBe(400);
  });

  it('does not leak a parser stack trace on invalid JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ broken');

    expect(JSON.stringify(res.body)).not.toMatch(/node_modules|\.ts:\d+/);
  });

  it('handles a deeply nested object without exhausting the stack', async () => {
    let nested: Record<string, unknown> = { end: true };
    for (let depth = 0; depth < 800; depth++) nested = { nested };

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'alice', password: 'pass', extra: nested });

    // The extra key is stripped by Zod; the request then fails on
    // credentials rather than crashing the parser.
    expect(res.status).toBeLessThan(500);
  });

  it('rejects a space inside a username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'alice admin',
        email: 'alice@example.com',
        password: 'ValidPass123',
      });

    expect(res.status).toBe(400);
  });

  it('rejects a unicode direction-override character in a username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'alice‮gnp.exe',
        email: 'alice@example.com',
        password: 'ValidPass123',
      });

    expect(res.status).toBe(400);
  });

  it('rejects an unsupported content type on a JSON route', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/xml')
      .send('<login><identifier>alice</identifier></login>');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe('Password policy', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  it.each([
    ['too short', 'Ab1'],
    ['no uppercase', 'lowercase123'],
    ['no lowercase', 'UPPERCASE123'],
    ['no digit', 'NoDigitsHere'],
    ['over the length cap', 'A1' + 'a'.repeat(200)],
  ])('rejects a password that is %s', async (_label, password) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser', email: 'new@example.com', password });

    expect(res.status).toBe(400);
  });
});

describe('Mass assignment', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  it('does not honour a role field supplied at registration', async () => {
    // Zod strips unknown keys, so the account can only ever be created as a
    // plain user. What must never happen is a successful registration that
    // honours the supplied role.
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'escalate',
        email: 'escalate@example.com',
        password: 'ValidPass123',
        role: 'admin',
        isEmailVerified: true,
      });

    expect(res.status).not.toBe(201);
  });

  it('does not reject a job submission merely for carrying server-owned fields', async () => {
    // Finding 1.1: verificationStatus and friends are stripped rather than
    // rejected, so a client sending them gets a normal response and the
    // values are ignored.
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${generateTestToken()}`)
      .send({
        title: 'Engineer',
        company: 'Acme',
        location: 'Remote',
        jobUrl: 'https://jobs.example.com/1',
        description: 'A description long enough to satisfy the schema validation rules.',
        isFake: false,
        verificationStatus: 'verified',
        trustScore: 100,
      });

    expect(res.status).not.toBe(400);
  });
});
