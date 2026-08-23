import express from 'express';
import AdminController from '../controllers/AdminController';
import { authenticate, authorize } from '../middleware/auth';
import { issueAdminUnlock, requireAdminUnlock } from '../middleware/adminUnlock';
import { adminUnlockLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { paginationSchema } from '../validators/job.schema';
import { z } from 'zod';

const router = express.Router();

const uidParamSchema = {
  params: z.object({
    uid: z.string().min(1, 'UID is required'),
  }),
};

const changeRoleSchema = {
  body: z.object({
    role: z.enum(['user', 'admin', 'moderator'], {
      message: 'Role must be user, admin, or moderator',
    }),
  }),
};

const createApiKeySchema = {
  body: z.object({
    label: z.string().min(1, 'Label is required').max(100),
  }),
};

const apiKeyIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid API key ID'),
  }),
};

const unlockSchema = {
  body: z.object({
    passphrase: z.string().min(1, 'Passphrase is required'),
  }),
};

// ─── Admin unlock ──────────────────────────────────────────────────────
// Requires an authenticated admin account AND the shared passphrase. This
// is the only admin route that does NOT also require requireAdminUnlock —
// it is what grants the unlock token every other route below demands.
router.post(
  '/unlock',
  authenticate,
  authorize('admin'),
  adminUnlockLimiter,
  validate(unlockSchema),
  issueAdminUnlock
);

// Every route below requires: authenticated + admin role + a valid,
// account-bound unlock token (X-Admin-Unlock header). See
// middleware/adminUnlock.ts for why this exists as a second factor.
router.get(
  '/users',
  authenticate,
  authorize('admin'),
  requireAdminUnlock,
  validate(paginationSchema),
  AdminController.listUsers
);
router.patch(
  '/users/:uid/role',
  authenticate,
  authorize('admin'),
  requireAdminUnlock,
  validate(uidParamSchema),
  validate(changeRoleSchema),
  AdminController.changeRole
);

// Extension API key management — see controllers/AdminController.ts and
// models/ApiKey.ts. Manual/admin-only while the extension is unreleased.
router.post(
  '/api-keys',
  authenticate,
  authorize('admin'),
  requireAdminUnlock,
  validate(createApiKeySchema),
  AdminController.createApiKey
);
router.get(
  '/api-keys',
  authenticate,
  authorize('admin'),
  requireAdminUnlock,
  AdminController.listApiKeys
);
router.delete(
  '/api-keys/:id',
  authenticate,
  authorize('admin'),
  requireAdminUnlock,
  validate(apiKeyIdParamSchema),
  AdminController.revokeApiKey
);

export default router;
