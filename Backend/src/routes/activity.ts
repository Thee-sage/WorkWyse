import express from 'express';
import ActivityController from '../controllers/ActivityController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = express.Router();

const targetParamSchema = {
  params: z.object({
    targetType: z.enum(['job', 'company', 'report', 'user']),
    targetId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID'),
  }),
};

// Public: activity feed for a specific target
router.get(
  '/:targetType/:targetId',
  validate(targetParamSchema),
  ActivityController.getForTarget
);

// Admin only: full audit log
router.get(
  '/',
  authenticate,
  authorize('admin'),
  ActivityController.getAll
);

export default router;
