import { Request, Response } from 'express';
import '../types/express';
import AnalyticsService from '../services/AnalyticsService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';

const AnalyticsController = {
  getPublicStats: catchAsync(async (_req: Request, res: Response) => {
    const stats = await AnalyticsService.getPublicStats();
    ApiResponse.success(res, stats);
  }),

  getDashboard: catchAsync(async (_req: Request, res: Response) => {
    const stats = await AnalyticsService.getDashboardStats();
    ApiResponse.success(res, stats, 'Dashboard stats retrieved');
  }),

  getJobTrend: catchAsync(async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;
    const trend = await AnalyticsService.getJobTrend(Math.min(days, 90));
    ApiResponse.success(res, trend, 'Job trend data retrieved');
  }),

  getReportTrend: catchAsync(async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;
    const trend = await AnalyticsService.getReportTrend(Math.min(days, 90));
    ApiResponse.success(res, trend, 'Report trend data retrieved');
  }),
};

export default AnalyticsController;
