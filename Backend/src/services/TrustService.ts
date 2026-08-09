import { IJob } from '../models/Job';

/**
 * Centralized trust score calculation.
 * Produces a 0–100 integer based on votes, evidence, and verification status.
 */
class TrustService {
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
