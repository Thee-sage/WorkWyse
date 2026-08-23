import { Job, Review, Vote, IJob, IReview, IEvidence, IUrlCheck } from '../models/Job';
import User from '../models/User';
import Report from '../models/Report';
import { ApiError } from '../utils/ApiError';
import { assertUrlIsFetchable, SsrfBlockedError } from '../utils/urlGuard';
import logger from '../config/logger';
import ActivityLogService from './ActivityLogService';
import NotificationService from './NotificationService';
import TrustService from './TrustService';

interface PaginationParams {
  page: number;
  limit: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Escape special regex metacharacters in user input.
 * Prevents ReDoS attacks (Finding 12.2).
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Redact submittedBy info for users with private accounts (Finding 8.1).
 * Mutates the populated submittedBy field in-place.
 */
async function redactPrivateSubmitters(jobs: IJob[]): Promise<void> {
  for (const job of jobs) {
    if (job.submittedBy && typeof job.submittedBy === 'object') {
      const submitter = job.submittedBy as any;
      if (submitter.uid) {
        const user = await User.findOne({ uid: submitter.uid }).select('type');
        if (user?.type === 'private') {
          submitter.username = 'Anonymous';
          submitter.uid = undefined;
        }
      }
    }
  }
}

class JobService {
  /**
   * Get all jobs with pagination
   */
  static async getAllJobs({ page, limit }: PaginationParams): Promise<PaginatedResult<IJob>> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Job.find()
        .select('-__v')
        .populate('submittedBy', 'uid username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(),
    ]);
    // Finding 8.1 — redact private submitters
    await redactPrivateSubmitters(data);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get single job by ID
   */
  static async getJobById(id: string): Promise<IJob> {
    const job = await Job.findById(id).select('-__v').populate('submittedBy', 'uid username');
    if (!job) throw ApiError.notFound('Job not found');
    await redactPrivateSubmitters([job]);
    return job;
  }

  /**
   * Create a new job listing.
   * Finding 10.2 — explicit field picking (no spread from request body).
   * Finding 1.1 — verification fields are always server-set defaults.
   */
  static async createJob(
    jobData: {
      title: string;
      company: string;
      location: string;
      jobUrl: string;
      description: string;
      jobDescription?: string;
      isFake: boolean;
      evidence?: IEvidence[];
    },
    submittedByUid?: string
  ): Promise<IJob> {
    let submittedBy;
    if (submittedByUid) {
      const user = await User.findOne({ uid: submittedByUid }).select('_id');
      if (user) submittedBy = user._id;
    }

    const evidence = jobData.evidence ?? [];

    // Explicit field picking — only allow fields the client should set
    const job = new Job({
      title: jobData.title,
      company: jobData.company,
      location: jobData.location,
      jobUrl: jobData.jobUrl,
      description: jobData.description,
      jobDescription: jobData.jobDescription || '',
      isFake: jobData.isFake,
      evidence,
      submittedBy,
      // Server-controlled fields — always use defaults
      verificationStatus: 'none',
      verificationConfidence: null,
      verificationSource: null,
      upvotes: 0,
      downvotes: 0,
    });

    const saved = await job.save();

    logger.info('Job created', {
      jobId: saved._id,
      userId: submittedByUid,
      evidenceCount: evidence.length,
      hasEvidence: saved.hasEvidence,
    });

    if (submittedByUid) {
      await ActivityLogService.log(submittedByUid, 'job_created', 'job', (saved._id as any).toString());
    }

    return saved;
  }

  /**
   * Update a job report (Finding 1.3 / 11.1 — owner or admin only).
   */
  static async updateJob(
    jobId: string,
    updates: {
      title?: string;
      company?: string;
      location?: string;
      description?: string;
      jobDescription?: string;
      isFake?: boolean;
    },
    requestingUid: string,
    requestingRole: string
  ): Promise<IJob> {
    const job = await Job.findById(jobId).populate('submittedBy', 'uid');
    if (!job) throw ApiError.notFound('Job not found');

    // Ownership check: must be submitter or admin
    const submitterUid = (job.submittedBy as any)?.uid;
    if (requestingRole !== 'admin' && submitterUid !== requestingUid) {
      throw ApiError.forbidden('You can only edit your own job reports');
    }

    // Explicit field picking — only allow safe updates
    if (updates.title !== undefined) job.title = updates.title;
    if (updates.company !== undefined) job.company = updates.company;
    if (updates.location !== undefined) job.location = updates.location;
    if (updates.description !== undefined) job.description = updates.description;
    if (updates.jobDescription !== undefined) job.jobDescription = updates.jobDescription;
    if (updates.isFake !== undefined) job.isFake = updates.isFake;

    const saved = await job.save();
    logger.info('Job updated', { jobId, userId: requestingUid });
    await ActivityLogService.log(requestingUid, 'job_updated', 'job', jobId);
    return saved;
  }

