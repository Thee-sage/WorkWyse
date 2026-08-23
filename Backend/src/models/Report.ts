import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployerReply {
  text: string;
  respondedAt: Date;
  // There is no self-serve employer login in this pass — a moderator enters
  // a reply on the employer's behalf after verifying contact out of band.
  enteredBy: string; // moderator/admin username
}

export interface IReport extends Document {
  reportedBy: mongoose.Types.ObjectId;
  targetType: 'job' | 'company';
  targetId: mongoose.Types.ObjectId;
  // Points at a specific Job.reviews or Job.evidence subdocument this
  // challenge disputes, when the report is a "challenge" on one item
  // rather than the whole record.
  targetSubId?: mongoose.Types.ObjectId;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewedBy?: mongoose.Types.ObjectId;
  employerReply?: IEmployerReply;
  createdAt: Date;
  updatedAt: Date;
}

const employerReplySchema = new Schema<IEmployerReply>(
  {
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    respondedAt: { type: Date, required: true },
    enteredBy: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ReportSchema = new Schema<IReport>(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['job', 'company'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetSubId: { type: Schema.Types.ObjectId },
    reason: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    employerReply: { type: employerReplySchema, default: undefined },
  },
  { timestamps: true }
);

ReportSchema.index({ targetType: 1, targetId: 1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ reportedBy: 1 });
// Finding 3.2 — duplicate report prevention efficiency
ReportSchema.index({ reportedBy: 1, targetType: 1, targetId: 1, status: 1 });

export default mongoose.model<IReport>('Report', ReportSchema);
