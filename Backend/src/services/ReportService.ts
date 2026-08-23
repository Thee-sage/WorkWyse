import Report, { IReport } from '../models/Report';
import ReportDecisionRequest, { IReportDecisionRequest } from '../models/ReportDecisionRequest';
import User from '../models/User';
import { Job } from '../models/Job';
import Company from '../models/Company';
import { ApiError } from '../utils/ApiError';
import ActivityLogService from './ActivityLogService';
import NotificationService from './NotificationService';
import logger from '../config/logger';

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
    targetSubId?: string;
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
  /**
   * Apply a decision directly to a report and notify the filer.
   *
   * Admin-only in practice (enforced at the route: see routes/reports.ts).
   * A moderator no longer reaches this directly — POST
   * /reports/:id/decision-requests below is their path, and this is what
   * runs once an admin approves that request. Kept as its own method
   * (rather than folded into approveDecisionRequest) because it's also
   * the method an admin's own direct override calls.
   */
  static async updateStatus(
    reportId: string,
    status: 'reviewed' | 'dismissed',
    decidedByUid: string
  ): Promise<IReport> {
    const user = await User.findOne({ uid: decidedByUid }).select('_id');
    if (!user) throw ApiError.notFound('User not found');
    const report = await Report.findByIdAndUpdate(
      reportId,
      { status, reviewedBy: user._id },
      { new: true, runValidators: true }
    );
    if (!report) throw ApiError.notFound('Report not found');
    const action = status === 'reviewed' ? 'report_reviewed' : 'report_dismissed';
    await ActivityLogService.log(decidedByUid, action, 'report', reportId, { status });

    // Notify the person who filed the challenge that it was decided.
    // ActivityLogService writes to the site-wide public feed only — it does
    // not reach the filer's personal inbox, which is what the notifications
    // page promises ("Someone disputes what you filed... a moderator acts
    // on your contribution").
    const filer = await User.findById(report.reportedBy).select('uid');
    if (filer) {
      const message =
        status === 'reviewed'
          ? 'A moderator reviewed the challenge you filed and acted on it.'
          : 'A moderator reviewed the challenge you filed and dismissed it.';
      const link = report.targetType === 'job' ? `/registry/${report.targetId}` : `/companies/${report.targetId}`;
      // 'report_dismissed' is not a distinct notification type in the
      // schema — the outcome is carried in the message text instead.
      await NotificationService.create(filer.uid, 'report_reviewed', message, link);
    }

    return report;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Moderator decision requests
  //
  // A moderator can no longer decide a report's outcome directly. Instead
  // they submit a proposed decision — one per calendar day — which sits
  // pending until an admin approves (applies it via updateStatus above) or
  // rejects it (leaves the report untouched). This is a deliberate human
  // checkpoint on the one action that was previously fully unilateral.
  // ─────────────────────────────────────────────────────────────────────

  private static readonly MAX_REQUESTS_PER_DAY = 1;

  /**
   * Submit a proposed decision on a report (moderator).
   * Rate-limited to one request per rolling 24h, counted across all of a
   * moderator's requests regardless of outcome — not per report.
   */
  static async requestDecision(
    reportId: string,
    proposedStatus: 'reviewed' | 'dismissed',
    note: string | undefined,
    requestedByUid: string
  ): Promise<IReportDecisionRequest> {
    const moderator = await User.findOne({ uid: requestedByUid }).select('_id');
    if (!moderator) throw ApiError.notFound('User not found');

    const report = await Report.findById(reportId).select('status');
    if (!report) throw ApiError.notFound('Report not found');
    if (report.status !== 'pending') {
      throw ApiError.conflict('This report has already been decided.');
    }

    const existingPending = await ReportDecisionRequest.findOne({ reportId, status: 'pending' });
    if (existingPending) {
      throw ApiError.conflict('A decision request for this report is already pending approval.');
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await ReportDecisionRequest.countDocuments({
      requestedBy: moderator._id,
      createdAt: { $gte: since },
    });
    if (recentCount >= this.MAX_REQUESTS_PER_DAY) {
      throw ApiError.tooMany(
        'You can submit one report decision request per day. Please try again later.'
      );
    }

    const request = await ReportDecisionRequest.create({
      reportId,
      requestedBy: moderator._id,
      proposedStatus,
      note,
    });

    logger.info('Report decision request submitted', {
      requestId: request._id,
      reportId,
      proposedStatus,
      requestedBy: requestedByUid,
    });

    // Every admin needs to see this queue exists — a per-user notification
    // (rather than only the admin-facing list endpoint) means it isn't
    // missed simply because no admin happens to open the moderation page.
    const admins = await User.find({ role: 'admin' }).select('uid');
    await Promise.all(
      admins.map((admin) =>
        NotificationService.create(
          admin.uid,
          'report_reviewed',
          `A moderator requested a decision on a report — awaiting your approval.`,
          `/moderation?queue=requests`
        )
      )
    );

    return request;
  }

  /** List decision requests (admin only), most recent first. */
  static async getDecisionRequests(
    status: 'pending' | 'approved' | 'rejected' | undefined,
    { page, limit }: PaginationParams
  ) {
    const filter = status ? { status } : {};
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      ReportDecisionRequest.find(filter)
        .populate('reportId')
        .populate('requestedBy', 'username')
        .populate('decidedBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ReportDecisionRequest.countDocuments(filter),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /** Approve a pending request — applies the proposed decision (admin only). */
  static async approveDecisionRequest(
    requestId: string,
    decisionNote: string | undefined,
    decidedByUid: string
  ): Promise<IReportDecisionRequest> {
    const admin = await User.findOne({ uid: decidedByUid }).select('_id');
    if (!admin) throw ApiError.notFound('User not found');

    const request = await ReportDecisionRequest.findById(requestId);
    if (!request) throw ApiError.notFound('Decision request not found');
    if (request.status !== 'pending') {
      throw ApiError.conflict('This request has already been decided.');
    }

    // Applies the moderator's proposed outcome and notifies the original
    // filer — same path a direct admin decision takes.
    await this.updateStatus(request.reportId.toString(), request.proposedStatus, decidedByUid);

    request.status = 'approved';
    request.decidedBy = admin._id as any;
    request.decidedAt = new Date();
    request.decisionNote = decisionNote;
    await request.save();

    const moderator = await User.findById(request.requestedBy).select('uid');
    if (moderator) {
      await NotificationService.create(
        moderator.uid,
        'report_reviewed',
        `Your decision request was approved — the report is now "${request.proposedStatus}".`,
        `/moderation`
      );
    }

    return request;
  }

  /** Reject a pending request — the report is left untouched (admin only). */
  static async rejectDecisionRequest(
    requestId: string,
    decisionNote: string | undefined,
    decidedByUid: string
  ): Promise<IReportDecisionRequest> {
    const admin = await User.findOne({ uid: decidedByUid }).select('_id');
    if (!admin) throw ApiError.notFound('User not found');

    const request = await ReportDecisionRequest.findById(requestId);
    if (!request) throw ApiError.notFound('Decision request not found');
    if (request.status !== 'pending') {
      throw ApiError.conflict('This request has already been decided.');
    }

    request.status = 'rejected';
    request.decidedBy = admin._id as any;
    request.decidedAt = new Date();
    request.decisionNote = decisionNote;
    await request.save();

    const moderator = await User.findById(request.requestedBy).select('uid');
    if (moderator) {
      await NotificationService.create(
        moderator.uid,
        'report_reviewed',
        `Your decision request was rejected.${decisionNote ? ` Reason: ${decisionNote}` : ''}`,
        `/moderation`
      );
    }

    return request;
  }

  /**
   * Right of reply — there's no self-serve employer login in this pass, so a
   * moderator/admin enters the reply after verifying the employer contact
   * out of band. Published unedited, clearly attributed to who entered it.
   */
  static async setEmployerReply(
    reportId: string,
    text: string,
    enteredByUid: string
  ): Promise<IReport> {
    const moderator = await User.findOne({ uid: enteredByUid }).select('username');
    if (!moderator) throw ApiError.notFound('User not found');

    const report = await Report.findByIdAndUpdate(
      reportId,
      { employerReply: { text, respondedAt: new Date(), enteredBy: moderator.username } },
      { new: true, runValidators: true }
    );
    if (!report) throw ApiError.notFound('Report not found');
    await ActivityLogService.log(enteredByUid, 'employer_replied', 'report', reportId);

    // Notify the filer directly — the public activity log entry above does
    // not reach a personal inbox, and an employer reply is exactly the kind
    // of event the notifications page tells users they'll hear about.
    const filer = await User.findById(report.reportedBy).select('uid');
    if (filer) {
      const link = report.targetType === 'job' ? `/registry/${report.targetId}` : `/companies/${report.targetId}`;
      await NotificationService.create(
        filer.uid,
        'employer_replied',
        'An employer replied on a challenge you filed.',
        link
      );
    }

    return report;
  }
}

export default ReportService;
