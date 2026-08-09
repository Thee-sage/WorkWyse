import { Request, Response } from 'express';
import '../types/express';
import CommentService from '../services/CommentService';
import ActivityLogService from '../services/ActivityLogService';
import NotificationService from '../services/NotificationService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { Job } from '../models/Job';

const CommentController = {
  getComments: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await CommentService.getForJob(req.params.id, { page, limit });
    ApiResponse.paginated(res, result.data, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  addComment: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const comment = await CommentService.create(req.params.id, req.body.body, req.user.uid);

    // Log activity
    await ActivityLogService.log(
      req.user.uid,
      'comment_added',
      'job',
      req.params.id,
      { commentId: (comment._id as any).toString() }
    );

    // Notify job owner if different user
    const job = await Job.findById(req.params.id).populate('submittedBy', 'uid');
    const ownerUid = (job?.submittedBy as any)?.uid;
    if (ownerUid && ownerUid !== req.user.uid) {
      await NotificationService.create(
        ownerUid,
        'comment_added',
        `${req.user.username} commented on your job report: "${job?.title}"`,
        `/jobs/${req.params.id}`
      );
    }

    ApiResponse.created(res, comment, 'Comment added successfully');
  }),

  deleteComment: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await CommentService.delete(req.params.commentId, req.user.uid, req.user.role);
    await ActivityLogService.log(
      req.user.uid,
      'comment_deleted',
      'job',
      req.params.id,
      { commentId: req.params.commentId }
    );
    ApiResponse.noContent(res);
  }),
};

export default CommentController;
