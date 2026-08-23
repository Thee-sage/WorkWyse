import { ActivityAction, ActivityLogEntry, JobRecord, ReviewOutcome } from "../types/user";

export type RecordState = "answered" | "partly" | "open";

export interface QuestionSummary {
  id: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  key: string;
  title: string;
  state: RecordState;
}

const QUESTION_META: Array<{ id: QuestionSummary["id"]; key: string; title: string }> = [
  { id: 1, key: "real", title: "Is this role real?" },
  { id: 2, key: "apply", title: "Can I actually apply?" },
  { id: 3, key: "reply", title: "Has anyone had a reply?" },
  { id: 4, key: "pay", title: "Is the pay honest?" },
  { id: 5, key: "age", title: "How long has it been up?" },
  { id: 6, key: "company", title: "What is the company like?" },
  { id: 7, key: "checkself", title: "What should I check myself?" },
];

/**
 * Derives the seven questions' Answered / Partly / Open states from real
 * record data — presentation logic, not stored server-side. A question with
 * no supporting data is always "open" rather than guessed at.
 */
export function computeQuestionStates(record: JobRecord): QuestionSummary[] {
  const { job, companyStats, repostCount } = record;
  const reviews = job.reviews ?? [];

  // Q1 — is this role real?
  const hasInterviewOrOffer = reviews.some((r) => r.stage === "interviewed" || r.stage === "offered");
  const q1: RecordState =
    hasInterviewOrOffer || job.verificationStatus === "verified"
      ? "answered"
      : reviews.length > 0 || job.verificationStatus === "unverified"
      ? "partly"
      : "open";

  // Q2 — can I actually apply? (URL liveness check)
  const q2: RecordState = job.urlCheck ? (job.urlCheck.ok ? "answered" : "answered") : "open";

  // Q3 — has anyone had a reply?
  const withOutcome = reviews.filter((r): r is typeof r & { outcome: ReviewOutcome } => !!r.outcome);
  const q3: RecordState = withOutcome.length >= 2 ? "answered" : withOutcome.length === 1 ? "partly" : "open";

  // Q4 — is the pay honest?
  const withSalary = reviews.filter((r) => !!r.salaryQuoted);
  const q4: RecordState = withSalary.length >= 2 ? "answered" : withSalary.length === 1 ? "partly" : "open";

  // Q5 — how long has it been up / reposted?
  const q5: RecordState =
    repostCount >= 1 && !!job.urlCheck ? "answered" : repostCount >= 1 || !!job.urlCheck ? "partly" : "open";

  // Q6 — what is the company like?
  const q6: RecordState =
    companyStats.employerReplies > 0 ? "answered" : companyStats.listingsTracked > 1 ? "partly" : "open";

  const states: Record<string, RecordState> = { real: q1, apply: q2, reply: q3, pay: q4, age: q5, company: q6, checkself: "open" };

  return QUESTION_META.map((q) => ({ ...q, state: states[q.key] }));
}

export function stateCounts(questions: QuestionSummary[]) {
  return {
    answered: questions.filter((q) => q.state === "answered").length,
    partly: questions.filter((q) => q.state === "partly").length,
    open: questions.filter((q) => q.state === "open").length,
  };
}

/** "4h ago" / "2d ago" / "3mo ago" — the mono relative-time format used everywhere. */
export function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** "2 MAR 2026" — the small-caps date format used in mono meta lines. */
export function formatDateMono(dateStr: string): string {
  return new Date(dateStr)
    .toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    .toUpperCase();
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

/** Two-letter initials for the small avatar squares ("QF", "MK"). */
export function initials(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "");
  if (clean.length <= 2) return clean.toUpperCase();
  return (clean[0] + clean[clean.length - 1]).toUpperCase();
}

/**
 * Contributor tiers (see Backend TrustService.getContributorStats).
 *
 * Tier is computed server-side from what a contributor has filed and how
 * much of it held up — not from posting volume:
 *   Tier 1 — fewer than 5 contributions and no verified evidence yet.
 *   Tier 2 — 5+ contributions, or at least 1 verified evidence item.
 *   Tier 3 — 20+ contributions, or 5+ verified evidence items.
 * A bare "TIER 1" communicates none of that, so tierLabel now names what
 * the tier means and tierDescription gives the one-line "how to move up"
 * explanation used in tooltips and the account menu.
 */