  /**
   * Delete a job report (Finding 1.3 / 11.1 — owner or admin only).
   */
  static async deleteJob(
    jobId: string,
    requestingUid: string,
    requestingRole: string
  ): Promise<void> {
    const job = await Job.findById(jobId).populate('submittedBy', 'uid');
    if (!job) throw ApiError.notFound('Job not found');

    const submitterUid = (job.submittedBy as any)?.uid;
    if (requestingRole !== 'admin' && submitterUid !== requestingUid) {
      throw ApiError.forbidden('You can only delete your own job reports');
    }

    // Also clean up associated votes
    await Vote.deleteMany({ jobId });
    await Job.findByIdAndDelete(jobId);
    logger.info('Job deleted', { jobId, userId: requestingUid });
    await ActivityLogService.log(requestingUid, 'job_deleted', 'job', jobId);
  }

  /**
   * Vote on a job (upvote/downvote).
   * Finding 9.2 — prevents self-voting on own submission.
   */
  static async vote(jobId: string, userId: string, voteType: 'upvote' | 'downvote') {
    const job = await Job.findById(jobId).populate('submittedBy', 'uid');
    if (!job) throw ApiError.notFound('Job not found');

    // Finding 9.2 — prevent self-voting
    const submitterUid = (job.submittedBy as any)?.uid;
    if (submitterUid === userId) {
      throw ApiError.forbidden('You cannot vote on your own job report');
    }

    const existingVote = await Vote.findOne({ jobId, userId });

    // Toggle off: clicking the same vote type removes it
    if (existingVote && existingVote.voteType === voteType) {
      const removeField = voteType === 'upvote' ? 'upvotes' : 'downvotes';
      await Vote.findByIdAndDelete(existingVote._id);
      const updatedJob = await Job.findByIdAndUpdate(
        jobId,
        { $inc: { [removeField]: -1 } },
        { new: true }
      ).select('upvotes downvotes');

      logger.info('Vote removed (toggle off)', { jobId, userId, previousVote: voteType });

      return {
        upvotes: updatedJob?.upvotes ?? 0,
        downvotes: updatedJob?.downvotes ?? 0,
        userVote: null,
      };
    }

    // Switch vote: remove old, add new
    if (existingVote) {
      const removeField = existingVote.voteType === 'upvote' ? 'upvotes' : 'downvotes';
      const addField = voteType === 'upvote' ? 'upvotes' : 'downvotes';

      await Vote.findByIdAndDelete(existingVote._id);
      await new Vote({ jobId, userId, voteType }).save();

      const updatedJob = await Job.findByIdAndUpdate(
        jobId,
        { $inc: { [removeField]: -1, [addField]: 1 } },
        { new: true }
      ).select('upvotes downvotes');

      logger.info('Vote switched', { jobId, userId, from: existingVote.voteType, to: voteType });

      return {
        upvotes: updatedJob?.upvotes ?? 0,
        downvotes: updatedJob?.downvotes ?? 0,
        userVote: voteType,
      };
    }

    // New vote
    await new Vote({ jobId, userId, voteType }).save();
    const addField = voteType === 'upvote' ? 'upvotes' : 'downvotes';
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { $inc: { [addField]: 1 } },
      { new: true }
    ).select('upvotes downvotes');

    logger.info('Vote cast', { jobId, userId, voteType });
    await ActivityLogService.log(userId, 'vote_cast', 'job', jobId, { voteType });

