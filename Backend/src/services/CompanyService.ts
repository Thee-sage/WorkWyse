import Company, { ICompany } from '../models/Company';
import CompanyReview, { ICompanyReview } from '../models/CompanyReview';
import { Job } from '../models/Job';
import Report from '../models/Report';
import User from '../models/User';
import { ApiError } from '../utils/ApiError';
import ActivityLogService from './ActivityLogService';

interface PaginationParams {
  page: number;
  limit: number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class CompanyService {
  static async getAll({ page, limit }: PaginationParams) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Company.find().select('-__v').sort({ name: 1 }).skip(skip).limit(limit),
      Company.countDocuments(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id: string): Promise<ICompany> {
    const company = await Company.findById(id).select('-__v');
    if (!company) throw ApiError.notFound('Company not found');
    return company;
  }

  static async create(data: {
    name: string;
    website?: string;
    description?: string;
    industry?: string;
  }): Promise<ICompany> {
    const existing = await Company.findOne({ name: data.name });
    if (existing) throw ApiError.conflict('Company already exists');
    return await Company.create(data);
  }

  // Finding 10.1 — explicit field picking to prevent mass assignment
  static async update(id: string, data: {
    name?: string;
    website?: string;
    description?: string;
    industry?: string;
  }): Promise<ICompany> {
    // Only pick fields that admins are allowed to update
    const safeUpdate: Record<string, unknown> = {};
    if (data.name !== undefined) safeUpdate.name = data.name;
    if (data.website !== undefined) safeUpdate.website = data.website;
    if (data.description !== undefined) safeUpdate.description = data.description;
    if (data.industry !== undefined) safeUpdate.industry = data.industry;
    // averageRating and totalReports are NEVER set via this endpoint

    const company = await Company.findByIdAndUpdate(id, safeUpdate, { new: true, runValidators: true });
    if (!company) throw ApiError.notFound('Company not found');
    return company;
  }

  static async remove(id: string) {
    const company = await Company.findByIdAndDelete(id);
    if (!company) throw ApiError.notFound('Company not found');
  }

  /**
   * Jobs only ever store a company as a free-text name — there is no
   * required admin step to "register" an employer before it gets a company
   * record. This resolves (or transparently creates a bare) Company
   * document for a given name so every employer mentioned in a listing is
   * reachable as a company profile, not gated behind admin CRUD.
   */
  static async resolveByName(name: string): Promise<ICompany> {
    const trimmed = name.trim();
    if (!trimmed) throw ApiError.badRequest('Company name is required');
    const nameRe = new RegExp(`^${escapeRegex(trimmed)}$`, 'i');
    let company = await Company.findOne({ name: nameRe });
    if (!company) {
      try {
        company = await Company.create({ name: trimmed });
      } catch (err: any) {
        // Duplicate key race — another request created it first; fetch that one.
        if (err?.code === 11000) {
          company = await Company.findOne({ name: nameRe });
        }
        if (!company) throw err;
      }
    }
    return company;
  }

  // ── "What people said" — company-level accounts ───────────────────

  static async getReviews(companyId: string, { page, limit }: PaginationParams) {
    const company = await Company.findById(companyId).select('_id');
    if (!company) throw ApiError.notFound('Company not found');
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      CompanyReview.find({ companyId }).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-__v'),
      CompanyReview.countDocuments({ companyId }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async addReview(
    companyId: string,
    data: {
      comment: string;
      stage?: 'applied' | 'interviewed' | 'offered' | 'worked_here';
      outcome?: 'no_response' | 'rejected' | 'on_hold' | 'hired';
    },
    authorUid: string
  ): Promise<ICompanyReview> {
    const company = await Company.findById(companyId).select('_id');
    if (!company) throw ApiError.notFound('Company not found');
    const user = await User.findOne({ uid: authorUid }).select('username');
    if (!user) throw ApiError.notFound('User not found');

    const review = await CompanyReview.create({
      companyId,
      author: user.username,
      authorUid,
      comment: data.comment,
      stage: data.stage,
      outcome: data.outcome,
    });
    await ActivityLogService.log(authorUid, 'company_review_added', 'company', companyId, {
      reviewId: (review._id as any).toString(),
    });
    return review;
  }

  // ── Accumulated record + patterns over time ────────────────────────

  /**
   * Real aggregate stats for a company's masthead panel — built from its
   * jobs, reports, and reviews, not stored/duplicated data.
   */
  static async getStats(companyId: string) {
    const company = await Company.findById(companyId);
    if (!company) throw ApiError.notFound('Company not found');

    const nameRe = new RegExp(`^${escapeRegex(company.name)}$`, 'i');
    const jobs = await Job.find({ company: nameRe }).select('reviews evidence createdAt urlCheck');
    const jobIds = jobs.map((j) => j._id);

    const [openReports, employerReplies, reviewsCount] = await Promise.all([
      Report.countDocuments({ targetType: 'job', targetId: { $in: jobIds }, status: 'pending' }),
      Report.countDocuments({ targetType: 'job', targetId: { $in: jobIds }, employerReply: { $exists: true } }),
      CompanyReview.countDocuments({ companyId }),
    ]);

    const stillPosted = jobs.filter((j) => !j.urlCheck || j.urlCheck.ok).length;
    const firstHandAccounts = jobs.reduce((n, j) => n + j.reviews.length, 0);
    const evidenceItems = jobs.reduce((n, j) => n + j.evidence.length, 0);
    const confirmedHires = jobs.reduce((n, j) => n + j.reviews.filter((r) => r.outcome === 'hired').length, 0);

    return {
      listingsTracked: jobs.length,
      stillPosted,
      openReports,
      firstHandAccounts,
      evidenceItems,
      confirmedHires,
      employerReplies,
      companyReviews: reviewsCount,
    };
  }

  /**
   * Monthly counts for the "Patterns over time" tab — real numbers only, no
   * invented narrative captions.
   */
  static async getPatterns(companyId: string) {
    const company = await Company.findById(companyId);
    if (!company) throw ApiError.notFound('Company not found');
    const nameRe = new RegExp(`^${escapeRegex(company.name)}$`, 'i');
    const jobs = await Job.find({ company: nameRe }).select('createdAt evidence reviews');
    const jobIds = jobs.map((j) => j._id);
    const reports = await Report.find({ targetType: 'job', targetId: { $in: jobIds } }).select('createdAt');

    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const months = new Map<string, { postings: number; reports: number; evidence: number }>();
    const touch = (key: string) => {
      if (!months.has(key)) months.set(key, { postings: 0, reports: 0, evidence: 0 });
      return months.get(key)!;
    };
    for (const j of jobs) {
      const key = monthKey(new Date(j.createdAt));
      touch(key).postings += 1;
      touch(key).evidence += j.evidence.length;
    }
    for (const r of reports) {
      touch(monthKey(new Date(r.createdAt))).reports += 1;
    }

    return Array.from(months.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, v]) => ({ month, ...v }));
  }
}

export default CompanyService;
