import mongoose, { Document, Schema } from 'mongoose';

// ─── Interfaces ─────────────────────────────────────────────────────
// A "company account" — someone describing what a company is like,
// attached to the company as a whole rather than one listing. Mirrors
// the shape of Job.reviews (see models/Job.ts).

export interface ICompanyReview extends Document {
  companyId: mongoose.Types.ObjectId;
  author: string;
  authorUid?: string;
  comment: string;
  stage?: 'applied' | 'interviewed' | 'offered' | 'worked_here';
  outcome?: 'no_response' | 'rejected' | 'on_hold' | 'hired';
  createdAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────────

const CompanyReviewSchema = new Schema<ICompanyReview>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    author: { type: String, required: true, trim: true },
    authorUid: { type: String },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
    stage: { type: String, enum: ['applied', 'interviewed', 'offered', 'worked_here'] },
    outcome: { type: String, enum: ['no_response', 'rejected', 'on_hold', 'hired'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ─── Indexes ────────────────────────────────────────────────────────

CompanyReviewSchema.index({ companyId: 1, createdAt: -1 });
CompanyReviewSchema.index({ companyId: 1, authorUid: 1 });

// ─── Model ──────────────────────────────────────────────────────────

export default mongoose.model<ICompanyReview>('CompanyReview', CompanyReviewSchema);
