export interface User {
  username: string;
  uid: string;
  email: string;
  type: 'public' | 'private';
  role: 'user' | 'admin' | 'moderator';
  linkedinVerified?: boolean;
  linkedinDisplayName?: string;
  linkedinAvatarUrl?: string;
}

// Matches the backend Job model
export interface Review {
  _id: string;
  jobId: string;
  rating: number;
  comment: string;
  author: string;
  createdAt: string;
}

export interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  description: string;
  jobDescription?: string;
  isFake: boolean;
  upvotes: number;
  downvotes: number;
  submittedBy?: string;
  verificationStatus?: 'verified' | 'unverified' | 'none';
  verificationConfidence?: 'low' | 'medium' | 'high' | null;
  verificationSource?: 'linkedin' | 'indeed' | 'external' | null;
  reviews: Review[];
  evidence?: Evidence[];
  hasEvidence?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Matches the backend Company model
export interface Company {
  _id: string;
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  averageRating: number;
  totalReports: number;
  createdAt: string;
  updatedAt: string;
}

// Evidence item for job reports
export interface Evidence {
  type: 'image' | 'url' | 'text';
  value: string;
}

// Matches the backend Report model (flagging/moderation)
export interface FlagReport {
  _id: string;
  reportedBy: string | { username: string };
  targetType: 'job' | 'company';
  targetId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewedBy?: string;
  createdAt: string;
}