import { ApiResponse } from '../types/api';
import {
  Job, Company, FlagReport, Evidence, CompanyReview, CompanyStats, CompanyPatternMonth,
  ContributorStats, JobRecord, ActivityLogEntry, AppNotification, UrlCheck, ReviewStage,
  ReviewOutcome, EvidenceStatus, Comment, PendingEvidenceItem,
} from '../types/user';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ─── Token Storage (in-memory only — no localStorage) ──────────────
// Finding 7.3: Access token lives in memory (safe from XSS).
// Refresh token lives in an httpOnly cookie (JS can never access it).
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearTokens(): void {
  accessToken = null;
  clearAdminUnlock();
}

// ─── Admin unlock token (in-memory only, same reasoning as accessToken) ──
// The passphrase second factor for the admin surface. Never persisted —
// closing the tab or refreshing means unlocking again, same as it should
// for a step-up-auth token guarding an admin action.
let adminUnlockToken: string | null = null;

export function getAdminUnlockToken(): string | null {
  return adminUnlockToken;
}

export function setAdminUnlockToken(token: string | null): void {
  adminUnlockToken = token;
}

export function clearAdminUnlock(): void {
  adminUnlockToken = null;
}

// ─── Token Refresh Logic ────────────────────────────────────────────
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      // Finding 7.3: No refresh token in the body — the browser sends
      // the httpOnly cookie automatically via credentials: 'include'.
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });

      if (!res.ok) {
        clearTokens();
        return null;
      }

      const json: ApiResponse<{ accessToken: string }> = await res.json();
      setAccessToken(json.data.accessToken);
      return json.data.accessToken;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── API Error Class ────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ─── Core Fetch Wrapper ─────────────────────────────────────────────
interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

async function apiFetch<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { body, auth = true, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (auth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Attach the admin unlock token only to the routes that actually require
  // it server-side — not to every request — so a stale/foreign unlock token
  // never rides along with unrelated calls.
  const needsAdminUnlock =
    endpoint.startsWith('/admin/') && endpoint !== '/admin/unlock'
      ? true
      : /^\/reports\/[^/]+\/status$/.test(endpoint) || endpoint.startsWith('/reports/decision-requests');
  if (needsAdminUnlock && adminUnlockToken) {
    headers['X-Admin-Unlock'] = adminUnlockToken;
  }

  // Finding 7.3: Always include credentials so the httpOnly cookie is sent
  let res = await fetch(`${BASE_URL}${endpoint}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  // 401 → try refresh
  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${BASE_URL}${endpoint}`, {
        ...rest,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });
    }
  }

  const json = await res.json().catch(() => ({
    success: false,
    message: 'Invalid server response',
    data: null,
  }));

  if (!res.ok) {
    throw new ApiError(json.message || `Request failed (${res.status})`, res.status);
  }

  return json as ApiResponse<T>;
}

// ─── Paginated list helper ──────────────────────────────────────────
interface PaginationOpts {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

function buildQuery(params: PaginationOpts): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ─── Public API Methods ─────────────────────────────────────────────
export const api = {
  get: <T = unknown>(endpoint: string, opts?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...opts, method: 'GET' }),

