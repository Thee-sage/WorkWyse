import { Request, Response } from 'express';
import '../types/express';
import ActivityLogService from '../services/ActivityLogService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { ActivityAction, ActivityTargetType } from '../models/ActivityLog';

const ActivityController = {
  /** Public transparency feed for the Activity screen. */
  getFeed: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const result = await ActivityLogService.getFeed({ page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getForTarget: catchAsync(async (req: Request, res: Response) => {
    const { targetType, targetId } = req.params as {
      targetType: ActivityTargetType;
      targetId: string;
    };
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await ActivityLogService.getForTarget(targetType, targetId, { page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getAll: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const action = req.query.action as ActivityAction | undefined;
    const result = await ActivityLogService.getAll({ page, limit }, action);
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),
};

export default ActivityController;
