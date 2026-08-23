import { Job } from '../models/Job';
import Report from '../models/Report';
import User from '../models/User';

export interface ContributorStats {
  username: string;
  accountsFiled: number;
  evidenceFiled: number;
  evidenceVerified: number;
  challengesFiled: number;
  disputesUpheldAgainst: number;
  contributions: number;
  tier: 1 | 2 | 3;
  accountAgeDays: number;
}

/**
 * Centralized trust score calculation.
 * Produces a 0–100 integer based on votes, evidence, and verification status.
 */
class TrustService {
  /**
   * Aggregate a contributor's standing across accounts (reviews), evidence,
   * and challenges. Tiers reflect how much of what someone files holds up —
   * documented thresholds below, not how much they post.
   */
  static async getContributorStats(username: string): Promise<ContributorStats> {
    const user = await User.findOne({ username: username.toLowerCase() }).select('_id uid createdAt');

    const [accountsFiled, evidenceAgg, challengesFiled] = await Promise.all([
      Job.countDocuments({ 'reviews.author': username }),
      Job.aggregate([
        { $unwind: '$evidence' },
        { $match: { 'evidence.addedBy': username } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            verified: { $sum: { $cond: [{ $eq: ['$evidence.status', 'verified'] }, 1, 0] } },
          },
        },
      ]),
      user ? Report.countDocuments({ reportedBy: user._id }) : 0,
    ]);

    // "Disputes upheld against you" would need a challenge to record exactly
    // whose review/evidence it targeted and a moderator decision that redacted
    // or removed that specific item — evidence redaction already carries a
    // moderator decision (see JobService.updateEvidenceStatus), but tracing it
    // back to "upheld against this author" isn't wired up yet, so this is
    // deliberately reported as 0 (an honest gap) rather than estimated.
    const disputesUpheldAgainst = 0;

    const evidenceFiled = evidenceAgg[0]?.total ?? 0;
    const evidenceVerified = evidenceAgg[0]?.verified ?? 0;
    const contributions = accountsFiled + evidenceFiled + challengesFiled;

    let tier: 1 | 2 | 3 = 1;
    if (contributions >= 20 || evidenceVerified >= 5) tier = 3;
    else if (contributions >= 5 || evidenceVerified >= 1) tier = 2;

    const accountAgeDays = user
      ? Math.max(0, Math.floor((Date.now() - new Date((user as any).createdAt).getTime()) / 86400000))
      : 0;

    return {
      username,
      accountsFiled,
      evidenceFiled,
      evidenceVerified,
      challengesFiled,
      disputesUpheldAgainst,
      contributions,
      tier,
      accountAgeDays,
    };
  }

  /**
   * Calculate trust score for a job.
   *
   * Scoring breakdown:
   *   - Baseline: 50
   *   - Vote ratio: ±30 max
   *   - Evidence: +5 per item (max +15)
   *   - Image evidence bonus: +5 (if at least one image)
   *   - Verification status: +10 for verified
   *
   * Total range: 0–100 (clamped)
   */
  static calculateJobTrust(job: {
    upvotes: number;
    downvotes: number;
    evidence?: { type: string; value: string }[];
    hasEvidence?: boolean;
    verificationStatus?: string;
  }): number {
    let score = 50; // baseline

    // ── Vote contribution (±30 max) ───────────────────────────────
    const totalVotes = job.upvotes + job.downvotes;
    if (totalVotes > 0) {
      const voteRatio = job.upvotes / totalVotes;
      score += Math.round((voteRatio - 0.5) * 60);
    }

    // ── Evidence bonus (+5 per item, max +15) ─────────────────────
    const evidenceItems = job.evidence ?? [];
    if (job.hasEvidence || evidenceItems.length > 0) {
      score += Math.min(evidenceItems.length * 5, 15);
    }

    // ── Image evidence extra bonus (+5 if at least one image) ─────
    if (evidenceItems.some(e => e.type === 'image')) {
      score += 5;
    }

    // ── Verification bonus (+10 for verified) ─────────────────────
    if (job.verificationStatus === 'verified') {
      score += 10;
    }

    // Clamp to 0–100
    return Math.max(0, Math.min(100, score));
  }
}

export default TrustService;
