import express from 'express';
import { errorHandler } from '../../middleware/errorHandler';
import jwt from 'jsonwebtoken';

// Routes
import jobsRouter from '../../routes/jobs';
import uploadRouter from '../../routes/upload';

/**
 * Create a minimal Express app for testing without a real DB connection.
 * Mirrors the production middleware stack (JSON parsing, error handler).
 */
export function createTestApp() {
  const app = express();

  // Body parsing (match production config)
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Routes
  app.use('/api/jobs', jobsRouter);
  app.use('/api/upload', uploadRouter);

  // Error handler
  app.use(errorHandler);

  return app;
}

/** Test JWT secret — matches what tests inject into env */
export const TEST_JWT_SECRET = 'a-test-secret-that-is-at-least-32-characters-long';
export const TEST_REFRESH_SECRET = 'a-refresh-secret-that-is-at-least-32-characters-long!!';

/**
 * Generate a valid ACCESS JWT for test requests.
 * Includes type: 'access' so the authenticate middleware accepts it.
 */
export function generateTestToken(payload?: {
  uid?: string;
  username?: string;
  role?: 'user' | 'admin';
}): string {
  const defaultPayload = {
    uid: 'test-user-uid-123',
    username: 'testuser',
    role: 'user' as const,
    type: 'access' as const,
    ...payload,
  };

  return jwt.sign(defaultPayload, TEST_JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Generate a REFRESH JWT (type: 'refresh') for tests that verify
 * refresh tokens are rejected when used as access tokens.
 */
export function generateRefreshToken(payload?: {
  uid?: string;
  username?: string;
}): string {
  return jwt.sign(
    {
      uid: payload?.uid ?? 'test-user-uid-123',
      username: payload?.username ?? 'testuser',
      role: 'user',
      type: 'refresh',
    },
    TEST_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
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
