import { Request, Response } from 'express';
import '../types/express';
import ReportService from '../services/ReportService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const ReportController = {
  create: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const report = await ReportService.create({
      ...req.body,
      reportedBy: req.user.uid,
    });
    ApiResponse.created(res, report, 'Report submitted successfully');
  }),

  getMyReports: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await ReportService.getMyReports(req.user.uid, { page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  // Finding 8.2 — status is now validated through reportListQuerySchema
  getAll: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as 'pending' | 'reviewed' | 'dismissed' | undefined;
    const result = await ReportService.getAll({ page, limit }, status);
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  // Admin-only direct override — see routes/reports.ts. A moderator's path
  // to a decision is requestDecision below, subject to admin approval.
  updateStatus: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const report = await ReportService.updateStatus(
      req.params.id,
      req.body.status,
      req.user.uid
    );
    ApiResponse.success(res, report, 'Report status updated');
  }),

  setEmployerReply: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const report = await ReportService.setEmployerReply(req.params.id, req.body.text, req.user.uid);
    ApiResponse.success(res, report, 'Employer reply recorded');
  }),

  // ─── Moderator decision requests ────────────────────────────────────

  requestDecision: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const request = await ReportService.requestDecision(
      req.params.id,
      req.body.proposedStatus,
      req.body.note,
      req.user.uid
    );
    ApiResponse.created(res, request, 'Decision request submitted — awaiting admin approval');
  }),

  getDecisionRequests: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
    const result = await ReportService.getDecisionRequests(status, { page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  approveDecisionRequest: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const request = await ReportService.approveDecisionRequest(
      req.params.id,
      req.body.note,
      req.user.uid
    );
    ApiResponse.success(res, request, 'Decision request approved');
  }),

  rejectDecisionRequest: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const request = await ReportService.rejectDecisionRequest(
      req.params.id,
      req.body.note,
      req.user.uid
    );
    ApiResponse.success(res, request, 'Decision request rejected');
  }),
};

export default ReportController;