const TIER_NAMES: Record<number, string> = {
  1: "New contributor",
  2: "Established contributor",
  3: "Trusted contributor",
};

export function tierLabel(tier: number): string {
  return TIER_NAMES[tier] ?? `Tier ${tier}`;
}

/** Short mono badge form, e.g. "T1 · NEW CONTRIBUTOR". Used where space is tight. */
export function tierBadge(tier: number): string {
  return `T${tier} · ${tierLabel(tier).toUpperCase()}`;
}

export function tierDescription(tier: number): string {
  switch (tier) {
    case 3:
      return "20+ contributions filed, or 5+ evidence items verified by a moderator.";
    case 2:
      return "5+ contributions filed, or at least 1 evidence item verified by a moderator.";
    default:
      return "Fewer than 5 contributions so far — file an account or evidence to move up.";
  }
}

const AUTO_ACTIONS: ActivityAction[] = ["url_checked"];
const MOD_ACTIONS: ActivityAction[] = [
  "evidence_verified", "evidence_redacted", "report_reviewed", "report_dismissed", "role_changed",
];

/** Classifies an activity entry into the log's lanes: people / automated / moderation / employer. */
export function classifyActivity(action: ActivityAction): "people" | "auto" | "mod" | "employer" {
  if (action === "employer_replied") return "employer";
  if (AUTO_ACTIONS.includes(action)) return "auto";
  if (MOD_ACTIONS.includes(action)) return "mod";
  return "people";
}

const ACTIVITY_COPY: Record<ActivityAction, string> = {
  job_created: "Record opened",
  job_updated: "Listing details edited",
  job_deleted: "Record removed",
  review_added: "An account was filed",
  review_deleted: "An account was withdrawn",
  evidence_uploaded: "Evidence was attached",
  evidence_verified: "Evidence was accepted as verified",
  evidence_redacted: "Evidence was redacted",
  url_checked: "Application URL was checked",
  company_review_added: "A company account was filed",
  watch_added: "Someone started watching this record",
  watch_removed: "Someone stopped watching this record",
  employer_replied: "The employer replied",
  report_submitted: "A challenge was filed",
  report_reviewed: "A challenge was resolved",
  report_dismissed: "A challenge was dismissed",
  vote_cast: "A vote was recorded",
  vote_removed: "A vote was withdrawn",
  comment_added: "A comment was posted",
  comment_deleted: "A comment was removed",
  role_changed: "A user's role changed",
};

export function activityCopy(entry: ActivityLogEntry): string {
  return ACTIVITY_COPY[entry.action] ?? entry.action;
}

/** Stable, purely cosmetic "REC ####" code derived from the Mongo id — not a stored sequence. */
export function recordCode(id: string): string {
  const tail = id.slice(-6);
  const n = parseInt(tail, 16) % 9000 + 1000;
  return `REC ${n}`;
}

export const OUTCOME_LABEL: Record<ReviewOutcome, string> = {
  no_response: "No answer at all",
  rejected: "Rejected",
  on_hold: "Told it was on hold",
  hired: "Hired",
};

export const STAGE_LABEL: Record<string, string> = {
  applied: "Applied only",
  interviewed: "Interviewed",
  offered: "Offered",
};

/**
 * Lightweight completeness read for a bare Job (no full /record fetch) —
 * used on Home and Registry cards where the heavier aggregation isn't needed.
 */
export function quickRecordLabel(job: {
  reviews: Array<{ outcome?: string }>;
  evidence?: Array<{ status?: string }>;
  verificationStatus?: string;
}): { label: string; tone: "answered" | "partly" | "open" } {
  const hasEvidence = (job.evidence?.length ?? 0) > 0;
  const hasAccounts = job.reviews.length > 0;
  const hasVerified = job.verificationStatus === "verified" || (job.evidence ?? []).some((e) => e.status === "verified");

  if (!hasEvidence && !hasAccounts) return { label: "Almost nothing on record", tone: "open" };
  if (hasVerified) return { label: "Answered from evidence", tone: "answered" };
  return { label: "Partly answered", tone: "partly" };
}
