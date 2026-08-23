/**
 * Transport and browser-facing security controls, asserted against the real
 * application built by createApp() rather than a stripped-down test app.
 *
 * These are exactly the controls that were previously untested: the old
 * helper mounted only body parsing and two routers, so helmet, CORS and the
 * 404 handler were never exercised by a single test.
 */

import request from 'supertest';
import type { Application } from 'express';
import { createFullApp } from './helpers/testApp';

jest.mock('../config/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
  resetCloudinaryConfig: jest.fn(),
}));

const ALLOWED_ORIGIN = 'https://workwyse.vercel.app';
const HOSTILE_ORIGIN = 'https://workwyse.vercel.app.evil.com';

describe('Security headers and CORS', () => {
  let app: Application;

  beforeAll(() => {
    app = createFullApp();
  });

  describe('Response headers', () => {
    it('does not advertise the server framework', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('sets HSTS so a browser refuses to downgrade to http', async () => {
      const res = await request(app).get('/health');
      const hsts = res.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=');

      // A max-age under a year is not accepted by preload lists and leaves a
      // long downgrade window.
      const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? 0);
      expect(maxAge).toBeGreaterThanOrEqual(31536000);
    });

    it('sends a restrictive CSP even though the API returns only JSON', async () => {
      const res = await request(app).get('/health');
      const csp = res.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('blocks MIME sniffing', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('marks every response no-store so a shared proxy cannot cache user data', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['cache-control']).toContain('no-store');
    });

    it('withholds the referrer from cross-origin navigations', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
    });

    it('returns a correlation id on every response', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-request-id']).toMatch(/^[\w-]+$/);
    });

    it('echoes a caller-supplied request id when it is well formed', async () => {
      const res = await request(app).get('/health').set('X-Request-Id', 'trace-abc-123');
      expect(res.headers['x-request-id']).toBe('trace-abc-123');
    });

    it('replaces a malformed caller-supplied request id rather than reflecting it', async () => {
      // Reflecting arbitrary input into a response header is a header
      // injection and log-forging vector.
      const res = await request(app).get('/health').set('X-Request-Id', 'bad value <script>');
      expect(res.headers['x-request-id']).not.toContain('<script>');
    });
  });

  describe('CORS', () => {
    it('allows a configured production origin with credentials', async () => {
      const res = await request(app).get('/health').set('Origin', ALLOWED_ORIGIN);
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('rejects an unlisted origin with 403 rather than a 500', async () => {
      const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');
      expect(res.status).toBe(403);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('rejects a suffix-extension of an allowed origin', async () => {
      // The classic bypass: an allowlist checked with endsWith/startsWith
      // lets "workwyse.vercel.app.evil.com" through.
      const res = await request(app).get('/health').set('Origin', HOSTILE_ORIGIN);
      expect(res.status).toBe(403);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('never reflects an arbitrary origin back', async () => {
      const res = await request(app).get('/health').set('Origin', 'https://attacker.test');
      expect(res.headers['access-control-allow-origin']).not.toBe('https://attacker.test');
    });

    it('never pairs a wildcard origin with credentials', async () => {
      const res = await request(app).get('/health').set('Origin', ALLOWED_ORIGIN);
      // "*" plus credentials is rejected by browsers and would mean the
      // allowlist had been bypassed.
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
    });

    it('answers a preflight for an allowed origin', async () => {
      const res = await request(app)
        .options('/api/jobs')
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'authorization,content-type');

      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    });

    it('allows requests that carry no Origin header at all', async () => {
      // Azure health probes and server-to-server callers send no Origin.
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });

  describe('Health probes', () => {
    it('liveness reports OK without touching the database', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.uptimeSeconds).toBe('number');
    });

    it('readiness reports 503 while the database is disconnected', async () => {
      // No connection is opened in tests, so readiness must fail closed.
      // This is what keeps Azure from routing traffic to an instance that
      // cannot serve it.
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('DEGRADED');
      expect(res.body.checks.database).toBe('disconnected');
    });

    it('health endpoints leak no build or environment detail', async () => {
      const res = await request(app).get('/health');
      const body = JSON.stringify(res.body).toLowerCase();
      for (const forbidden of ['mongodb://', 'mongodb+srv', 'secret', 'password', 'apikey', 'token']) {
        expect(body).not.toContain(forbidden);
      }
    });
  });

  describe('Unknown routes', () => {
    it('returns a generic 404 without echoing the requested path', async () => {
      const res = await request(app).get('/api/definitely-not-a-route');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, message: 'Route not found' });
    });

    it('does not reflect path content into the 404 body', async () => {
      const res = await request(app).get('/api/%3Cscript%3Ealert(1)%3C/script%3E');
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain('script');
    });
  });
});
