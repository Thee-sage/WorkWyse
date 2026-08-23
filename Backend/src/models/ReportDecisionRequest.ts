import mongoose, { Document, Schema } from 'mongoose';

/**
 * A moderator's proposed decision on a report, pending admin approval.
 *
 * Moderators no longer decide a report's outcome directly (see
 * ReportController/ReportService — the route that used to do that now
 * creates one of these instead). This is the record of that proposal: who
 * requested what, why, and — once an admin acts on it — who approved or
 * rejected it and when. Approving one is what actually flips the
 * underlying Report's status; rejecting one leaves the report untouched.
 */
export interface IReportDecisionRequest extends Document {
  reportId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId; // the moderator
  proposedStatus: 'reviewed' | 'dismissed';
  note?: string; // moderator's reasoning, shown to the approving admin
  status: 'pending' | 'approved' | 'rejected';
  decidedBy?: mongoose.Types.ObjectId; // the approving/rejecting admin
  decidedAt?: Date;
  decisionNote?: string; // admin's reason, shown back to the moderator
  createdAt: Date;
}

const ReportDecisionRequestSchema = new Schema<IReportDecisionRequest>(
  {
    reportId: { type: Schema.Types.ObjectId, ref: 'Report', required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    proposedStatus: { type: String, enum: ['reviewed', 'dismissed'], required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    decisionNote: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ReportDecisionRequestSchema.index({ status: 1, createdAt: -1 });
ReportDecisionRequestSchema.index({ requestedBy: 1, createdAt: -1 });
// One request per report at a time — a moderator can't queue several
// competing proposals for the same report while one is still pending.
ReportDecisionRequestSchema.index(
  { reportId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.models.ReportDecisionRequest ||
  mongoose.model<IReportDecisionRequest>('ReportDecisionRequest', ReportDecisionRequestSchema);
