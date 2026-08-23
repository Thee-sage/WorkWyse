import express from 'express';
import ReportController from '../controllers/ReportController';
import { validate } from '../middleware/validate';
import { authenticate, authorize, requireVerified } from '../middleware/auth';
import { requireAdminUnlock } from '../middleware/adminUnlock';
import {
  createReportSchema,
  updateReportStatusSchema,
  reportIdParamSchema,
  reportListQuerySchema,
  employerReplySchema,
  requestDecisionSchema,
  decisionRequestIdParamSchema,
  decisionRequestListQuerySchema,
  decideRequestSchema,
} from '../validators/report.schema';
import { paginationSchema } from '../validators/job.schema';
import { flagReportLimiter, decisionRequestLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Authenticated user routes
// Finding 3.2 — added flagReportLimiter
router.post('/', authenticate, requireVerified, flagReportLimiter, validate(createReportSchema), ReportController.create);
router.get('/mine', authenticate, validate(paginationSchema), ReportController.getMyReports);

// Moderation workspace routes (admin or moderator — matches rbac.ts's
// 'reports:review' permission, which already names both roles)
router.get('/', authenticate, authorize('admin', 'moderator'), validate(reportListQuerySchema), ReportController.getAll);

// A moderator can no longer decide a report directly — that requires an
// admin (see updateStatus below). Their path is a rate-limited request,
// which sits pending until an admin approves or rejects it.
router.post(
  '/:id/decision-requests',
  authenticate,
  authorize('admin', 'moderator'),
  decisionRequestLimiter,
  validate(reportIdParamSchema),
  validate(requestDecisionSchema),
  ReportController.requestDecision
);

// Admin-only: review the queue of pending (and past) moderator requests.
// Also gated on requireAdminUnlock — approving/rejecting a moderator's
// proposed report decision is exactly the kind of action the passphrase
// second factor exists to protect.
router.get(
  '/decision-requests',
  authenticate,
  authorize('admin'),
  requireAdminUnlock,
  validate(decisionRequestListQuerySchema),
  ReportController.getDecisionRequests
);
router.patch(
  '/decision-requests/:id/approve',
  authenticate,
  authorize('admin'),
  requireAdminUnlock,
  validate(decisionRequestIdParamSchema),
  validate(decideRequestSchema),
  ReportController.approveDecisionRequest
);
router.patch(
  '/decision-requests/:id/reject',
  authenticate,
  authorize('admin'),
  requireAdminUnlock,
  validate(decisionRequestIdParamSchema),
  validate(decideRequestSchema),
  ReportController.rejectDecisionRequest
);

// Direct decision — admin only now, and also requires the unlock. A
// moderator hitting this endpoint gets a 403 and must use
// POST /:id/decision-requests instead.
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  requireAdminUnlock,
  validate(reportIdParamSchema),
  validate(updateReportStatusSchema),
  ReportController.updateStatus
);
router.patch(
  '/:id/employer-reply',
  authenticate,
  authorize('admin', 'moderator'),
  validate(reportIdParamSchema),
  validate(employerReplySchema),
  ReportController.setEmployerReply
);

export default router;