  post: <T = unknown>(endpoint: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...opts, method: 'POST', body }),

  put: <T = unknown>(endpoint: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...opts, method: 'PUT', body }),

  patch: <T = unknown>(endpoint: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...opts, method: 'PATCH', body }),

  delete: <T = unknown>(endpoint: string, opts?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...opts, method: 'DELETE' }),

  // ─── Auth ──────────────────────────────────────────────────────
  auth: {
    register: (data: { username: string; email: string; password: string; userType?: string }) =>
      apiFetch<{ email: string }>('/auth/register', { method: 'POST', body: data, auth: false }),

    verifyOTP: (email: string, otp: string) =>
      apiFetch<{ user: import('../types/user').User; accessToken: string }>(
        '/auth/verify-otp',
        { method: 'POST', body: { email, otp }, auth: false }
      ),

    /** Login - accepts email or username as `identifier` */
    login: (identifier: string, password: string) =>
      apiFetch<{ user: import('../types/user').User; accessToken: string }>(
        '/auth/login',
        { method: 'POST', body: { identifier, password }, auth: false }
      ),

    refresh: () => refreshAccessToken(),

    getMe: () =>
      apiFetch<import('../types/user').User>('/auth/me', { method: 'GET' }),

    logout: () => apiFetch('/auth/logout', { method: 'POST' }),

    updateUserType: (userType: 'public' | 'private') =>
      apiFetch<{ username: string; uid: string; type: string }>(
        '/auth/user-type',
        { method: 'PUT', body: { userType } }
      ),

    getLinkedInAuthUrl: () =>
      apiFetch<{ url: string }>('/auth/linkedin', { method: 'GET' }),

    verifyLinkedIn: (code: string) =>
      apiFetch<{ username: string; uid: string; linkedinVerified: boolean; linkedinDisplayName: string; linkedinAvatarUrl: string }>(
        '/auth/linkedin/callback',
        { method: 'POST', body: { code } }
      ),

    // Forgot Password flow
    forgotPassword: (email: string) =>
      apiFetch('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),

    verifyResetOtp: (email: string, otp: string) =>
      apiFetch<{ resetToken: string }>(
        '/auth/verify-reset-otp',
        { method: 'POST', body: { email, otp }, auth: false }
      ),

    resetPassword: (resetToken: string, newPassword: string) =>
      apiFetch('/auth/reset-password', {
        method: 'POST',
        body: { resetToken, newPassword },
        auth: false,
      }),
  },

  // ─── Jobs (hiring experience entries) ──────────────────────────
  jobs: {
    list: (params: PaginationOpts = {}) =>
      apiFetch<Job[]>(`/jobs${buildQuery(params)}`, { method: 'GET', auth: false }),

    /** Registry listing with computed "signal" filters (dead/repost/accounts/thin/fake). */
    registry: (params: PaginationOpts & { signal?: string } = {}) =>
      apiFetch<Array<{ job: Job; repostCount: number; contributorsCount: number }>>(
        `/jobs/registry${buildQuery(params)}`,
        { method: 'GET', auth: false }
      ),

    get: (id: string) =>
      apiFetch<Job>(`/jobs/${id}`, { method: 'GET', auth: false }),

    /** Everything the Job Record page needs in one call. */
    getRecord: (id: string) =>
      apiFetch<JobRecord>(`/jobs/${id}/record`, { method: 'GET', auth: false }),

    extractUrl: (jobUrl: string) =>
      apiFetch<import('../types/extraction').ExtractionResult>('/jobs/extract', {
        method: 'POST',
        body: { jobUrl },
      }),

    // Finding 1.1 — verificationStatus/Confidence/Source removed (server-only)
    create: (data: {
      title: string;
      company: string;
      location: string;
      jobUrl: string;
      description: string;
      jobDescription?: string;
      isFake: boolean;
      evidence?: Evidence[];
    }) =>
      apiFetch<Job>('/jobs', { method: 'POST', body: data }),

    // Finding 1.3 / 11.1 — edit (owner or admin)
    update: (id: string, data: {
      title?: string;
      company?: string;
      location?: string;
      description?: string;
      jobDescription?: string;
      isFake?: boolean;
    }) =>
      apiFetch<Job>(`/jobs/${id}`, { method: 'PUT', body: data }),

    // Finding 1.3 / 11.1 — delete (owner or admin)
    delete: (id: string) =>
      apiFetch(`/jobs/${id}`, { method: 'DELETE' }),

    vote: (id: string, voteType: 'upvote' | 'downvote') =>
      apiFetch<{ upvotes: number; downvotes: number; userVote: 'upvote' | 'downvote' | null }>(
        `/jobs/${id}/vote`, { method: 'POST', body: { voteType } }
      ),

    getUserVote: (id: string) =>
      apiFetch<{ userVote: 'upvote' | 'downvote' | null }>(`/jobs/${id}/vote`),

    addReview: (id: string, data: { rating?: number; comment: string; stage?: ReviewStage; outcome?: ReviewOutcome; salaryQuoted?: string }) =>
      apiFetch(`/jobs/${id}/reviews`, { method: 'POST', body: data }),

    // Finding 11.2 — delete review (owner or admin)
    deleteReview: (id: string, reviewId: string) =>
      apiFetch(`/jobs/${id}/reviews/${reviewId}`, { method: 'DELETE' }),

    // ── Evidence ──────────────────────────────────────────────────
    addEvidence: (id: string, data: Evidence) =>
      apiFetch<Evidence>(`/jobs/${id}/evidence`, { method: 'POST', body: data }),

    updateEvidenceStatus: (id: string, evidenceId: string, data: { status: EvidenceStatus; note?: string }) =>
      apiFetch<Evidence>(`/jobs/${id}/evidence/${evidenceId}`, { method: 'PATCH', body: data }),

    // ── URL liveness check (on-demand, not a cron) ─────────────────
    checkUrl: (id: string) =>
      apiFetch<UrlCheck>(`/jobs/${id}/check-url`, { method: 'POST', auth: false }),

    // ── Watch list ──────────────────────────────────────────────────
    watchStatus: (id: string) =>
      apiFetch<{ watching: boolean }>(`/jobs/${id}/watch`, { method: 'GET' }),

    watch: (id: string) =>
      apiFetch<{ watching: boolean }>(`/jobs/${id}/watch`, { method: 'POST' }),

    unwatch: (id: string) =>
      apiFetch<{ watching: boolean }>(`/jobs/${id}/watch`, { method: 'DELETE' }),

    watching: (params: PaginationOpts = {}) =>
      apiFetch<Job[]>(`/jobs/watching${buildQuery(params)}`, { method: 'GET' }),

    myContributions: (params: PaginationOpts = {}) =>
      apiFetch<Job[]>(`/jobs/mine/contributions${buildQuery(params)}`, { method: 'GET' }),

    // ── Moderation ──────────────────────────────────────────────────
    evidenceQueue: (params: PaginationOpts = {}) =>
      apiFetch<PendingEvidenceItem[]>(`/jobs/moderation/evidence-queue${buildQuery(params)}`, { method: 'GET' }),
  },

  // ─── Upload ──────────────────────────────────────────────────────
  upload: {
    image: async (file: File): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      let res = await fetch(`${BASE_URL}/upload`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      // 401 → try refresh
      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          res = await fetch(`${BASE_URL}/upload`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include',
          });
        }
      }

      const json = await res.json().catch(() => ({
        success: false,
        message: 'Upload failed',
        data: null,
      }));

      if (!res.ok) {
        throw new ApiError(json.message || 'Upload failed', res.status);
      }

      return json.data as { url: string };
    },
  },

  // ─── Companies ─────────────────────────────────────────────────
  companies: {
    list: (params: PaginationOpts = {}) =>
      apiFetch<Company[]>(`/companies${buildQuery(params)}`, { method: 'GET', auth: false }),

    get: (id: string) =>
      apiFetch<Company>(`/companies/${id}`, { method: 'GET', auth: false }),

    /** Resolves (or transparently creates) a company profile by its free-text name. */
    resolveByName: (name: string) =>
      apiFetch<Company>(`/companies/resolve/${encodeURIComponent(name)}`, { method: 'GET', auth: false }),

    create: (data: { name: string; website?: string; description?: string; industry?: string }) =>
      apiFetch<Company>('/companies', { method: 'POST', body: data }),

    update: (id: string, data: Partial<Company>) =>
      apiFetch<Company>(`/companies/${id}`, { method: 'PUT', body: data }),

    remove: (id: string) =>
      apiFetch(`/companies/${id}`, { method: 'DELETE' }),

    stats: (id: string) =>
      apiFetch<CompanyStats>(`/companies/${id}/stats`, { method: 'GET', auth: false }),

    patterns: (id: string) =>
      apiFetch<CompanyPatternMonth[]>(`/companies/${id}/patterns`, { method: 'GET', auth: false }),

    reviews: (id: string, params: PaginationOpts = {}) =>
      apiFetch<CompanyReview[]>(`/companies/${id}/reviews${buildQuery(params)}`, { method: 'GET', auth: false }),

    addReview: (id: string, data: { comment: string; stage?: string; outcome?: string }) =>
      apiFetch<CompanyReview>(`/companies/${id}/reviews`, { method: 'POST', body: data }),
  },

  // ─── Flag Reports (moderation) ──────────────────────────────────
  reports: {
    create: (data: { targetType: 'job' | 'company'; targetId: string; targetSubId?: string; reason: string; description?: string }) =>
      apiFetch<FlagReport>('/reports', { method: 'POST', body: data }),

    mine: (params: PaginationOpts = {}) =>
      apiFetch<FlagReport[]>(`/reports/mine${buildQuery(params)}`, { method: 'GET' }),

    adminList: (params: PaginationOpts = {}) =>
      apiFetch<FlagReport[]>(`/reports${buildQuery(params)}`, { method: 'GET' }),

    /** Admin-only direct override. Requires an unlocked admin session. */
    updateStatus: (id: string, status: 'reviewed' | 'dismissed') =>
      apiFetch<FlagReport>(`/reports/${id}/status`, { method: 'PATCH', body: { status } }),

    setEmployerReply: (id: string, text: string) =>
      apiFetch<FlagReport>(`/reports/${id}/employer-reply`, { method: 'PATCH', body: { text } }),

    // ── Moderator decision requests ──────────────────────────────────
    // A moderator's path to a report decision: propose it, then wait for
    // an admin to approve or reject. Limited to one per day server-side.

    requestDecision: (id: string, proposedStatus: 'reviewed' | 'dismissed', note?: string) =>
      apiFetch<{ _id: string; status: string }>(`/reports/${id}/decision-requests`, {
        method: 'POST',
        body: { proposedStatus, note },
      }),

    /** Admin-only — requires an unlocked admin session. */
    decisionRequests: (params: PaginationOpts & { status?: string } = {}) =>
      apiFetch<
        Array<{
          _id: string;
          reportId: FlagReport;
          requestedBy: { username: string };
          proposedStatus: 'reviewed' | 'dismissed';
          note?: string;
          status: 'pending' | 'approved' | 'rejected';
          createdAt: string;
        }>
      >(`/reports/decision-requests${buildQuery(params)}`, { method: 'GET' }),

    approveDecisionRequest: (id: string, note?: string) =>
      apiFetch(`/reports/decision-requests/${id}/approve`, { method: 'PATCH', body: { note } }),

    rejectDecisionRequest: (id: string, note?: string) =>
      apiFetch(`/reports/decision-requests/${id}/reject`, { method: 'PATCH', body: { note } }),
  },

  // ─── Analytics ─────────────────────────────────────────────────
  analytics: {
    /** Public platform-wide stats — no auth required. */
    publicStats: () =>
      apiFetch<{ listingsTracked: number; recordsWithAccount: number; evidencePublished: number; employerResponses: number; companiesTracked: number }>(
        '/analytics/public', { method: 'GET', auth: false }
      ),

    dashboard: () =>
      apiFetch<any>('/analytics/dashboard', { method: 'GET' }),

    jobTrend: (days = 30) =>
      apiFetch<Array<{ date: string; count: number }>>(`/analytics/trends/jobs?days=${days}`, { method: 'GET' }),

    reportTrend: (days = 30) =>
      apiFetch<Array<{ date: string; count: number }>>(`/analytics/trends/reports?days=${days}`, { method: 'GET' }),
  },

  // ─── Notifications ─────────────────────────────────────────────
  notifications: {
    list: (params: PaginationOpts = {}) =>
      apiFetch<AppNotification[]>(`/notifications${buildQuery(params)}`, { method: 'GET' }),

    unreadCount: () =>
      apiFetch<{ unreadCount: number }>('/notifications/unread-count', { method: 'GET' }),

    markRead: (id: string) =>
      apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),

    markAllRead: () =>
      apiFetch('/notifications/read-all', { method: 'PATCH' }),

    delete: (id: string) =>
      apiFetch(`/notifications/${id}`, { method: 'DELETE' }),
  },

  // ─── Comments ──────────────────────────────────────────────────
  comments: {
    list: (jobId: string, params: PaginationOpts = {}) =>
      apiFetch<Comment[]>(`/jobs/${jobId}/comments${buildQuery(params)}`, { method: 'GET', auth: false }),

    create: (jobId: string, body: string) =>
      apiFetch<Comment>(`/jobs/${jobId}/comments`, { method: 'POST', body: { body } }),

    delete: (jobId: string, commentId: string) =>
      apiFetch(`/jobs/${jobId}/comments/${commentId}`, { method: 'DELETE' }),
  },

  // ─── Activity Feed ─────────────────────────────────────────────
  activity: {
    /** Public, site-wide transparency feed (the Activity screen). */
    feed: (params: PaginationOpts = {}) =>
      apiFetch<ActivityLogEntry[]>(`/activity/feed${buildQuery(params)}`, { method: 'GET', auth: false }),

    forTarget: (targetType: string, targetId: string, params: PaginationOpts = {}) =>
      apiFetch<ActivityLogEntry[]>(`/activity/${targetType}/${targetId}${buildQuery(params)}`, { method: 'GET', auth: false }),

    adminLog: (params: PaginationOpts = {}) =>
      apiFetch<ActivityLogEntry[]>(`/activity${buildQuery(params)}`, { method: 'GET' }),
  },

  // ─── Export / Import ───────────────────────────────────────────
  export: {
    jobsCSV: () => `${BASE_URL}/export/jobs.csv`,
    reportsCSV: () => `${BASE_URL}/export/reports.csv`,

    importJobsCSV: (csv: string) =>
      apiFetch<{ imported: number; failed: any[]; total: number }>(
        '/export/jobs/import',
        { method: 'POST', body: { csv } }
      ),
  },

  // ─── Users (public contributor standing) ────────────────────────
  users: {
    contributorStats: (username: string) =>
      apiFetch<ContributorStats>(`/users/${encodeURIComponent(username)}/stats`, { method: 'GET', auth: false }),
  },

  // ─── Admin ─────────────────────────────────────────────────────
  admin: {
    /** Second-factor unlock. Stores the returned token for subsequent admin calls. */
    unlock: async (passphrase: string) => {
      const res = await apiFetch<{ unlockToken: string; expiresInMs: number }>('/admin/unlock', {
        method: 'POST',
        body: { passphrase },
      });
      setAdminUnlockToken(res.data.unlockToken);
      return res;
    },

    lock: () => clearAdminUnlock(),
    isUnlocked: () => getAdminUnlockToken() !== null,

    listUsers: (params: PaginationOpts = {}) =>
      apiFetch<any>(`/admin/users${buildQuery(params)}`, { method: 'GET' }),

    changeRole: (uid: string, role: 'user' | 'admin' | 'moderator') =>
      apiFetch<any>(`/admin/users/${uid}/role`, { method: 'PATCH', body: { role } }),
  },
};

