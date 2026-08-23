import express from 'express';
import AnalyticsController from '../controllers/AnalyticsController';
import { authenticate, authorize } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = express.Router();

// Public: platform-wide stats for the Home page
router.get('/public', AnalyticsController.getPublicStats);

// All other analytics routes require admin or moderator access
router.get(
  '/dashboard',
  authenticate,
  requirePermission('analytics:view'),
  AnalyticsController.getDashboard
);

router.get(
  '/trends/jobs',
  authenticate,
  requirePermission('analytics:view'),
  AnalyticsController.getJobTrend
);

router.get(
  '/trends/reports',
  authenticate,
  requirePermission('analytics:view'),
  AnalyticsController.getReportTrend
);

export default router;
