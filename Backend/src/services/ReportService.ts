import Report, { IReport } from '../models/Report';
import User from '../models/User';
import { Job } from '../models/Job';
import Company from '../models/Company';
import { ApiError } from '../utils/ApiError';
import ActivityLogService from './ActivityLogService';
import NotificationService from './NotificationService';

interface PaginationParams {
  page: number;
  limit: number;
}

class ReportService {
  /**
   * Submit a new report (authenticated user).
   * Finding 2.2 — validates that the target actually exists.
   * Finding 9.3 — prevents self-reporting own submissions.
   */
  static async create(data: {
    reportedBy: string; // uid from JWT
    targetType: 'job' | 'company';
    targetId: string;
    reason: string;
    description?: string;
  }): Promise<IReport> {
    // Look up the user's ObjectId from their uid
    const user = await User.findOne({ uid: data.reportedBy }).select('_id');
    if (!user) throw ApiError.notFound('User not found');

    // Finding 2.2 — validate that the target actually exists
    if (data.targetType === 'job') {
      const job = await Job.findById(data.targetId).select('submittedBy').populate('submittedBy', 'uid');
      if (!job) throw ApiError.notFound('The job you are trying to report does not exist');

      // Finding 9.3 — prevent self-reporting own job
      const submitterUid = (job.submittedBy as any)?.uid;
      if (submitterUid === data.reportedBy) {
        throw ApiError.forbidden('You cannot report your own job submission');
      }
    } else if (data.targetType === 'company') {
      const company = await Company.findById(data.targetId);
      if (!company) throw ApiError.notFound('The company you are trying to report does not exist');
    }

    // Prevent duplicate reports by same user on same target
    const existingReport = await Report.findOne({
      reportedBy: user._id,
      targetType: data.targetType,
      targetId: data.targetId,
      status: 'pending',
    });
    if (existingReport) {
      throw ApiError.conflict('You already have a pending report on this item');
    }

    const report = await Report.create({ ...data, reportedBy: user._id });
    await ActivityLogService.log(data.reportedBy, 'report_submitted', 'report', (report._id as any).toString(), {
      targetType: data.targetType,
      targetId: data.targetId,
    });
    return report;
  }

  /**
   * Get reports by current user
   */
  static async getMyReports(userId: string, { page, limit }: PaginationParams) {
    // Look up the user's ObjectId from their uid
    const user = await User.findOne({ uid: userId }).select('_id');
    if (!user) throw ApiError.notFound('User not found');
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Report.find({ reportedBy: user._id })
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments({ reportedBy: user._id }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get all reports (admin only).
   * Finding 8.2 — status is now validated through Zod before reaching here.
   */
  static async getAll({ page, limit }: PaginationParams, status?: string) {
    const skip = (page - 1) * limit;
    const filter = status ? { status } : {};
    const [data, total] = await Promise.all([
      Report.find(filter)
        .select('-__v')
        .populate('reportedBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Update report status (admin only)
   */
  static async updateStatus(
    reportId: string,
    status: 'reviewed' | 'dismissed',
    reviewedByUid: string
  ): Promise<IReport> {
    // Look up the admin's ObjectId from their uid
    const user = await User.findOne({ uid: reviewedByUid }).select('_id');
    if (!user) throw ApiError.notFound('User not found');
    const report = await Report.findByIdAndUpdate(
      reportId,
      { status, reviewedBy: user._id },
      { new: true, runValidators: true }
    );
    if (!report) throw ApiError.notFound('Report not found');
    const action = status === 'reviewed' ? 'report_reviewed' : 'report_dismissed';
    await ActivityLogService.log(reviewedByUid, action, 'report', reportId, { status });
    return report;
  }
}

export default ReportService;
