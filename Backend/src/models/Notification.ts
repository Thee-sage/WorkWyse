import mongoose, { Document, Schema } from 'mongoose';

// ─── Interfaces ──────────────────────────────────────────────────────

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type:
    | 'job_created'
    | 'report_reviewed'
    | 'evidence_uploaded'
    | 'vote_received'
    | 'comment_added'
    | 'role_changed'
    | 'employer_replied';
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'job_created',
        'report_reviewed',
        'evidence_uploaded',
        'vote_received',
        'comment_added',
        'role_changed',
        'employer_replied',
      ],
      required: true,
    },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ─── Indexes ─────────────────────────────────────────────────────────

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });

// ─── Model ───────────────────────────────────────────────────────────

export default mongoose.model<INotification>('Notification', NotificationSchema);
