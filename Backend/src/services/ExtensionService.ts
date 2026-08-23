import { Job } from '../models/Job';
import Company from '../models/Company';
import Report from '../models/Report';
import TrustService from './TrustService';
import { escapeRegex } from './JobService';

/**
 * Backs the future WorkWyse browser extension: "the user is looking at a
 * job listing on some other site, tell them what WorkWyse knows about it."
 *
 * Deliberately separate from JobService/JobController. The web app's
 * equivalents (getRecord, getJobsByCompany) return everything a logged-in
 * visitor viewing a full record page is entitled to — submitter identity
 * (unless private), full report threads, moderation history. None of that
 * belongs in a payload built for an anonymous extension popup, so this
 * module hand-picks a narrow, public-safe projection rather than reusing
 * those methods and trying to strip fields after the fact, which is the
 * pattern that leaks a field when someone adds a new one later.
 *
 * No user-identifying data is ever included: no usernames, no submitter
 * uid, no email, no per-user vote state, no report contents.
 */

export type ListingStatus = 'known' | 'unknown';

export interface ListingLookupResult {
  status: ListingStatus;
  listing?: {
    jobId: string;
    title: string;
    company: string;
    location: string;
    trustScore: number;
    isFake: boolean;
    verificationStatus: 'verified' | 'unverified' | 'none';
    evidenceCount: number;
    reviewCount: number;
    upvotes: number;
    downvotes: number;
    openChallenges: number;
    urlLastCheckedOk: boolean | null;
    workwyseUrl: string;
  };
  company?: {
    companyId: string;
    name: string;
    openReportsCount: number;
  };
}

class ExtensionService {
  /**
   * Normalises a URL for matching: strips protocol/www, trailing slash,
   * and tracking query params, so
   * "https://www.acme.com/careers/123?utm_source=li" and
   * "http://acme.com/careers/123" are recognised as the same posting.
   */
  private static canonicalizeUrl(raw: string): string {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return raw.trim().toLowerCase();
    }

    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const path = url.pathname.replace(/\/+$/, '');
    return `${host}${path}`.toLowerCase();
  }

  /**
   * Look up what WorkWyse knows about a job listing URL.
   *
   * Matching strategy, cheapest first:
   *   1. Exact jobUrl match (indexed-equivalent via the canonical string).
   *   2. Canonicalised match against stored URLs sharing the same host,
   *      to catch protocol/www/query-string differences.
   * No cross-collection full scan — this must stay fast enough to run on
   * every popup open.
   */
  static async lookupByUrl(rawUrl: string): Promise<ListingLookupResult> {
    const canonical = this.canonicalizeUrl(rawUrl);

    let job = await Job.findOne({ jobUrl: rawUrl }).select(
      '_id title company location upvotes downvotes evidence reviews hasEvidence verificationStatus isFake urlCheck jobUrl'
    );

    if (!job) {
      let host: string;
      try {
        host = new URL(rawUrl).hostname.replace(/^www\./, '');
      } catch {
        host = '';
      }

      if (host) {
        // Bounded scan of same-host listings only, not the whole
        // collection — hostname is not indexed on its own, but this is a
        // small slice in practice and capped regardless.
        const candidates = await Job.find({ jobUrl: new RegExp(escapeRegex(host), 'i') })
          .select('_id title company location upvotes downvotes evidence reviews hasEvidence verificationStatus isFake urlCheck jobUrl')
          .limit(200);

        job = candidates.find((c) => this.canonicalizeUrl(c.jobUrl) === canonical) ?? null;
      }
    }

    if (!job) {
      return { status: 'unknown' };
    }

    const jobId = (job._id as any).toString();

    const [openChallenges, company] = await Promise.all([
      Report.countDocuments({ targetType: 'job', targetId: job._id, status: 'pending' }),
      Company.findOne({ name: new RegExp(`^${escapeRegex(job.company)}$`, 'i') }).select('_id name'),
    ]);

    let companySummary: ListingLookupResult['company'];
    if (company) {
      const companyJobIds = await Job.find({ company: new RegExp(`^${escapeRegex(job.company)}$`, 'i') }).select('_id');
      const openReportsCount = await Report.countDocuments({
        targetType: 'job',
        targetId: { $in: companyJobIds.map((j) => j._id) },
        status: 'pending',
      });
      companySummary = {
        companyId: (company._id as any).toString(),
        name: company.name,
        openReportsCount,
      };
    }

    return {
      status: 'known',
      listing: {
        jobId,
        title: job.title,
        company: job.company,
        location: job.location,
        trustScore: TrustService.calculateJobTrust(job as any),
        isFake: job.isFake,
        verificationStatus: job.verificationStatus,
        evidenceCount: job.evidence?.length ?? 0,
        reviewCount: job.reviews?.length ?? 0,
        upvotes: job.upvotes,
        downvotes: job.downvotes,
        openChallenges,
        urlLastCheckedOk: job.urlCheck?.ok ?? null,
        workwyseUrl: `/registry/${jobId}`,
      },
      company: companySummary,
    };
  }
}

export default ExtensionService;
