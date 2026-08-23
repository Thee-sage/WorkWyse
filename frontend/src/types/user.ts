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
export type ReviewStage = 'applied' | 'interviewed' | 'offered';
export type ReviewOutcome = 'no_response' | 'rejected' | 'on_hold' | 'hired';
export type EvidenceStatus = 'pending' | 'verified' | 'unverifiable' | 'redacted';

export interface Review {
  _id: string;
  jobId: string;
  rating?: number;
  comment: string;
  author: string;
  stage?: ReviewStage;
  outcome?: ReviewOutcome;
  salaryQuoted?: string;
  createdAt: string;
}

// Evidence item for job reports
export interface Evidence {
  _id?: string;
  type: 'image' | 'url' | 'text';
  value: string;
  status?: EvidenceStatus;
  note?: string;
  addedBy?: string;
  addedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface UrlCheck {
  checkedAt: string;
  ok: boolean;
  statusCode?: number;
  consecutiveFailures: number;
  lastSuccessAt?: string;
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
  submittedBy?: string | { uid?: string; username: string };
  verificationStatus?: 'verified' | 'unverified' | 'none';
  verificationConfidence?: 'low' | 'medium' | 'high' | null;
  verificationSource?: 'linkedin' | 'indeed' | 'external' | null;
  reviews: Review[];
  evidence?: Evidence[];
  hasEvidence?: boolean;
  urlCheck?: UrlCheck;
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

export interface CompanyReview {
  _id: string;
  companyId: string;
  author: string;
  comment: string;
  stage?: 'applied' | 'interviewed' | 'offered' | 'worked_here';
  outcome?: ReviewOutcome;
  createdAt: string;
}

export interface CompanyStats {
  listingsTracked: number;
  stillPosted: number;
  openReports: number;
  firstHandAccounts: number;
  evidenceItems: number;
  confirmedHires: number;
  employerReplies: number;
  companyReviews: number;
}

export interface CompanyPatternMonth {
  month: string;
  postings: number;
  reports: number;
  evidence: number;
}

export interface EmployerReply {
  text: string;
  respondedAt: string;
  enteredBy: string;
}

// Matches the backend Report model (flagging/moderation/challenges)
export interface FlagReport {
  _id: string;
  reportedBy: string | { username: string };
  targetType: 'job' | 'company';
  targetId: string;
  targetSubId?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewedBy?: string;
  employerReply?: EmployerReply;
  createdAt: string;
}

export interface ContributorStats {
  username: string;
  accountsFiled: number;
  evidenceFiled: number;
  evidenceVerified: number;
  challengesFiled: number;
  disputesUpheldAgainst: number;
  contributions: number;
  tier: 1 | 2 | 3;
  accountAgeDays: number;
}

export interface JobRecord {
  job: Job;
  reports: FlagReport[];
  log: ActivityLogEntry[];
  contributorsCount: number;
  trustScore: number;
  repostCount: number;
  repostSiblings: Array<{ _id: string; title: string; company: string; createdAt: string }>;
  duplicateSiblings: Array<{ _id: string; title: string; company: string; createdAt: string }>;
  companyStats: {
    listingsTracked: number;
    openReports: number;
    confirmedHires: number;
    employerReplies: number;
  };
}

export type ActivityAction =
  | 'job_created' | 'job_updated' | 'job_deleted'
  | 'review_added' | 'review_deleted'
  | 'evidence_uploaded' | 'evidence_verified' | 'evidence_redacted'
  | 'url_checked' | 'company_review_added' | 'watch_added' | 'watch_removed'
  | 'employer_replied'
  | 'report_submitted' | 'report_reviewed' | 'report_dismissed'
  | 'vote_cast' | 'vote_removed'
  | 'comment_added' | 'comment_deleted'
  | 'role_changed';

export interface ActivityLogEntry {
  _id: string;
  actorUsername: string;
  action: ActivityAction;
  targetType: 'job' | 'company' | 'report' | 'user';
  targetId: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface PendingEvidenceItem {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  evidence: Evidence;
}

export interface Comment {
  _id: string;
  jobId: string;
  author: string;
  authorUsername: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  _id: string;
  userId: string;
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
  createdAt: string;
}
