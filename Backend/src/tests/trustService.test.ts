import TrustService from '../services/TrustService';

describe('TrustService', () => {
  describe('calculateJobTrust', () => {
    it('should return baseline 50 for a job with no votes, evidence, or verification', () => {
      const score = TrustService.calculateJobTrust({
        upvotes: 0,
        downvotes: 0,
        evidence: [],
        hasEvidence: false,
        verificationStatus: 'none',
      });
      expect(score).toBe(50);
    });

    it('should increase score with evidence items (+5 per item, max +15)', () => {
      const score = TrustService.calculateJobTrust({
        upvotes: 0,
        downvotes: 0,
        evidence: [
          { type: 'text', value: 'note 1' },
          { type: 'url', value: 'https://example.com' },
        ],
        hasEvidence: true,
        verificationStatus: 'none',
      });
      // 50 baseline + 10 (2 items × 5)
      expect(score).toBe(60);
    });

    it('should cap evidence bonus at +15 (3 items)', () => {
      const score = TrustService.calculateJobTrust({
        upvotes: 0,
        downvotes: 0,
        evidence: [
          { type: 'text', value: 'a' },
          { type: 'text', value: 'b' },
          { type: 'text', value: 'c' },
          { type: 'text', value: 'd' },
          { type: 'text', value: 'e' },
        ],
        hasEvidence: true,
        verificationStatus: 'none',
      });
      // 50 baseline + 15 (capped)
      expect(score).toBe(65);
    });

    it('should add +5 bonus for image evidence', () => {
      const score = TrustService.calculateJobTrust({
        upvotes: 0,
        downvotes: 0,
        evidence: [
          { type: 'image', value: 'https://example.com/photo.jpg' },
        ],
        hasEvidence: true,
        verificationStatus: 'none',
      });
      // 50 baseline + 5 (1 item) + 5 (image bonus)
      expect(score).toBe(60);
    });

    it('should add +10 for verified status', () => {
      const score = TrustService.calculateJobTrust({
        upvotes: 0,
        downvotes: 0,
        evidence: [],
        hasEvidence: false,
        verificationStatus: 'verified',
      });
      // 50 + 10
      expect(score).toBe(60);
    });

    it('should factor in vote ratio', () => {
      const scoreGood = TrustService.calculateJobTrust({
        upvotes: 10,
        downvotes: 0,
        evidence: [],
        hasEvidence: false,
        verificationStatus: 'none',
      });
      // 50 + round((1.0 - 0.5) * 60) = 50 + 30 = 80
      expect(scoreGood).toBe(80);

      const scoreBad = TrustService.calculateJobTrust({
        upvotes: 0,
        downvotes: 10,
        evidence: [],
        hasEvidence: false,
        verificationStatus: 'none',
      });
      // 50 + round((0.0 - 0.5) * 60) = 50 - 30 = 20
      expect(scoreBad).toBe(20);
    });

    it('should cap the score at 100', () => {
      const score = TrustService.calculateJobTrust({
        upvotes: 100,
        downvotes: 0,
        evidence: [
          { type: 'image', value: 'https://example.com/1.jpg' },
          { type: 'image', value: 'https://example.com/2.jpg' },
          { type: 'image', value: 'https://example.com/3.jpg' },
          { type: 'text', value: 'lots of proof' },
        ],
        hasEvidence: true,
        verificationStatus: 'verified',
      });
      // Would exceed 100 but is clamped
      expect(score).toBe(100);
    });

    it('should floor the score at 0', () => {
      const score = TrustService.calculateJobTrust({
        upvotes: 0,
        downvotes: 100,
        evidence: [],
        hasEvidence: false,
        verificationStatus: 'none',
      });
      // 50 - 30 = 20, not below 0
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBe(20);
    });

    it('should combine all factors correctly', () => {
      const score = TrustService.calculateJobTrust({
        upvotes: 8,
        downvotes: 2,
        evidence: [
          { type: 'image', value: 'https://example.com/screenshot.png' },
          { type: 'url', value: 'https://linkedin.com/jobs/1234' },
        ],
        hasEvidence: true,
        verificationStatus: 'verified',
      });
      // 50 + round((0.8 - 0.5) * 60) + 10 + 5 + 10
      // = 50 + 18 + 10 + 5 + 10 = 93
      expect(score).toBe(93);
    });
  });
});
