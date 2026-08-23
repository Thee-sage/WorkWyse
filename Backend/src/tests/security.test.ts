/**
 * Security regression tests — verify all audit findings are properly fixed.
 *
 * Tests:
 *  1. Refresh token used as access token → 401 (Finding 7.1)
 *  2. Edit own job → 200; edit another's job → 403 (Finding 1.3 / 11.1)
 *  3. Submit two reviews on the same job → 409 (Finding 9.1)
 *  4. Report a nonexistent job ID → 404 (Finding 2.2)
 *  5. Regex characters in company param → 200, no crash (Finding 12.2)
 *  6. Submit job with verificationStatus → field is stripped by Zod (Finding 1.1)
 *  7. Self-vote → 403 (Finding 9.2)
 *  8. Delete own job → 204; delete another's → 403 (Finding 1.3/11.1)
 */

import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { errorHandler } from '../middleware/errorHandler';

// ─── Env mock ────────────────────────────────────────────────────────
// Must be first before any module that imports env

// Signing secrets are read from the real config/env (seeded by
// src/tests/setup/testEnv.ts) so a token signed here always verifies
// against what the middleware uses.
import env from '../config/env';

const TEST_JWT_SECRET = env.JWT_SECRET;
const TEST_REFRESH_SECRET = env.JWT_REFRESH_SECRET;

// Environment comes from src/tests/setup/testEnv.ts (jest setupFiles),
// so these suites run against the real config/env.ts.
jest.mock('../config/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
  resetCloudinaryConfig: jest.fn(),
}));

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

// ─── Token helpers ────────────────────────────────────────────────────

function makeAccessToken(uid: string, username: string, role: 'user' | 'admin' = 'user') {
  // requireVerified gates every write route on this claim.
  return jwt.sign({ uid, username, role, isEmailVerified: true, type: 'access' }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

function makeRefreshToken(uid: string, username: string) {
  return jwt.sign({ uid, username, role: 'user', isEmailVerified: true, type: 'refresh' }, TEST_REFRESH_SECRET, { expiresIn: '7d' });
}

// ─── Shared test state ────────────────────────────────────────────────

const OWNER_UID = 'owner-uid-001';
const OTHER_UID = 'other-uid-002';
const JOB_ID = '507f1f77bcf86cd799439011'; // valid 24-hex ObjectId

// reviews array shared by the mock — reset between tests
let _mockReviews: any[] = [];
let _mockJobStore: Record<string, any> = {};

const getMockJob = (id: string) => _mockJobStore[id] ?? null;

function buildPopulatedJob(id: string) {
  const job = getMockJob(id);
  if (!job) return null;
  return { ...job, submittedBy: { uid: OWNER_UID }, reviews: _mockReviews };
}

// ─── Model mocks ──────────────────────────────────────────────────────

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockImplementation(({ uid }: { uid: string }) => {
      const result = { _id: `obj-${uid}`, uid };
      const p: any = Promise.resolve(result);
      p.select = jest.fn().mockResolvedValue(result);
      return p;
    }),
  },
}));

jest.mock('../models/Company', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../models/Report', () => {
  const ReportCtor = function (this: any, data: any) {
    Object.assign(this, data, { _id: 'report-id-1', status: 'pending' });
  } as any;
  ReportCtor.create = jest.fn().mockImplementation((data: any) =>
    Promise.resolve({ ...data, _id: 'new-report-id' })
  );
  ReportCtor.findOne = jest.fn().mockResolvedValue(null);
  return { __esModule: true, default: ReportCtor };
});

