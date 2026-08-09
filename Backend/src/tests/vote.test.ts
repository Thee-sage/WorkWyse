import request from 'supertest';
import { createTestApp, generateTestToken } from './helpers/testApp';

// Mock env
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

// Mock Cloudinary (required by upload route in testApp)
jest.mock('../config/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
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

// ── Mock Vote & Job models ─────────────────────────────────────────

const mockVotes: Map<string, { _id: string; jobId: string; userId: string; voteType: 'upvote' | 'downvote' }> = new Map();
let mockJobData = {
  _id: '507f1f77bcf86cd799439011',
  upvotes: 0,
  downvotes: 0,
};

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'mock-user-object-id' }),
    }),
  },
}));

jest.mock('../models/Job', () => {
  const mockJob = {
    findById: jest.fn().mockImplementation((id: string) => {
      if (id === 'nonexistent-id') return { select: jest.fn().mockResolvedValue(null) };
      return {
        select: jest.fn().mockResolvedValue(mockJobData),
        then: (resolve: any) => resolve(mockJobData), // For non-chained calls
      };
    }),
    findByIdAndUpdate: jest.fn().mockImplementation((_id: string, update: any, opts: any) => {
      // Apply $inc updates
      if (update.$inc) {
        if (update.$inc.upvotes) mockJobData.upvotes += update.$inc.upvotes;
        if (update.$inc.downvotes) mockJobData.downvotes += update.$inc.downvotes;
        // Prevent negative
        if (mockJobData.upvotes < 0) mockJobData.upvotes = 0;
        if (mockJobData.downvotes < 0) mockJobData.downvotes = 0;
      }
      return {
        select: jest.fn().mockResolvedValue({ upvotes: mockJobData.upvotes, downvotes: mockJobData.downvotes }),
      };
    }),
  };

  // Make findById return a thenable that also has .populate() chaining
  // This mirrors JobService.vote() which calls: Job.findById(id).populate('submittedBy', 'uid')
  mockJob.findById = jest.fn().mockImplementation((id: string) => {
    if (id === 'nonexistent-id') {
      const pNull: any = Promise.resolve(null);
      pNull.populate = () => Promise.resolve(null);
      return pNull;
    }
    // The job data needs submittedBy.uid for the self-vote check in JobService.vote()
    // Use a uid that differs from the test token uid ('voter-1') to allow votes
    const jobWithSubmitter = { ...mockJobData, submittedBy: { uid: 'original-submitter-uid' } };
    const p: any = Promise.resolve(jobWithSubmitter);
    p.populate = jest.fn().mockResolvedValue(jobWithSubmitter);
    return p;
  });

  function JobConstructor(this: any, data: any) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  }

  const Vote = {
    findOne: jest.fn().mockImplementation((query: { jobId: string; userId: string }) => {
      const key = `${query.jobId}:${query.userId}`;
      return Promise.resolve(mockVotes.get(key) || null);
    }),
    findByIdAndDelete: jest.fn().mockImplementation((id: string) => {
      for (const [key, vote] of mockVotes.entries()) {
        if (vote._id === id) {
          mockVotes.delete(key);
          break;
        }
      }
      return Promise.resolve();
    }),
  };

  function VoteConstructor(this: any, data: any) {
    const voteId = `vote-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    Object.assign(this, { _id: voteId, ...data });
    this.save = jest.fn().mockImplementation(() => {
      const key = `${this.jobId}:${this.userId}`;
      mockVotes.set(key, { _id: this._id, jobId: this.jobId, userId: this.userId, voteType: this.voteType });
      return Promise.resolve(this);
    });
  }

  // Attach static methods to VoteConstructor
  VoteConstructor.findOne = Vote.findOne;
  VoteConstructor.findByIdAndDelete = Vote.findByIdAndDelete;

  return {
    __esModule: true,
    Job: Object.assign(JobConstructor, mockJob),
    Vote: VoteConstructor,
    Review: jest.fn(),
    IJob: {},
    IReview: {},
    IEvidence: {},
  };
});

describe('Vote System', () => {
  const app = createTestApp();
  const token = generateTestToken({ uid: 'voter-1', username: 'voter1' });
  const jobId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    mockVotes.clear();
    mockJobData = { _id: '507f1f77bcf86cd799439011', upvotes: 0, downvotes: 0 };
    jest.clearAllMocks();
  });

  describe('POST /api/jobs/:id/vote', () => {
    it('should cast an upvote and return updated counts', async () => {
      const res = await request(app)
        .post(`/api/jobs/${jobId}/vote`)
        .set('Authorization', `Bearer ${token}`)
        .send({ voteType: 'upvote' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userVote).toBe('upvote');
      expect(res.body.data.upvotes).toBeGreaterThanOrEqual(0);
    });

    it('should cast a downvote', async () => {
      const res = await request(app)
        .post(`/api/jobs/${jobId}/vote`)
        .set('Authorization', `Bearer ${token}`)
        .send({ voteType: 'downvote' });

      expect(res.status).toBe(200);
      expect(res.body.data.userVote).toBe('downvote');
    });

    it('should reject vote without authentication', async () => {
      const res = await request(app)
        .post(`/api/jobs/${jobId}/vote`)
        .send({ voteType: 'upvote' });

      expect(res.status).toBe(401);
    });

    it('should reject invalid voteType', async () => {
      const res = await request(app)
        .post(`/api/jobs/${jobId}/vote`)
        .set('Authorization', `Bearer ${token}`)
        .send({ voteType: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('should reject missing voteType', async () => {
      const res = await request(app)
        .post(`/api/jobs/${jobId}/vote`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/jobs/:id/vote', () => {
    it('should return null userVote when user has not voted', async () => {
      const res = await request(app)
        .get(`/api/jobs/${jobId}/vote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.userVote).toBeNull();
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .get(`/api/jobs/${jobId}/vote`);

      expect(res.status).toBe(401);
    });
  });

  describe('Zod validation', () => {
    it('should reject non-string voteType', async () => {
      const res = await request(app)
        .post(`/api/jobs/${jobId}/vote`)
        .set('Authorization', `Bearer ${token}`)
        .send({ voteType: 123 });

      expect(res.status).toBe(400);
    });
  });
});
