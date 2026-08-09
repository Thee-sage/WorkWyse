import { Request, Response } from 'express';
import '../types/express';
import NotificationService from '../services/NotificationService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const NotificationController = {
  getMyNotifications: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await NotificationService.getForUser(req.user.uid, { page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    }, `Notifications retrieved (${result.unreadCount} unread)`);
  }),

  getUnreadCount: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const count = await NotificationService.getUnreadCount(req.user.uid);
    ApiResponse.success(res, { unreadCount: count });
  }),

  markRead: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await NotificationService.markRead(req.params.id, req.user.uid);
    ApiResponse.noContent(res);
  }),

  markAllRead: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await NotificationService.markAllRead(req.user.uid);
    ApiResponse.noContent(res);
  }),

  deleteOne: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await NotificationService.deleteOne(req.params.id, req.user.uid);
    ApiResponse.noContent(res);
  }),
};

export default NotificationController;