jest.mock('../models/Job', () => {
  /**
   * Build a job result that supports both:
   *   await Job.findById(id)
   *   await Job.findById(id).populate(...)
   * by returning a thenable Promise with a .populate() method.
   */
  function findByIdResult(id: string) {
    const job = buildPopulatedJob(id);
    if (!job) {
      const pNull: any = Promise.resolve(null);
      pNull.populate = () => Promise.resolve(null);
      return pNull;
    }
    // Avoid circular self-reference (TS2022) by assigning mocks after object creation
    const result: any = { ...job };
    result.save = jest.fn().mockImplementation(() => Promise.resolve(result));
    result.populate = jest.fn().mockImplementation(() => Promise.resolve(result));
    const p: any = Promise.resolve(result);
    p.populate = jest.fn().mockImplementation(() => Promise.resolve(result));
    return p;
  }

  const JobCtor = function (this: any, data: any) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  } as any;

  JobCtor.findById = jest.fn().mockImplementation((id: string) => findByIdResult(id));

  JobCtor.findByIdAndUpdate = jest.fn().mockImplementation((id: string, update: any) => {
    const job = getMockJob(id);
    if (!job) return (() => { const p: any = Promise.resolve(null); p.select = () => Promise.resolve(null); return p; })();
    // Apply $inc updates to track vote counts
    const newJob = { ...job };
    if (update.$inc) {
      Object.keys(update.$inc).forEach(k => { newJob[k] = (newJob[k] ?? 0) + update.$inc[k]; });
    }
    _mockJobStore[id] = newJob;
    const p: any = Promise.resolve(newJob);
    p.select = jest.fn().mockResolvedValue({ upvotes: newJob.upvotes ?? 0, downvotes: newJob.downvotes ?? 0 });
    return p;
  });

  JobCtor.findByIdAndDelete = jest.fn().mockImplementation((id: string) => {
    delete _mockJobStore[id];
    return Promise.resolve({ _id: id });
  });

  JobCtor.find = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    populate: jest.fn().mockReturnThis(),
  });

  JobCtor.countDocuments = jest.fn().mockResolvedValue(0);

  const VoteCtor = function (this: any, data: any) {
    Object.assign(this, data, { _id: `vote-${Date.now()}` });
    this.save = jest.fn().mockResolvedValue(this);
  } as any;
  VoteCtor.findOne = jest.fn().mockResolvedValue(null);
  VoteCtor.findByIdAndDelete = jest.fn().mockResolvedValue(null);
  VoteCtor.deleteMany = jest.fn().mockResolvedValue({});

  const ReviewCtor = jest.fn().mockImplementation(function (this: any, data: any) {
    Object.assign(this, data, { _id: `review-${Date.now()}` });
  });

  return {
    __esModule: true,
    Job: JobCtor,
    Vote: VoteCtor,
    Review: ReviewCtor,
    IJob: {},
    IReview: {},
    IEvidence: {},
  };
});

// ─── App setup ────────────────────────────────────────────────────────

