import express from 'express';
import NotificationController from '../controllers/NotificationController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = express.Router();

const idParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid notification ID'),
  }),
};

// All notification routes require authentication
router.get('/', authenticate, NotificationController.getMyNotifications);
router.get('/unread-count', authenticate, NotificationController.getUnreadCount);
router.patch('/read-all', authenticate, NotificationController.markAllRead);
router.patch('/:id/read', authenticate, validate(idParamSchema), NotificationController.markRead);
router.delete('/:id', authenticate, validate(idParamSchema), NotificationController.deleteOne);

export default router;
