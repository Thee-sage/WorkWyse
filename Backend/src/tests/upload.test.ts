import request from 'supertest';
import { createTestApp, generateTestToken, testBuffers, TEST_JWT_SECRET } from './helpers/testApp';

// Mock env before importing anything that uses it
jest.mock('../config/env', () => ({
  __esModule: true,
  default: {
    NODE_ENV: 'test',
    PORT: 5000,
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'a-test-secret-that-is-at-least-32-characters-long',
    JWT_REFRESH_SECRET: 'a-refresh-secret-that-is-at-least-32-characters-long!!',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    GMAIL_USER: 'test@test.com',
    GMAIL_APP_PASSWORD: 'test',
    CORS_ORIGIN: 'http://localhost:3000',
    LINKEDIN_CLIENT_ID: 'test',
    LINKEDIN_CLIENT_SECRET: 'test',
    LINKEDIN_REDIRECT_URI: 'http://localhost:3000/auth/linkedin/callback',
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
  },
}));

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
