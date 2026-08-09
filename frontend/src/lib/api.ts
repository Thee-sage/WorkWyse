import { ApiResponse } from '../types/api';
import { Job, Company, FlagReport, Evidence } from '../types/user';

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

    get: (id: string) =>
      apiFetch<Job>(`/jobs/${id}`, { method: 'GET', auth: false }),

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

    addReview: (id: string, data: { rating: number; comment: string }) =>
      apiFetch(`/jobs/${id}/reviews`, { method: 'POST', body: data }),

    // Finding 11.2 — delete review (owner or admin)
    deleteReview: (id: string, reviewId: string) =>
      apiFetch(`/jobs/${id}/reviews/${reviewId}`, { method: 'DELETE' }),
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

    create: (data: { name: string; website?: string; description?: string; industry?: string }) =>
      apiFetch<Company>('/companies', { method: 'POST', body: data }),

    update: (id: string, data: Partial<Company>) =>
      apiFetch<Company>(`/companies/${id}`, { method: 'PUT', body: data }),

    remove: (id: string) =>
      apiFetch(`/companies/${id}`, { method: 'DELETE' }),
  },

  // ─── Flag Reports (moderation) ──────────────────────────────────
  reports: {
    create: (data: { targetType: 'job' | 'company'; targetId: string; reason: string; description?: string; evidence?: Evidence[] }) =>
      apiFetch<FlagReport>('/reports', { method: 'POST', body: data }),

    mine: (params: PaginationOpts = {}) =>
      apiFetch<FlagReport[]>(`/reports/mine${buildQuery(params)}`, { method: 'GET' }),

    adminList: (params: PaginationOpts = {}) =>
      apiFetch<FlagReport[]>(`/reports${buildQuery(params)}`, { method: 'GET' }),

    updateStatus: (id: string, status: 'reviewed' | 'dismissed') =>
      apiFetch<FlagReport>(`/reports/${id}/status`, { method: 'PATCH', body: { status } }),
  },

  // ─── Analytics ─────────────────────────────────────────────────
  analytics: {
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
      apiFetch<any>(`/notifications${buildQuery(params)}`, { method: 'GET' }),

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
      apiFetch<any>(`/jobs/${jobId}/comments${buildQuery(params)}`, { method: 'GET', auth: false }),

    create: (jobId: string, body: string) =>
      apiFetch<any>(`/jobs/${jobId}/comments`, { method: 'POST', body: { body } }),

    delete: (jobId: string, commentId: string) =>
      apiFetch(`/jobs/${jobId}/comments/${commentId}`, { method: 'DELETE' }),
  },

  // ─── Activity Feed ─────────────────────────────────────────────
  activity: {
    forTarget: (targetType: string, targetId: string, params: PaginationOpts = {}) =>
      apiFetch<any>(`/activity/${targetType}/${targetId}${buildQuery(params)}`, { method: 'GET', auth: false }),

    adminLog: (params: PaginationOpts = {}) =>
      apiFetch<any>(`/activity${buildQuery(params)}`, { method: 'GET' }),
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

  // ─── Admin ─────────────────────────────────────────────────────
  admin: {
    listUsers: (params: PaginationOpts = {}) =>
      apiFetch<any>(`/admin/users${buildQuery(params)}`, { method: 'GET' }),

    changeRole: (uid: string, role: 'user' | 'admin' | 'moderator') =>
      apiFetch<any>(`/admin/users/${uid}/role`, { method: 'PATCH', body: { role } }),
  },
};

