import express, { Application } from 'express';
import jwt from 'jsonwebtoken';
import env from '../../config/env';
import { errorHandler } from '../../middleware/errorHandler';

// Routes
import jobsRouter from '../../routes/jobs';
import uploadRouter from '../../routes/upload';

export type Role = 'user' | 'admin' | 'moderator';

/**
 * Minimal Express app — body parsing, two routers, error handler.
 *
 * Kept for the unit-flavoured suites that only care about a controller's
 * behaviour. Anything asserting on security middleware should use
 * `createFullApp()` instead, which builds the real production stack.
 */
export function createTestApp(): Application {
  const app = express();

  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  app.use('/api/jobs', jobsRouter);
  app.use('/api/upload', uploadRouter);

  app.use(errorHandler);

  return app;
}

/**
 * The real application, assembled exactly as production assembles it.
 *
 * Required by any test that asserts on helmet headers, CORS behaviour, the
 * 404 handler, body-size limits, or health probes — none of which exist in
 * the minimal app above. Imported lazily so a suite that mocks models can
 * install its mocks before the route modules are pulled in.
 */
export function createFullApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../createApp');
  return createApp();
}

/**
 * Secrets come from config/env, which src/tests/setup/testEnv.ts seeds.
 * Reading them here rather than redeclaring the literals keeps signing and
 * verification from drifting apart.
 */
export const TEST_JWT_SECRET = env.JWT_SECRET;
export const TEST_REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export interface TokenOverrides {
  uid?: string;
  username?: string;
  role?: Role;
  /**
   * Defaults to true. The `requireVerified` middleware gates every write
   * endpoint on this claim, so a token without it produces a 403 long before
   * the request reaches validation — which is what silently broke the
   * evidence and vote suites when that middleware was introduced.
   */
  isEmailVerified?: boolean;
  expiresIn?: string;
  secret?: string;
}

/** Generate a valid ACCESS JWT for test requests. */
export function generateTestToken(overrides: TokenOverrides = {}): string {
  const {
    uid = 'test-user-uid-123',
    username = 'testuser',
    role = 'user',
    isEmailVerified = true,
    expiresIn = '1h',
    secret = TEST_JWT_SECRET,
  } = overrides;

  return jwt.sign(
    { uid, username, role, isEmailVerified, type: 'access' },
    secret,
    { expiresIn: expiresIn as any }
  );
}

/** Generate a REFRESH JWT (type: 'refresh'), signed with the refresh secret. */
export function generateRefreshToken(overrides: TokenOverrides = {}): string {
  const {
    uid = 'test-user-uid-123',
    username = 'testuser',
    role = 'user',
    isEmailVerified = true,
    expiresIn = '7d',
    secret = TEST_REFRESH_SECRET,
  } = overrides;

  return jwt.sign(
    { uid, username, role, isEmailVerified, type: 'refresh' },
    secret,
    { expiresIn: expiresIn as any }
  );
}

/** Convenience: an access token for an account that never confirmed its OTP. */
export function generateUnverifiedToken(overrides: TokenOverrides = {}): string {
  return generateTestToken({ ...overrides, isEmailVerified: false });
}

/** Authorization header tuple, for readability at call sites. */
export function bearer(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}

/** Magic byte buffers for testing */
export const testBuffers = {
  validJpeg: Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00,
  ]),
  validPng: Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  ]),
  validWebp: Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x00, 0x00, 0x00, 0x00, // size placeholder
    0x57, 0x45, 0x42, 0x50, // WEBP
    0x56, 0x50, 0x38, 0x20, // VP8
  ]),
  fakeJpeg: Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]),
  textFile: Buffer.from('This is a plain text file, not an image.', 'utf-8'),
  empty: Buffer.alloc(0),
  tinyBuffer: Buffer.from([0x00, 0x01]),
};
