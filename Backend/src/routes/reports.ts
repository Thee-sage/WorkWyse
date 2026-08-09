import express from 'express';
import ReportController from '../controllers/ReportController';
import { validate } from '../middleware/validate';
import { authenticate, authorize, requireVerified } from '../middleware/auth';
import {
  createReportSchema,
  updateReportStatusSchema,
  reportIdParamSchema,
  reportListQuerySchema,
} from '../validators/report.schema';
import { paginationSchema } from '../validators/job.schema';
import { flagReportLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Authenticated user routes
// Finding 3.2 — added flagReportLimiter
router.post('/', authenticate, requireVerified, flagReportLimiter, validate(createReportSchema), ReportController.create);
router.get('/mine', authenticate, validate(paginationSchema), ReportController.getMyReports);

// Admin-only routes
// Finding 8.2 — use reportListQuerySchema which validates the status enum
router.get('/', authenticate, authorize('admin'), validate(reportListQuerySchema), ReportController.getAll);
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  validate(reportIdParamSchema),
  validate(updateReportStatusSchema),
  ReportController.updateStatus
);

export default router;
