/**
 * Resilience under abuse and load.
 *
 * Rate limiting is disabled for the rest of the suite (see
 * src/tests/setup/testEnv.ts) so that functional tests are not throttled.
 * These tests rebuild the application with it switched on, which is the only
 * way to prove the limiter is wired correctly rather than merely present.
 */

import request from 'supertest';
import type { Application } from 'express';
import { generateTestToken } from './helpers/testApp';

jest.mock('../config/cloudinary', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue('https://cdn.example.com/x.jpg'),
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
  },
}));

/**
 * Build the application with rate limiting active and a small ceiling, in a
 * fresh module registry so the limiter picks up the overridden environment
 * and starts with empty counters.
 */
function appWithRateLimit(max: number): Application {
  const saved = { ...process.env };
  jest.resetModules();
  process.env.RATE_LIMIT_ENABLED = 'true';
  process.env.RATE_LIMIT_GLOBAL_MAX = String(max);
  process.env.RATE_LIMIT_WINDOW_MS = '60000';

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../createApp').createApp();
  } finally {
    process.env = saved;
  }
}

/**
 * Build the application with rate limiting explicitly off.
 *
 * appWithRateLimit above calls jest.resetModules(), so a later
 * createFullApp() would re-read config/env at an unpredictable moment.
 * Setting the flag here rather than relying on restoration keeps each
 * describe independent of the order the others ran in.
 */
function appWithoutRateLimit(): Application {
  const saved = { ...process.env };
  jest.resetModules();
  process.env.RATE_LIMIT_ENABLED = 'false';

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../createApp').createApp();
  } finally {
    process.env = saved;
  }
}

describe('Rate limiting', () => {
  // The global limiter is mounted before routing, so an unmatched path is
  // the cheapest way to exercise it: the request is either throttled or
  // falls through to the 404 handler, and never touches the database.
  const CHEAP_PATH = '/api/no-such-route';

  it('starts refusing requests once the ceiling is reached', async () => {
    const app = appWithRateLimit(5);

    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      statuses.push((await request(app).get(CHEAP_PATH)).status);
    }

    expect(statuses.slice(0, 5).every((s) => s === 404)).toBe(true);
    expect(statuses.slice(5).every((s) => s === 429)).toBe(true);
  });

  it('answers a throttled request with a JSON body, not an HTML error page', async () => {
    const app = appWithRateLimit(2);

    let throttled;
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get(CHEAP_PATH);
      if (res.status === 429) {
        throttled = res;
        break;
      }
    }

    expect(throttled).toBeDefined();
    expect(throttled!.body.success).toBe(false);
    expect(throttled!.body.message).toMatch(/too many/i);
  });

  it('advertises the limit through standard RateLimit headers', async () => {
    const app = appWithRateLimit(10);
    const res = await request(app).get(CHEAP_PATH);

    // draft-7 exposes a RateLimit header; well-behaved clients back off on it.
    expect(Object.keys(res.headers).join(' ')).toMatch(/ratelimit/i);
  });

  it('never throttles the health probes', async () => {
    // Azure polls readiness continuously. If the limiter counted those, the
    // probe would start failing and App Service would cycle a healthy
    // instance.
    const app = appWithRateLimit(3);

    for (let i = 0; i < 12; i++) {
      expect((await request(app).get('/health')).status).toBe(200);
    }
  });

  it('keeps separate counters for two authenticated users on a per-user budget', async () => {
    // Route-level limiters sit after `authenticate`, so they can key on uid.
    // Exercised through a minimal app because the real routes would go on to
    // query the database.
    const saved = { ...process.env };
    jest.resetModules();
    process.env.RATE_LIMIT_ENABLED = 'true';

    try {
      /* eslint-disable @typescript-eslint/no-var-requires */
      const express = require('express');
      const { authenticate } = require('../middleware/auth');
      const { reportLimiter } = require('../middleware/rateLimiter');
      const { errorHandler } = require('../middleware/errorHandler');
      /* eslint-enable @typescript-eslint/no-var-requires */

      const app = express();
      app.use(express.json());
      app.post('/submit', authenticate, reportLimiter, (_req: any, res: any) =>
        res.json({ ok: true })
      );
      app.use(errorHandler);

      const alice = generateTestToken({ uid: 'uid-alice', username: 'alice' });
      const bob = generateTestToken({ uid: 'uid-bob', username: 'bob' });

      // reportLimiter allows 10 per hour per user; spend all of Alice's.
      for (let i = 0; i < 10; i++) {
        await request(app).post('/submit').set('Authorization', `Bearer ${alice}`);
      }

      const aliceBlocked = await request(app)
        .post('/submit')
        .set('Authorization', `Bearer ${alice}`);
      const bobAllowed = await request(app)
        .post('/submit')
        .set('Authorization', `Bearer ${bob}`);

      expect(aliceBlocked.status).toBe(429);
      expect(bobAllowed.status).toBe(200);
    } finally {
      process.env = saved;
    }
  });
});

