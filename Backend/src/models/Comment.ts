import mongoose, { Document, Schema } from 'mongoose';

// ─── Interfaces ──────────────────────────────────────────────────────

export interface IComment extends Document {
  jobId: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  authorUsername: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────

const CommentSchema = new Schema<IComment>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorUsername: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────

CommentSchema.index({ jobId: 1, createdAt: -1 });
CommentSchema.index({ author: 1 });

// ─── Model ───────────────────────────────────────────────────────────

export default mongoose.model<IComment>('Comment', CommentSchema);
