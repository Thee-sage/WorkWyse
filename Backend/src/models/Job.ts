import mongoose, { Document, Schema } from 'mongoose';

// Job Interface
export interface IJob extends Document {
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  description: string;
  isFake: boolean;
  upvotes: number;
  downvotes: number;
  reviews: IReview[];
  createdAt: Date;
  updatedAt: Date;
}

// Review Interface
export interface IReview extends Document {
  jobId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  author: string;
  createdAt: Date;
}

// Vote Interface
export interface IVote extends Document {
  jobId: mongoose.Types.ObjectId;
  userId: string;
  voteType: 'upvote' | 'downvote';
  createdAt: Date;
}

// Review Schema
const reviewSchema = new Schema<IReview>({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Vote Schema
const voteSchema = new Schema<IVote>({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  voteType: {
    type: String,
    enum: ['upvote', 'downvote'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Job Schema
const jobSchema = new Schema<IJob>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  jobUrl: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  isFake: {
    type: Boolean,
    default: false
  },
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  },
  reviews: [reviewSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
jobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes for better performance
jobSchema.index({ company: 1 });
jobSchema.index({ isFake: 1 });
jobSchema.index({ createdAt: -1 });
voteSchema.index({ jobId: 1, userId: 1 }, { unique: true });

// Create models
export const Job = mongoose.model<IJob>('Job', jobSchema);
export const Review = mongoose.model<IReview>('Review', reviewSchema);
export const Vote = mongoose.model<IVote>('Vote', voteSchema); 