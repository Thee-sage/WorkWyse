import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  reportedBy: mongoose.Types.ObjectId;
  targetType: 'job' | 'company';
  targetId: mongoose.Types.ObjectId;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['job', 'company'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ReportSchema.index({ targetType: 1, targetId: 1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ reportedBy: 1 });
// Finding 3.2 — duplicate report prevention efficiency
ReportSchema.index({ reportedBy: 1, targetType: 1, targetId: 1, status: 1 });

export default mongoose.model<IReport>('Report', ReportSchema);
