import express from 'express';
import CommentController from '../controllers/CommentController';
import { authenticate, requireVerified } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { paginationSchema, jobIdParamSchema } from '../validators/job.schema';

const router = express.Router({ mergeParams: true });

const commentIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid job ID'),
    commentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid comment ID'),
  }),
};

const createCommentSchema = {
  body: z.object({
    body: z.string().min(1, 'Comment body is required').max(2000),
  }),
};

// Public: read comments
router.get('/', validate(jobIdParamSchema), validate(paginationSchema), CommentController.getComments);

// Authenticated: add and delete
router.post('/', authenticate, requireVerified, validate(jobIdParamSchema), validate(createCommentSchema), CommentController.addComment);
router.delete('/:commentId', authenticate, requireVerified, validate(commentIdParamSchema), CommentController.deleteComment);

export default router;
