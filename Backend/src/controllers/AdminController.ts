import { Request, Response } from 'express';
import '../types/express';
import User from '../models/User';
import ActivityLogService from '../services/ActivityLogService';
import NotificationService from '../services/NotificationService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const AdminController = {
  /**
   * GET /api/admin/users — list all users (admin only)
   */
  listUsers: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      User.find()
        .select('-password -refreshToken -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    ApiResponse.paginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }),

  /**
   * PATCH /api/admin/users/:uid/role — change a user's role (admin only)
   */
  changeRole: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();

    const { uid } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'moderator'].includes(role)) {
      throw ApiError.badRequest('Role must be one of: user, admin, moderator');
    }

    // Prevent self-role-change
    if (uid === req.user.uid) {
      throw ApiError.forbidden('You cannot change your own role');
    }

    const target = await User.findOneAndUpdate(
      { uid },
      { role },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -__v');

    if (!target) throw ApiError.notFound('User not found');

    // Log the role change
    await ActivityLogService.log(
      req.user.uid,
      'role_changed',
      'user',
      target._id.toString(),
      { from: target.role, to: role }
    );

    // Notify the affected user
    await NotificationService.create(
      uid,
      'role_changed',
      `Your role has been updated to "${role}"`,
    );

    ApiResponse.success(res, target, `User role updated to ${role}`);
  }),
};

export default AdminController;