import jobsRouter from '../routes/jobs';
import reportsRouter from '../routes/reports';

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use('/api/jobs', jobsRouter);
  app.use('/api/reports', reportsRouter);
  app.use(errorHandler);
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('Security Regression Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    _mockReviews = [];
    _mockJobStore = {
      [JOB_ID]: {
        _id: JOB_ID,
        title: 'Test Job',
        company: 'TestCorp',
        location: 'NYC',
        jobUrl: 'https://example.com/job',
        description: 'Test description',
        isFake: false,
        upvotes: 0,
        downvotes: 0,
        verificationStatus: 'none',
        verificationConfidence: null,
        verificationSource: null,
        submittedBy: { uid: OWNER_UID },
        reviews: [],
      },
    };

    // Re-mock findById to use the updated store after reset.
    // Must support all chaining patterns used by the services:
    //   - Job.findById(id).populate(...)          (JobService)
    //   - Job.findById(id).select(...).populate(...) (ReportService)
    const { Job, Vote } = require('../models/Job');
    Job.findById.mockImplementation((id: string) => {
      const job = getMockJob(id);

      if (!job) {
        // Null thenable supporting both .populate() and .select().populate()
        const nullSelectChain: any = {
          populate: jest.fn().mockResolvedValue(null),
        };
        const pNull: any = Promise.resolve(null);
        pNull.populate = jest.fn().mockResolvedValue(null);
        pNull.select = jest.fn().mockReturnValue(nullSelectChain);
        return pNull;
      }

      const result: any = {
        ...job,
        submittedBy: { uid: OWNER_UID },
        reviews: _mockReviews,
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };
      const selectChain: any = {
        populate: jest.fn().mockResolvedValue(result),
      };
      result.populate = jest.fn().mockResolvedValue(result);
      const p: any = Promise.resolve(result);
      p.populate = jest.fn().mockResolvedValue(result);
      p.select = jest.fn().mockReturnValue(selectChain);
      return p;
    });
    Vote.findOne.mockResolvedValue(null);
    Vote.findByIdAndDelete.mockResolvedValue(null);
    Vote.deleteMany.mockResolvedValue({});
  });

  // ─── Test 1: Refresh token cannot be used as access token ──────────

  describe('Finding 7.1 — Refresh token rejected as bearer token', () => {
    it('should return 401 when a refresh token is used as a bearer access token', async () => {
      const refreshToken = makeRefreshToken(OWNER_UID, 'owner');

      // Use a protected route (vote requires authentication) so the middleware
      // actually runs the token type check (type !== 'access' → 401)
      const res = await request(app)
        .post(`/api/jobs/${JOB_ID}/vote`)
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ voteType: 'upvote' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should NOT reject a valid access token', async () => {
      const accessToken = makeAccessToken(OWNER_UID, 'owner');

      const res = await request(app)
        .get(`/api/jobs/${JOB_ID}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).not.toBe(401);
    });
  });

  // ─── Test 2: Edit ownership check ────────────────────────────────

  describe('Finding 1.3/11.1 — Job edit ownership check', () => {
    it('should return 403 when editing another user job', async () => {
      const otherToken = makeAccessToken(OTHER_UID, 'other');

      const res = await request(app)
        .put(`/api/jobs/${JOB_ID}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 when editing own job', async () => {
      const ownerToken = makeAccessToken(OWNER_UID, 'owner');

      const res = await request(app)
        .put(`/api/jobs/${JOB_ID}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 200 when admin edits any job', async () => {
      const adminToken = makeAccessToken('admin-uid', 'admin', 'admin');

      const res = await request(app)
        .put(`/api/jobs/${JOB_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Updated' });

      expect(res.status).toBe(200);
    });
  });

  // ─── Test 3: Duplicate review prevention ─────────────────────────

  describe('Finding 9.1 — Duplicate review prevention', () => {
    it('should return 409 on second review from the same user', async () => {
      const userToken = makeAccessToken(OTHER_UID, 'reviewer');

      // First review — should succeed
      const first = await request(app)
        .post(`/api/jobs/${JOB_ID}/reviews`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 4, comment: 'Good job listing' });

      expect(first.status).toBe(201);

      // Second review — same user, same job → must be rejected
      const second = await request(app)
        .post(`/api/jobs/${JOB_ID}/reviews`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 2, comment: 'Actually it was bad' });

      expect(second.status).toBe(409);
      expect(second.body.success).toBe(false);
    });
  });

  // ─── Test 4: Report nonexistent job ──────────────────────────────

  describe('Finding 2.2 — Report nonexistent targetId', () => {
    it('should return 404 when reporting a job that does not exist', async () => {
      const userToken = makeAccessToken(OTHER_UID, 'reporter');
      const nonexistentId = '000000000000000000000000';

      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'job', targetId: nonexistentId, reason: 'This job is fake' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for malformed (non-ObjectId) targetId', async () => {
      const userToken = makeAccessToken(OTHER_UID, 'reporter');

      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ targetType: 'job', targetId: 'not-a-valid-objectid', reason: 'Test' });

      expect(res.status).toBe(400);
    });
  });

  // ─── Test 5: Regex injection in company param ────────────────────

  describe('Finding 12.2 — Regex injection in getJobsByCompany', () => {
    const regexAttacks = [
      '(((((((((a+)+)+)+)+)+)+)+)+)',
      '.*',
      '[a-z]+',
      'a{1,99999}',
      'corp(.*)',
      'test\\company',
    ];

    regexAttacks.forEach((input) => {
      it(`should handle regex input without hanging: "${input.slice(0, 30)}"`, async () => {
        const encoded = encodeURIComponent(input);
        const start = Date.now();

        const res = await request(app).get(`/api/jobs/company/${encoded}`);

        const elapsed = Date.now() - start;

        expect(res.status).toBe(200);
        // ReDoS would cause the server to hang for seconds; this must complete fast
        expect(elapsed).toBeLessThan(2000);
      });
    });
  });

  // ─── Test 6: verificationStatus in createJob body is stripped ────

  describe('Finding 1.1 — verificationStatus stripped on job creation', () => {
    it('should not fail with 400 when client sends verificationStatus (Zod strips it)', async () => {
      const ownerToken = makeAccessToken(OWNER_UID, 'owner');

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Fake but verified',
          company: 'BadCorp',
          location: 'NYC',
          jobUrl: 'https://example.com/job2',
          description: 'Trying to set verification',
          isFake: true,
          // Zod strips these — they are not in createJobSchema
          verificationStatus: 'verified',
          verificationConfidence: 'high',
          verificationSource: 'linkedin',
        });

      // Zod strips unknown fields silently (no 400)
      expect(res.status).not.toBe(400);

      // If creation succeeded, server must have set verificationStatus to 'none'
      if (res.status === 201 && res.body.data) {
        expect(res.body.data.verificationStatus).toBe('none');
      }
    });
  });

  // ─── Test 7: Self-vote prevention ────────────────────────────────

  describe('Finding 9.2 — Self-vote prevention', () => {
    it('should return 403 when user votes on their own job', async () => {
      // OWNER_UID is the submitter of JOB_ID
      const ownerToken = makeAccessToken(OWNER_UID, 'owner');

      const res = await request(app)
        .post(`/api/jobs/${JOB_ID}/vote`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ voteType: 'upvote' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow a different user to vote', async () => {
      const otherToken = makeAccessToken(OTHER_UID, 'other');

      const res = await request(app)
        .post(`/api/jobs/${JOB_ID}/vote`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ voteType: 'upvote' });

      expect(res.status).toBe(200);
    });
  });

  // ─── Test 8: Delete ownership check ──────────────────────────────

  describe('Finding 1.3/11.1 — Job delete ownership check', () => {
    it('should return 403 when deleting another user job', async () => {
      const otherToken = makeAccessToken(OTHER_UID, 'other');

      const res = await request(app)
        .delete(`/api/jobs/${JOB_ID}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 204 when owner deletes their own job', async () => {
      const ownerToken = makeAccessToken(OWNER_UID, 'owner');

      const res = await request(app)
        .delete(`/api/jobs/${JOB_ID}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(204);
    });
  });
});
