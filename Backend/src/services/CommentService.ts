import Comment, { IComment } from '../models/Comment';
import User from '../models/User';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';

interface PaginationParams {
  page: number;
  limit: number;
}

class CommentService {
  /**
   * Add a comment to a job.
   */
  static async create(
    jobId: string,
    body: string,
    authorUid: string
  ): Promise<IComment> {
    const user = await User.findOne({ uid: authorUid }).select('_id username');
    if (!user) throw ApiError.notFound('User not found');

    const comment = await Comment.create({
      jobId,
      author: user._id,
      authorUsername: user.username,
      body,
    });

    logger.info('Comment created', { jobId, commentId: comment._id, author: user.username });
    return comment;
  }

  /**
   * Get paginated comments for a job.
   */
  static async getForJob(jobId: string, { page, limit }: PaginationParams) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Comment.find({ jobId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Comment.countDocuments({ jobId }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Delete a comment — owner or admin only.
   */
  static async delete(
    commentId: string,
    requestingUid: string,
    requestingRole: string
  ): Promise<void> {
    const user = await User.findOne({ uid: requestingUid }).select('_id username');
    if (!user) throw ApiError.unauthorized();

    const comment = await Comment.findById(commentId).populate('author', 'uid');
    if (!comment) throw ApiError.notFound('Comment not found');

    const authorUid = (comment.author as any)?.uid;
    if (requestingRole !== 'admin' && authorUid !== requestingUid) {
      throw ApiError.forbidden('You can only delete your own comments');
    }

    await Comment.findByIdAndDelete(commentId);
    logger.info('Comment deleted', { commentId, by: user.username });
  }
}

export default CommentService;
