import request from 'supertest';
import { createTestApp, generateTestToken } from './helpers/testApp';

// Mock env
// Environment comes from src/tests/setup/testEnv.ts (jest setupFiles),
// so these suites run against the real config/env.ts.
// Mock Cloudinary
jest.mock('../config/cloudinary', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue('https://res.cloudinary.com/test/image/upload/v1/test.jpg'),
  resetCloudinaryConfig: jest.fn(),
}));

// Mock logger
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

// Mock the User model (needed by JobService.createJob)
jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'mock-user-object-id' }),
    }),
  },
}));

// Mock the Job model
const mockJobSave = jest.fn();
jest.mock('../models/Job', () => {
  const evidenceInput: any[] = [];
  const mockJobInstance = {
    _id: 'mock-job-id',
    title: '',
    company: '',
    location: '',
    jobUrl: '',
    description: '',
    isFake: false,
    upvotes: 0,
    downvotes: 0,
    evidence: evidenceInput,
    hasEvidence: false,
    reviews: [],
    save: jest.fn().mockImplementation(function (this: any) {
      this.hasEvidence = this.evidence && this.evidence.length > 0;
      return Promise.resolve(this);
    }),
  };

  function JobConstructor(this: any, data: any) {
    Object.assign(this, mockJobInstance, data);
    this.save = jest.fn().mockImplementation(() => {
      this.hasEvidence = this.evidence && this.evidence.length > 0;
      return Promise.resolve(this);
    });
  }

  return {
    __esModule: true,
    Job: JobConstructor,
    Review: jest.fn(),
    Vote: jest.fn(),
    IJob: {},
    IReview: {},
    IEvidence: {},
  };
});

describe('POST /api/jobs — evidence validation', () => {
  const app = createTestApp();
  const token = generateTestToken();

  const validJobData = {
    title: 'Software Engineer',
    company: 'TechCorp',
    location: 'Remote',
    jobUrl: 'https://jobs.example.com/1234',
    description: 'A test job description that is long enough to pass validation.',
    isFake: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a job with valid evidence array', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validJobData,
        evidence: [
          { type: 'image', value: 'https://res.cloudinary.com/test/photo.jpg' },
          { type: 'url', value: 'https://linkedin.com/jobs/1234' },
          { type: 'text', value: 'I applied on Jan 15 and never heard back.' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should create a job with empty evidence (evidence is optional)', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send(validJobData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject job with more than 5 evidence items', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validJobData,
        evidence: [
          { type: 'text', value: 'note 1' },
          { type: 'text', value: 'note 2' },
          { type: 'text', value: 'note 3' },
          { type: 'text', value: 'note 4' },
          { type: 'text', value: 'note 5' },
          { type: 'text', value: 'note 6' }, // too many
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject evidence with invalid type', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validJobData,
        evidence: [
          { type: 'video', value: 'https://youtube.com/watch?v=123' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject image evidence with non-URL value', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validJobData,
        evidence: [
          { type: 'image', value: 'not-a-url' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject URL evidence with non-URL value', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validJobData,
        evidence: [
          { type: 'url', value: 'just some text' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject text evidence with empty value', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validJobData,
        evidence: [
          { type: 'text', value: '' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
