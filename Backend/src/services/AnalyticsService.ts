import { Job } from '../models/Job';
import Report from '../models/Report';
import User from '../models/User';
import logger from '../config/logger';

interface DashboardStats {
  jobs: {
    total: number;
    fake: number;
    real: number;
    withEvidence: number;
    verified: number;
  };
  reports: {
    total: number;
    pending: number;
    reviewed: number;
    dismissed: number;
  };
  users: {
    total: number;
    admins: number;
  };
  topCompanies: Array<{ _id: string; count: number }>;
}

interface TrendPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface PublicStats {
  listingsTracked: number;
  recordsWithAccount: number;
  evidencePublished: number;
  employerResponses: number;
  companiesTracked: number;
}

class AnalyticsService {
  /**
   * Public platform-wide stats for the Home page ("the platform so far").
   * Deliberately narrower than the admin dashboard — no user counts.
   */
  static async getPublicStats(): Promise<PublicStats> {
    const [listingsTracked, recordsWithAccount, evidenceAgg, employerResponses, companiesTracked] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ 'reviews.0': { $exists: true } }),
      Job.aggregate([{ $project: { count: { $size: '$evidence' } } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
      Report.countDocuments({ employerReply: { $exists: true } }),
      Job.distinct('company').then((names) => names.length),
    ]);
    return {
      listingsTracked,
      recordsWithAccount,
      evidencePublished: evidenceAgg[0]?.total ?? 0,
      employerResponses,
      companiesTracked,
    };
  }

  /**
   * Returns aggregate stats for the admin dashboard.
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalJobs,
      fakeJobs,
      jobsWithEvidence,
      verifiedJobs,
      pendingReports,
      reviewedReports,
      dismissedReports,
      totalUsers,
      adminUsers,
      topCompanies,
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ isFake: true }),
      Job.countDocuments({ hasEvidence: true }),
      Job.countDocuments({ verificationStatus: 'verified' }),
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'reviewed' }),
      Report.countDocuments({ status: 'dismissed' }),
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      Job.aggregate([
        { $group: { _id: '$company', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    return {
      jobs: {
        total: totalJobs,
        fake: fakeJobs,
        real: totalJobs - fakeJobs,
        withEvidence: jobsWithEvidence,
        verified: verifiedJobs,
      },
      reports: {
        total: pendingReports + reviewedReports + dismissedReports,
        pending: pendingReports,
        reviewed: reviewedReports,
        dismissed: dismissedReports,
      },
      users: {
        total: totalUsers,
        admins: adminUsers,
      },
      topCompanies,
    };
  }

  /**
   * Returns daily job submission counts for the last N days (default 30).
   */
  static async getJobTrend(days = 30): Promise<TrendPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await Job.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in days with zero submissions
    const map = new Map<string, number>(results.map((r) => [r._id, r.count]));
    const trend: TrendPoint[] = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trend.push({ date: key, count: map.get(key) ?? 0 });
    }

    return trend;
  }

  /**
   * Returns daily report submission counts for the last N days.
   */
  static async getReportTrend(days = 30): Promise<TrendPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await Report.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const map = new Map<string, number>(results.map((r) => [r._id, r.count]));
    const trend: TrendPoint[] = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trend.push({ date: key, count: map.get(key) ?? 0 });
    }

    return trend;
  }
}

export default AnalyticsService;
