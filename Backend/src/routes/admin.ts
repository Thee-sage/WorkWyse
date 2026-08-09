import express from 'express';
import AdminController from '../controllers/AdminController';
import { authenticate, authorize } from '../middleware/auth';
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

// All admin routes require admin role
router.get('/users', authenticate, authorize('admin'), validate(paginationSchema), AdminController.listUsers);
router.patch(
  '/users/:uid/role',
  authenticate,
  authorize('admin'),
  validate(uidParamSchema),
  validate(changeRoleSchema),
  AdminController.changeRole
);

export default router;
