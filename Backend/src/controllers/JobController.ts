import { Request, Response } from 'express';
import '../types/express';
import JobService from '../services/JobService';
import JobExtractorService from '../services/JobExtractorService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const JobController = {
  extractJobUrl: catchAsync(async (req: Request, res: Response) => {
    const { jobUrl } = req.body;
    const result = await JobExtractorService.extract(jobUrl);
    ApiResponse.success(res, result, 'Job URL extraction complete');
  }),

  getAllJobs: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await JobService.getAllJobs({ page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getJobById: catchAsync(async (req: Request, res: Response) => {
    const job = await JobService.getJobById(req.params.id);
    ApiResponse.success(res, job);
  }),

  createJob: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const job = await JobService.createJob(req.body, req.user.uid);
    ApiResponse.created(res, job, 'Job created successfully');
  }),

  /**
   * Finding 1.3 / 11.1 — Update a job report (owner or admin).
   */
  updateJob: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const job = await JobService.updateJob(
      req.params.id,
      req.body,
      req.user.uid,
      req.user.role
    );
    ApiResponse.success(res, job, 'Job updated successfully');
  }),

  /**
   * Finding 1.3 / 11.1 — Delete a job report (owner or admin).
   */
  deleteJob: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await JobService.deleteJob(req.params.id, req.user.uid, req.user.role);
    ApiResponse.noContent(res);
  }),

  vote: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const result = await JobService.vote(req.params.id, req.user.uid, req.body.voteType);
    ApiResponse.success(res, result, 'Vote recorded successfully');
  }),

  getUserVote: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const userVote = await JobService.getUserVote(req.params.id, req.user.uid);
    ApiResponse.success(res, { userVote });
  }),

  addReview: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const review = await JobService.addReview(req.params.id, req.body, req.user.username, req.user.uid);
    ApiResponse.created(res, review, 'Review added successfully');
  }),

  /**
   * Finding 11.2 — Delete a review (owner or admin).
   */
  deleteReview: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await JobService.deleteReview(
      req.params.id,
      req.params.reviewId,
      req.user.username,
      req.user.role
    );
    ApiResponse.noContent(res);
  }),

  getReviewsByJobId: catchAsync(async (req: Request, res: Response) => {
    const reviews = await JobService.getReviewsByJobId(req.params.id);
    ApiResponse.success(res, reviews);
  }),

  getJobsByCompany: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await JobService.getJobsByCompany(req.params.company, { page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getFakeJobs: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await JobService.getFakeJobs({ page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getRealJobs: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await JobService.getRealJobs({ page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getRegistryListing: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const signal = req.query.signal as any;
    const search = req.query.search as string | undefined;
    const result = await JobService.getRegistryListing({ page, limit, signal, search });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getPendingEvidenceQueue: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await JobService.getPendingEvidenceQueue({ page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getRecord: catchAsync(async (req: Request, res: Response) => {
    const record = await JobService.getRecord(req.params.id);
    ApiResponse.success(res, record);
  }),

  addEvidence: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const evidence = await JobService.addEvidence(req.params.id, req.body, req.user.uid);
    ApiResponse.created(res, evidence, 'Evidence added successfully');
  }),

  updateEvidenceStatus: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const evidence = await JobService.updateEvidenceStatus(
      req.params.id,
      req.params.evidenceId,
      req.body,
      req.user.uid
    );
    ApiResponse.success(res, evidence, 'Evidence decision recorded');
  }),

  checkUrl: catchAsync(async (req: Request, res: Response) => {
    const urlCheck = await JobService.checkUrl(req.params.id);
    ApiResponse.success(res, urlCheck, 'URL check complete');
  }),

  getWatchStatus: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const watching = await JobService.isWatching(req.params.id, req.user.uid);
    ApiResponse.success(res, { watching });
  }),

  watchJob: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await JobService.watchJob(req.params.id, req.user.uid);
    ApiResponse.success(res, { watching: true });
  }),

  unwatchJob: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await JobService.unwatchJob(req.params.id, req.user.uid);
    ApiResponse.success(res, { watching: false });
  }),

  getMyContributions: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await JobService.getMyContributions(req.user.username, { page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getWatching: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await JobService.getWatching(req.user.uid, { page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),
};

export default JobController;