describe('Concurrency', () => {
  let app: Application;

  beforeAll(() => {
    app = appWithoutRateLimit();
  });

  it('serves 100 simultaneous health probes without dropping any', async () => {
    const responses = await Promise.all(
      Array.from({ length: 100 }, () => request(app).get('/health'))
    );

    expect(responses).toHaveLength(100);
    expect(responses.every((r) => r.status === 200)).toBe(true);
  });

  it('gives every concurrent request a distinct correlation id', async () => {
    const responses = await Promise.all(
      Array.from({ length: 50 }, () => request(app).get('/health'))
    );

    const ids = new Set(responses.map((r) => r.headers['x-request-id']));
    expect(ids.size).toBe(50);
  });

  it('does not leak one request\'s authorization into another', async () => {
    // Interleave authenticated and anonymous calls; the anonymous ones must
    // all still be rejected.
    const token = generateTestToken();
    const calls = Array.from({ length: 40 }, (_unused, index) =>
      index % 2 === 0
        ? request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`)
        : request(app).get('/api/notifications')
    );

    const responses = await Promise.all(calls);
    responses.forEach((res, index) => {
      if (index % 2 === 1) expect(res.status).toBe(401);
    });
  });

  it('rejects 100 concurrent forged tokens without a single acceptance', async () => {
    const forged = generateTestToken({ secret: 'a-wrong-secret-that-is-32-characters-x' });

    const responses = await Promise.all(
      Array.from({ length: 100 }, () =>
        request(app).get('/api/notifications').set('Authorization', `Bearer ${forged}`)
      )
    );

    expect(responses.every((r) => r.status === 401)).toBe(true);
  });
});

describe('Upload limits', () => {
  let app: Application;

  beforeAll(() => {
    app = appWithoutRateLimit();
  });

  const token = () => generateTestToken();

  it('rejects a file over the 2mb cap with 413 rather than 500', async () => {
    // multer signals this with code LIMIT_FILE_SIZE, which the error handler
    // now maps; previously it surfaced as an opaque 500.
    const oversized = Buffer.alloc(3 * 1024 * 1024, 0x00);
    oversized.set([0xff, 0xd8, 0xff, 0xe0], 0); // JPEG magic bytes

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token()}`)
      .attach('file', oversized, { filename: 'big.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(413);
  });

  it('rejects a non-image mime type with 400', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token()}`)
      .attach('file', Buffer.from('#!/bin/sh\necho hi'), {
        filename: 'script.sh',
        contentType: 'application/x-sh',
      });

    expect(res.status).toBe(400);
  });

  it('rejects an unexpected form field name with 400', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token()}`)
      .attach('wrongField', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
        filename: 'x.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
  });

  it('requires authentication before accepting any bytes', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
        filename: 'x.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(401);
  });
});

describe('Database outage behaviour', () => {
  let app: Application;

  beforeAll(() => {
    app = appWithoutRateLimit();
  });

  it('keeps liveness green so Azure does not restart the container', async () => {
    // A database outage should pull the instance out of rotation, not
    // trigger a restart loop that makes recovery slower.
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('reports readiness as unhealthy so traffic is routed elsewhere', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.checks.database).not.toBe('connected');
  });
});
