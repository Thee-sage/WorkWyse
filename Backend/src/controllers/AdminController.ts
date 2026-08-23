import { Request, Response } from 'express';
import '../types/express';
import crypto from 'crypto';
import User from '../models/User';
import ApiKey from '../models/ApiKey';
import ActivityLogService from '../services/ActivityLogService';
import NotificationService from '../services/NotificationService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';

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

  // ─── Extension API keys ────────────────────────────────────────────
  // Admin-only for now — the browser extension is not publicly released,
  // so key issuance is manual rather than self-serve. See models/ApiKey.ts
  // and middleware/apiKeyAuth.ts for how these are validated.

  /**
   * POST /api/admin/api-keys — issue a new extension API key.
   * The raw key is returned exactly once; only its hash is stored.
   */
  createApiKey: catchAsync(async (req: Request, res: Response) => {
    const { label } = req.body as { label: string };

    const rawKey = `wwx_${crypto.randomBytes(24).toString('base64url')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Not written to ActivityLogService: that log is the site-wide public
    // transparency feed, and issuing an internal API key is an operational
    // action, not something that belongs on it. logger.info is sufficient
    // for an audit trail here.
    const record = await ApiKey.create({
      label,
      keyHash,
      keyPrefix: rawKey.slice(0, 12),
      scopes: ['extension:lookup'],
    });

    logger.info('Extension API key created', {
      keyId: record._id,
      label,
      createdBy: req.user?.uid,
    });

    ApiResponse.success(
      res,
      { id: record._id, label: record.label, key: rawKey, keyPrefix: record.keyPrefix },
      'API key created — this is the only time the full key is shown.'
    );
  }),

  /** GET /api/admin/api-keys — list keys (never returns the raw key). */
  listApiKeys: catchAsync(async (_req: Request, res: Response) => {
    const keys = await ApiKey.find().select('-keyHash').sort({ createdAt: -1 });
    ApiResponse.success(res, keys);
  }),

  /** DELETE /api/admin/api-keys/:id — revoke a key. */
  revokeApiKey: catchAsync(async (req: Request, res: Response) => {
    const key = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { revokedAt: new Date() },
      { new: true }
    ).select('-keyHash');
    if (!key) throw ApiError.notFound('API key not found');
    ApiResponse.success(res, key, 'API key revoked');
  }),
};

export default AdminController;
