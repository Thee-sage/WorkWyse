import { Job, Review, Vote, IJob, IReview, IEvidence } from '../models/Job';
import User from '../models/User';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';
import ActivityLogService from './ActivityLogService';

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
function escapeRegex(str: string): string {
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
    reviewData: { rating: number; comment: string },
    author: string
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

    const review = new Review({ ...reviewData, author, jobId });
    job.reviews.push(review);
    await job.save();
    await ActivityLogService.log(author, 'review_added', 'job', jobId, { rating: reviewData.rating });
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
}

export default JobService;