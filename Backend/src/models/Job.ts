import mongoose, { Document, Schema } from 'mongoose';

// ─── Interfaces ─────────────────────────────────────────────────────

export interface IEvidence {
  _id?: mongoose.Types.ObjectId;
  type: 'image' | 'url' | 'text';
  value: string;
  // Evidence verification workflow — a moderator confirms a document is what
  // it claims to be. This is never a ruling on whether the job itself is real.
  status: 'pending' | 'verified' | 'unverifiable' | 'redacted';
  note?: string;
  addedBy?: string; // username
  addedAt?: Date;
  verifiedBy?: string; // moderator username
  verifiedAt?: Date;
}

export interface IReview extends Document {
  jobId: mongoose.Types.ObjectId;
  rating?: number;
  comment: string;
  author: string;
  // First-hand-account structure (Q1/Q3/Q4 on a job record).
  stage?: 'applied' | 'interviewed' | 'offered';
  outcome?: 'no_response' | 'rejected' | 'on_hold' | 'hired';
  salaryQuoted?: string;
  createdAt: Date;
}

export interface IUrlCheck {
  checkedAt: Date;
  ok: boolean;
  statusCode?: number;
  consecutiveFailures: number;
  lastSuccessAt?: Date;
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
  urlCheck?: IUrlCheck;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schemas ────────────────────────────────────────────────────────

const evidenceSchema = new Schema(
  {
    type: { type: String, enum: ['image', 'url', 'text'], required: true },
    value: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'verified', 'unverifiable', 'redacted'],
      default: 'pending',
    },
    note: { type: String, trim: true, maxlength: 1000 },
    addedBy: { type: String, trim: true },
    addedAt: { type: Date, default: Date.now },
    verifiedBy: { type: String, trim: true },
    verifiedAt: { type: Date },
  },
  { _id: true }
);

const reviewSchema = new Schema<IReview>({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  stage: { type: String, enum: ['applied', 'interviewed', 'offered'] },
  outcome: { type: String, enum: ['no_response', 'rejected', 'on_hold', 'hired'] },
  salaryQuoted: { type: String, trim: true, maxlength: 100 },
  createdAt: { type: Date, default: Date.now },
});

const urlCheckSchema = new Schema<IUrlCheck>(
  {
    checkedAt: { type: Date, required: true },
    ok: { type: Boolean, required: true },
    statusCode: { type: Number },
    consecutiveFailures: { type: Number, default: 0 },
    lastSuccessAt: { type: Date },
  },
  { _id: false }
);

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
    urlCheck: { type: urlCheckSchema, default: undefined },
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