    return {
      upvotes: updatedJob?.upvotes ?? 0,
      downvotes: updatedJob?.downvotes ?? 0,
      userVote: voteType,
    };
  }

  /**
   * Get the current user's vote for a job (or null if not voted).
   */
  static async getUserVote(jobId: string, userId: string): Promise<'upvote' | 'downvote' | null> {
    const vote = await Vote.findOne({ jobId, userId });
    return vote?.voteType ?? null;
  }

  /**
   * Add a review to a job.
   * Finding 9.1 — prevents duplicate reviews per user per job.
   */
  static async addReview(
    jobId: string,
    reviewData: {
      rating?: number;
      comment: string;
      stage?: 'applied' | 'interviewed' | 'offered';
      outcome?: 'no_response' | 'rejected' | 'on_hold' | 'hired';
      salaryQuoted?: string;
    },
    author: string,
    authorUid?: string
  ): Promise<IReview> {
    const job = await Job.findById(jobId);
    if (!job) throw ApiError.notFound('Job not found');

    // Finding 9.1 — prevent duplicate reviews by same author
    const alreadyReviewed = job.reviews.some(
      (r) => r.author === author
    );
    if (alreadyReviewed) {
      throw ApiError.conflict('You have already reviewed this job report');
    }

    // Explicit field picking
    const review = new Review({
      jobId,
      author,
      comment: reviewData.comment,
      rating: reviewData.rating,
      stage: reviewData.stage,
      outcome: reviewData.outcome,
      salaryQuoted: reviewData.salaryQuoted,
    });
    job.reviews.push(review);
    await job.save();
    await ActivityLogService.log(authorUid ?? author, 'review_added', 'job', jobId, {
      rating: reviewData.rating,
      stage: reviewData.stage,
      outcome: reviewData.outcome,
    });
    return review;
  }

  /**
   * Delete a review (Finding 11.2 — owner or admin only).
   */
  static async deleteReview(
    jobId: string,
    reviewId: string,
    requestingUsername: string,
    requestingRole: string
  ): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) throw ApiError.notFound('Job not found');

    const reviewIndex = job.reviews.findIndex(
      (r) => (r._id as any).toString() === reviewId
    );
    if (reviewIndex === -1) throw ApiError.notFound('Review not found');

    const review = job.reviews[reviewIndex];
    if (requestingRole !== 'admin' && review.author !== requestingUsername) {
      throw ApiError.forbidden('You can only delete your own reviews');
    }

    job.reviews.splice(reviewIndex, 1);
    await job.save();
    logger.info('Review deleted', { jobId, reviewId, by: requestingUsername });
    await ActivityLogService.log(requestingUsername, 'review_deleted', 'job', jobId, { reviewId });
  }

  /**
   * Get reviews for a job
   */
  static async getReviewsByJobId(jobId: string): Promise<IReview[]> {
    const job = await Job.findById(jobId).select('reviews');
    if (!job) throw ApiError.notFound('Job not found');
    return job.reviews;
  }

  /**
   * Get jobs by company with pagination.
   * Finding 12.2 — escapes regex metacharacters to prevent ReDoS.
   */
  static async getJobsByCompany(
    company: string,
    { page, limit }: PaginationParams
  ): Promise<PaginatedResult<IJob>> {
    const skip = (page - 1) * limit;
    // Finding 12.2 — escape user input before creating RegExp
    const filter = { company: new RegExp(escapeRegex(company), 'i') };
    const [data, total] = await Promise.all([
      Job.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments(filter),
    ]);
    await redactPrivateSubmitters(data);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get fake jobs with pagination
   */
  static async getFakeJobs({ page, limit }: PaginationParams): Promise<PaginatedResult<IJob>> {
    const skip = (page - 1) * limit;
    const filter = { isFake: true };
    const [data, total] = await Promise.all([
      Job.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments(filter),
    ]);
    await redactPrivateSubmitters(data);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get real jobs with pagination
   */
  static async getRealJobs({ page, limit }: PaginationParams): Promise<PaginatedResult<IJob>> {
    const skip = (page - 1) * limit;
    const filter = { isFake: false };
    const [data, total] = await Promise.all([
      Job.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments(filter),
    ]);
    await redactPrivateSubmitters(data);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Registry / Job Record support ──────────────────────────────────

  /**
   * Attach a standalone evidence item to an existing record. Starts
   * "pending" — a moderator decides verified/unverifiable/redacted later.
   */
  static async addEvidence(
    jobId: string,
    data: { type: 'image' | 'url' | 'text'; value: string },
    addedByUid: string
  ): Promise<IEvidence> {
    const job = await Job.findById(jobId);
    if (!job) throw ApiError.notFound('Job not found');
    if (job.evidence.length >= 5) throw ApiError.badRequest('Maximum 5 evidence items allowed');

    const user = await User.findOne({ uid: addedByUid }).select('username');
    if (!user) throw ApiError.notFound('User not found');

    job.evidence.push({
      type: data.type,
      value: data.value,
      status: 'pending',
      addedBy: user.username,
      addedAt: new Date(),
    } as IEvidence);
    await job.save();
    const saved = job.evidence[job.evidence.length - 1];

    logger.info('Evidence added', { jobId, addedBy: addedByUid });
    await ActivityLogService.log(addedByUid, 'evidence_uploaded', 'job', jobId, {
      evidenceId: (saved._id as any)?.toString(),
      type: data.type,
    });
    return saved;
  }

  /**
   * Every pending evidence item across the whole platform, oldest first —
   * the Moderation workspace's evidence queue.
   */
  static async getPendingEvidenceQueue({ page, limit }: PaginationParams) {
    const pipeline = [
      { $unwind: '$evidence' },
      { $match: { 'evidence.status': 'pending' } },
      { $sort: { 'evidence.addedAt': 1 as const } },
      {
        $project: {
          _id: 0,
          jobId: '$_id',
          jobTitle: '$title',
          jobCompany: '$company',
          evidence: '$evidence',
        },
      },
    ];
    const [data, countResult] = await Promise.all([
      Job.aggregate([...pipeline, { $skip: (page - 1) * limit }, { $limit: limit }]),
      Job.aggregate([...pipeline, { $count: 'total' }]),
    ]);
    const total = countResult[0]?.total ?? 0;
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Moderator decision on one evidence item. This certifies a document is
   * what it claims to be — never a ruling on whether the job is real.
   */
  static async updateEvidenceStatus(
    jobId: string,
    evidenceId: string,
    data: { status: 'verified' | 'unverifiable' | 'redacted'; note?: string },
    moderatorUid: string
  ): Promise<IEvidence> {
    const job = await Job.findById(jobId);
    if (!job) throw ApiError.notFound('Job not found');

    const item = (job.evidence as any).id(evidenceId);
    if (!item) throw ApiError.notFound('Evidence item not found');

    const moderator = await User.findOne({ uid: moderatorUid }).select('username');
    if (!moderator) throw ApiError.notFound('User not found');

    item.status = data.status;
    if (data.note !== undefined) item.note = data.note;
    item.verifiedBy = moderator.username;
    item.verifiedAt = new Date();
    await job.save();

    const action = data.status === 'redacted' ? 'evidence_redacted' : 'evidence_verified';
    await ActivityLogService.log(moderatorUid, action, 'job', jobId, {
      evidenceId,
      status: data.status,
    });

    await NotificationService.notifyWatchers(
      jobId,
      'evidence_uploaded',
      data.status === 'redacted'
        ? 'Evidence on a record you watch was redacted by a moderator.'
        : 'Evidence on a record you watch was verified.',
      `/registry/${jobId}`
    );

    return item;
  }

  /**
   * On-demand liveness check for a job's application URL — real, not
   * fabricated, but lazy: run when a record is viewed and the last check is
   * missing or stale, instead of a scheduled crawler.
   */
  static async checkUrl(jobId: string): Promise<IUrlCheck> {
    const job = await Job.findById(jobId).select('jobUrl urlCheck');
    if (!job) throw ApiError.notFound('Job not found');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let ok = false;
    let statusCode: number | undefined;
    try {
      // This endpoint is unauthenticated and reports the response status
      // back to the caller, so an unguarded fetch would turn it into an
      // internal port scanner. Redirects are handled manually so each hop
      // is validated rather than trusted.
      let target = (await assertUrlIsFetchable(job.jobUrl)).url.toString();

      for (let hop = 0; hop <= 5; hop++) {
        let res = await fetch(target, { method: 'HEAD', redirect: 'manual', signal: controller.signal });
        if (res.status === 405 || res.status === 501) {
          res = await fetch(target, { method: 'GET', redirect: 'manual', signal: controller.signal });
        }

        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get('location');
          if (!location) {
            statusCode = res.status;
            break;
          }
          const next = new URL(location, target).toString();
          target = (await assertUrlIsFetchable(next)).url.toString();
          continue;
        }

        statusCode = res.status;
        ok = res.status >= 200 && res.status < 400;
        break;
      }
    } catch (err) {
      // A URL that now resolves somewhere internal counts as a failed
      // check, the same as an unreachable host.
      if (err instanceof SsrfBlockedError) {
        logger.warn('Security: blocked SSRF attempt via job URL check', {
          jobId,
          reason: err.reason,
        });
      }
      ok = false;
    } finally {
      clearTimeout(timeout);
    }

    const prev = job.urlCheck;
    const consecutiveFailures = ok ? 0 : (prev?.consecutiveFailures ?? 0) + 1;
    const urlCheck: IUrlCheck = {
      checkedAt: new Date(),
      ok,
      statusCode,
      consecutiveFailures,
      lastSuccessAt: ok ? new Date() : prev?.lastSuccessAt,
    };
    await Job.findByIdAndUpdate(jobId, { urlCheck });
    logger.info('URL check run', { jobId, ok, statusCode, consecutiveFailures });
    await ActivityLogService.log('system', 'url_checked', 'job', jobId, { ok, statusCode });
    return urlCheck;
  }

  static async watchJob(jobId: string, uid: string): Promise<void> {
    const job = await Job.findById(jobId).select('_id');
    if (!job) throw ApiError.notFound('Job not found');
    await User.findOneAndUpdate({ uid }, { $addToSet: { watchedJobs: job._id } });
    await ActivityLogService.log(uid, 'watch_added', 'job', jobId);
  }

  static async unwatchJob(jobId: string, uid: string): Promise<void> {
    await User.findOneAndUpdate({ uid }, { $pull: { watchedJobs: jobId } });
    await ActivityLogService.log(uid, 'watch_removed', 'job', jobId);
  }

  static async isWatching(jobId: string, uid: string): Promise<boolean> {
    const user = await User.findOne({ uid, watchedJobs: jobId }).select('_id');
    return !!user;
  }

  /**
   * Every job a user has contributed a first-hand account or evidence to —
   * powers the Profile "Contributions" tab.
   */
  static async getMyContributions(username: string, { page, limit }: PaginationParams): Promise<PaginatedResult<IJob>> {
    const filter = { $or: [{ 'reviews.author': username }, { 'evidence.addedBy': username }] };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Job.find(filter).select('-__v').sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments(filter),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async getWatching(uid: string, { page, limit }: PaginationParams): Promise<PaginatedResult<IJob>> {
    const user = await User.findOne({ uid }).select('watchedJobs');
    if (!user || user.watchedJobs.length === 0) return { data: [], total: 0, page, totalPages: 0 };
    const skip = (page - 1) * limit;
    const ids = user.watchedJobs;
    const [data, total] = await Promise.all([
      Job.find({ _id: { $in: ids } }).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments({ _id: { $in: ids } }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /** Normalize text for exact-match duplicate detection — no fabricated fuzzy score. */
  private static normalize(s: string): string {
    return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private static countContributors(job: IJob): number {
    const set = new Set<string>();
    for (const r of job.reviews) set.add(r.author);
    for (const e of job.evidence) if (e.addedBy) set.add(e.addedBy);
    return set.size || (job.reviews.length + job.evidence.length > 0 ? 1 : 0);
  }

  /**
   * Repost / duplicate-text signals, computed across the whole collection.
   * O(N) in-memory grouping — acceptable at this project's scale; revisit
   * with a proper aggregation or search index if the corpus grows large.
   */
  private static async buildSignalMaps(): Promise<{
    repostCount: Map<string, number>;
    duplicateCount: Map<string, number>;
  }> {
    const jobs = await Job.find().select('_id title company description').limit(5000);
    const repostGroups = new Map<string, string[]>();
    const dupGroups = new Map<string, string[]>();
    for (const j of jobs) {
      const id = (j._id as any).toString();
      const repostKey = `${JobService.normalize(j.company)}|${JobService.normalize(j.title)}`;
      if (!repostGroups.has(repostKey)) repostGroups.set(repostKey, []);
      repostGroups.get(repostKey)!.push(id);

      const dupKey = JobService.normalize(j.description).slice(0, 800);
      if (dupKey.length > 40) {
        if (!dupGroups.has(dupKey)) dupGroups.set(dupKey, []);
        dupGroups.get(dupKey)!.push(id);
      }
    }
    const repostCount = new Map<string, number>();
    for (const ids of repostGroups.values()) {
      if (ids.length > 1) for (const id of ids) repostCount.set(id, ids.length - 1);
    }
    const duplicateCount = new Map<string, number>();
    for (const ids of dupGroups.values()) {
      if (ids.length > 1) for (const id of ids) duplicateCount.set(id, ids.length - 1);
    }
    return { repostCount, duplicateCount };
  }

  /**
   * Registry listing: search + "signal" filters computed from real data
   * (URL dead, reposted 3x+, has an account, thin record, flagged fake).
   */
  static async getRegistryListing(params: {
    page: number;
    limit: number;
    signal?: 'dead' | 'repost' | 'accounts' | 'thin' | 'fake';
    search?: string;
  }) {
    const { page, limit, signal, search } = params;
    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { title: new RegExp(escapeRegex(search), 'i') },
        { company: new RegExp(escapeRegex(search), 'i') },
        { jobUrl: new RegExp(escapeRegex(search), 'i') },
      ];
    }
    if (signal === 'dead') filter['urlCheck.ok'] = false;
    if (signal === 'accounts') filter['reviews.0'] = { $exists: true };
    if (signal === 'fake') filter.isFake = true;

    const [jobs, { repostCount }] = await Promise.all([
      Job.find(filter).select('-__v').populate('submittedBy', 'uid username').sort({ updatedAt: -1 }).limit(2000),
      JobService.buildSignalMaps(),
    ]);
    await redactPrivateSubmitters(jobs);

    let decorated = jobs.map((job) => {
      const id = (job._id as any).toString();
      return {
        job,
        repostCount: repostCount.get(id) ?? 0,
        contributorsCount: JobService.countContributors(job),
      };
    });

    if (signal === 'repost') decorated = decorated.filter((d) => d.repostCount >= 2);
    if (signal === 'thin') decorated = decorated.filter((d) => d.contributorsCount > 0 && d.contributorsCount < 3);

    const total = decorated.length;
    const skip = (page - 1) * limit;
    const data = decorated.slice(skip, skip + limit);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Assembles everything the Job Record page needs in one call: the job
   * itself, challenges (Reports) with any employer reply, the activity log,
   * repost/duplicate siblings, and aggregate stats for its company. The
   * "seven questions" states are derived from this on the frontend — this
   * stays raw data, not presentation.
   */
  static async getRecord(jobId: string) {
    const job = await Job.findById(jobId).select('-__v').populate('submittedBy', 'uid username');
    if (!job) throw ApiError.notFound('Job not found');
    await redactPrivateSubmitters([job]);

    const [reports, activity, { repostCount }] = await Promise.all([
      Report.find({ targetType: 'job', targetId: jobId }).populate('reportedBy', 'username').sort({ createdAt: -1 }),
      ActivityLogService.getForTarget('job', jobId, { page: 1, limit: 50 }),
      JobService.buildSignalMaps(),
    ]);

    const jobIdStr = (job._id as any).toString();
    const companyRe = new RegExp(`^${escapeRegex(job.company)}$`, 'i');
    const titleRe = new RegExp(`^${escapeRegex(job.title)}$`, 'i');

    const [repostSiblings, duplicateSiblings, companyJobs] = await Promise.all([
      Job.find({ _id: { $ne: job._id }, company: companyRe, title: titleRe })
        .select('title company createdAt')
        .sort({ createdAt: 1 }),
      JobService.normalize(job.description).length > 40
        ? Job.find({ _id: { $ne: job._id }, description: job.description }).select('title company createdAt')
        : Promise.resolve([]),
      Job.find({ company: companyRe }).select('_id reviews evidence'),
    ]);

    const companyJobIds = companyJobs.map((j) => j._id);
    const [companyOpenReports, companyEmployerReplies] = await Promise.all([
      Report.countDocuments({ targetType: 'job', targetId: { $in: companyJobIds }, status: 'pending' }),
      Report.countDocuments({ targetType: 'job', targetId: { $in: companyJobIds }, employerReply: { $exists: true } }),
    ]);
    const confirmedHires = companyJobs.reduce(
      (n, j) => n + j.reviews.filter((r) => r.outcome === 'hired').length,
      0
    );

    return {
      job,
      reports,
      log: activity.data,
      contributorsCount: JobService.countContributors(job),
      trustScore: TrustService.calculateJobTrust(job),
      repostCount: repostCount.get(jobIdStr) ?? 0,
      repostSiblings,
      duplicateSiblings,
      companyStats: {
        listingsTracked: companyJobs.length,
        openReports: companyOpenReports,
        confirmedHires,
        employerReplies: companyEmployerReplies,
      },
    };
  }
}

export default JobService;