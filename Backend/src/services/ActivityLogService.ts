import ActivityLog, { ActivityAction, ActivityTargetType } from '../models/ActivityLog';
import User from '../models/User';
import logger from '../config/logger';

interface PaginationParams {
  page: number;
  limit: number;
}

class ActivityLogService {
  /**
   * Write an activity log entry. Pass `'system'` as `actorUid` for automated
   * entries (e.g. a URL liveness check) that aren't attributable to a user —
   * those are recorded with actorUsername 'SYSTEM' and no actorId.
   * Silently swallows errors so a logging failure never breaks a business operation.
   */
  static async log(
    actorUid: string,
    action: ActivityAction,
    targetType: ActivityTargetType,
    targetId: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    try {
      if (actorUid === 'system') {
        await ActivityLog.create({ actorUsername: 'SYSTEM', action, targetType, targetId, meta });
        return;
      }

      const user = await User.findOne({ uid: actorUid }).select('_id username');
      if (!user) return; // actor vanished — skip silently

      await ActivityLog.create({
        actorId: user._id,
        actorUsername: user.username,
        action,
        targetType,
        targetId,
        meta,
      });
    } catch (err) {
      // Never throw — logging must not break business logic
      logger.error('ActivityLogService.log failed', { err, actorUid, action });
    }
  }

  /**
   * Public transparency feed (Activity screen) — like getAll but safe to
   * expose without authentication: excludes role_changed (internal admin
   * action on a user account) and any entries targeting a user directly.
   */
  static async getFeed({ page, limit }: PaginationParams) {
    const skip = (page - 1) * limit;
    const filter = { action: { $ne: 'role_changed' as ActivityAction }, targetType: { $ne: 'user' as ActivityTargetType } };
    const [data, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-__v'),
      ActivityLog.countDocuments(filter),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get activity feed for a specific target (job, company, etc.)
   */
  static async getForTarget(
    targetType: ActivityTargetType,
    targetId: string,
    { page, limit }: PaginationParams
  ) {
    const skip = (page - 1) * limit;
    const filter = { targetType, targetId };
    const [data, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      ActivityLog.countDocuments(filter),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get full audit log (admin only)
   */
  static async getAll(
    { page, limit }: PaginationParams,
    action?: ActivityAction
  ) {
    const skip = (page - 1) * limit;
    const filter = action ? { action } : {};
    const [data, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      ActivityLog.countDocuments(filter),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }
}

export default ActivityLogService;
