import request from 'supertest';
import { createTestApp, generateTestToken, testBuffers, TEST_JWT_SECRET } from './helpers/testApp';

// Mock env before importing anything that uses it
// Environment comes from src/tests/setup/testEnv.ts (jest setupFiles),
// so these suites run against the real config/env.ts.
// Mock Cloudinary
jest.mock('../config/cloudinary', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue('https://res.cloudinary.com/test/image/upload/v1/test.jpg'),
  resetCloudinaryConfig: jest.fn(),
}));

// Mock logger to suppress test output
jest.mock('../config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    http: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('POST /api/upload', () => {
  const app = createTestApp();
  const token = generateTestToken();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should upload a valid JPEG and return a URL', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', testBuffers.validJpeg, {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toContain('cloudinary.com');
  });

  it('should upload a valid PNG and return a URL', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', testBuffers.validPng, {
        filename: 'test.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toBeDefined();
  });

  it('should reject request without a file', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('No file');
  });

  it('should reject a file with invalid magic bytes', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', testBuffers.fakeJpeg, {
        filename: 'fake.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject request without authentication', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', testBuffers.validJpeg, {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(401);
  });

  it('should reject a suspicious filename', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', testBuffers.validJpeg, {
        filename: 'photo.jpg.exe',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('suspicious');
  });

  it('should reject non-image MIME type', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', testBuffers.textFile, {
        filename: 'readme.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
  });
});
