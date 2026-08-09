import Notification, { INotification } from '../models/Notification';
import User from '../models/User';
import logger from '../config/logger';

type NotificationType = INotification['type'];

interface PaginationParams {
  page: number;
  limit: number;
}

class NotificationService {
  /**
   * Create a notification for a given user (by uid).
   * Silently swallows errors so it never breaks business operations.
   */
  static async create(
    recipientUid: string,
    type: NotificationType,
    message: string,
    link?: string
  ): Promise<void> {
    try {
      const user = await User.findOne({ uid: recipientUid }).select('_id');
      if (!user) return;
      await Notification.create({ userId: user._id, type, message, link });
    } catch (err) {
      logger.error('NotificationService.create failed', { err, recipientUid });
    }
  }

  /**
   * Get paginated notifications for a user.
   */
  static async getForUser(uid: string, { page, limit }: PaginationParams) {
    const user = await User.findOne({ uid }).select('_id');
    if (!user) return { data: [], total: 0, page, totalPages: 0, unreadCount: 0 };

    const skip = (page - 1) * limit;
    const [data, total, unreadCount] = await Promise.all([
      Notification.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Notification.countDocuments({ userId: user._id }),
      Notification.countDocuments({ userId: user._id, read: false }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit), unreadCount };
  }

  /**
   * Get unread count only — used for the notification bell badge.
   */
  static async getUnreadCount(uid: string): Promise<number> {
    const user = await User.findOne({ uid }).select('_id');
    if (!user) return 0;
    return Notification.countDocuments({ userId: user._id, read: false });
  }

  /**
   * Mark a single notification as read.
   */
  static async markRead(notificationId: string, uid: string): Promise<void> {
    const user = await User.findOne({ uid }).select('_id');
    if (!user) return;
    await Notification.findOneAndUpdate(
      { _id: notificationId, userId: user._id },
      { read: true }
    );
  }

  /**
   * Mark all notifications as read for a user.
   */
  static async markAllRead(uid: string): Promise<void> {
    const user = await User.findOne({ uid }).select('_id');
    if (!user) return;
    await Notification.updateMany({ userId: user._id, read: false }, { read: true });
  }

  /**
   * Delete a single notification (own only).
   */
  static async deleteOne(notificationId: string, uid: string): Promise<void> {
    const user = await User.findOne({ uid }).select('_id');
    if (!user) return;
    await Notification.findOneAndDelete({ _id: notificationId, userId: user._id });
  }
}

export default NotificationService;
