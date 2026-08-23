import mongoose, { Document, Schema } from 'mongoose';

// ─── Types ──────────────────────────────────────────────────────────

export type ActivityAction =
  | 'job_created'
  | 'job_updated'
  | 'job_deleted'
  | 'review_added'
  | 'review_deleted'
  | 'evidence_uploaded'
  | 'evidence_verified'
  | 'evidence_redacted'
  | 'url_checked'
  | 'company_review_added'
  | 'watch_added'
  | 'watch_removed'
  | 'employer_replied'
  | 'report_submitted'
  | 'report_reviewed'
  | 'report_dismissed'
  | 'vote_cast'
  | 'vote_removed'
  | 'comment_added'
  | 'comment_deleted'
  | 'role_changed';

export type ActivityTargetType = 'job' | 'company' | 'report' | 'user';

export interface IActivityLog extends Document {
  // Absent for automated/system entries (e.g. a URL liveness check) — those
  // aren't attributable to any one user, so actorUsername is 'SYSTEM' instead.
  actorId?: mongoose.Types.ObjectId;
  actorUsername: string;
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId: mongoose.Types.ObjectId;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────────

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorUsername: { type: String, required: true },
    action: {
      type: String,
      enum: [
        'job_created', 'job_updated', 'job_deleted',
        'review_added', 'review_deleted',
        'evidence_uploaded', 'evidence_verified', 'evidence_redacted',
        'url_checked', 'company_review_added', 'watch_added', 'watch_removed',
        'employer_replied',
        'report_submitted', 'report_reviewed', 'report_dismissed',
        'vote_cast', 'vote_removed',
        'comment_added', 'comment_deleted',
        'role_changed',
      ],
      required: true,
    },
    targetType: {
      type: String,
      enum: ['job', 'company', 'report', 'user'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────

ActivityLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
ActivityLogSchema.index({ actorId: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1 });
ActivityLogSchema.index({ createdAt: -1 });

// ─── Model ──────────────────────────────────────────────────────────

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
