import mongoose, { Document, Schema } from 'mongoose';

// ─── Interfaces ─────────────────────────────────────────────────────

export interface IEvidence {
  type: 'image' | 'url' | 'text';
  value: string;
}

export interface IReview extends Document {
  jobId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  author: string;
  createdAt: Date;
}

export interface IVote extends Document {
  jobId: mongoose.Types.ObjectId;
  userId: string;
  voteType: 'upvote' | 'downvote';
  createdAt: Date;
}

export interface IJob extends Document {
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  description: string;
  jobDescription?: string;
  isFake: boolean;
  upvotes: number;
  downvotes: number;
  submittedBy?: mongoose.Types.ObjectId;
  verificationStatus: 'verified' | 'unverified' | 'none';
  verificationConfidence: 'low' | 'medium' | 'high' | null;
  verificationSource: 'linkedin' | 'indeed' | 'external' | null;
  evidence: IEvidence[];
  hasEvidence: boolean;
  reviews: IReview[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schemas ────────────────────────────────────────────────────────

const evidenceSchema = new Schema(
  {
    type: { type: String, enum: ['image', 'url', 'text'], required: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const reviewSchema = new Schema<IReview>({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const voteSchema = new Schema<IVote>({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  userId: { type: String, required: true },
  voteType: { type: String, enum: ['upvote', 'downvote'], required: true },
  createdAt: { type: Date, default: Date.now },
});

const jobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    jobUrl: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    jobDescription: { type: String, trim: true, default: '' },
    isFake: { type: Boolean, default: false },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verificationStatus: {
      type: String,
      enum: ['verified', 'unverified', 'none'],
      default: 'none',
    },
    verificationConfidence: {
      type: String,
      enum: ['low', 'medium', 'high', null],
      default: null,
    },
    verificationSource: {
      type: String,
      enum: ['linkedin', 'indeed', 'external', null],
      default: null,
    },
    evidence: {
      type: [evidenceSchema],
      default: [],
      validate: [
        (val: any[]) => val.length <= 5,
        'Maximum 5 evidence items allowed',
      ],
    },
    hasEvidence: { type: Boolean, default: false },
    reviews: [reviewSchema],
  },
  { timestamps: true }
);

// Auto-set hasEvidence before save
jobSchema.pre('save', function (next) {
  this.hasEvidence = this.evidence != null && this.evidence.length > 0;
  next();
});

// ─── Indexes ────────────────────────────────────────────────────────

jobSchema.index({ company: 1 });
jobSchema.index({ isFake: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ hasEvidence: 1 });
// Finding 11.1 — ownership queries (updateJob, deleteJob)
jobSchema.index({ submittedBy: 1 });
voteSchema.index({ jobId: 1, userId: 1 }, { unique: true });
// Finding 9.1 — duplicate review prevention efficiency
reviewSchema.index({ jobId: 1, author: 1 });

// ─── Models ─────────────────────────────────────────────────────────

export const Job = mongoose.model<IJob>('Job', jobSchema);
export const Review = mongoose.model<IReview>('Review', reviewSchema);
export const Vote = mongoose.model<IVote>('Vote', voteSchema);