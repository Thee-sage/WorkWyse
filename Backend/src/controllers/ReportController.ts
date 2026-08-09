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

  updateStatus: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const report = await ReportService.updateStatus(
      req.params.id,
      req.body.status,
      req.user.uid
    );
    ApiResponse.success(res, report, 'Report status updated');
  }),
};

export default ReportController;
