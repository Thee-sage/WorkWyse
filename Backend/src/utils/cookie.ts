import { CookieOptions, Response } from 'express';
import env from '../config/env';

/**
 * Refresh token cookie name.
 */
export const REFRESH_COOKIE = 'refreshToken';

/**
 * Secure cookie options for the refresh token (httpOnly — JS can never read it).
 * Finding 7.3 — prevents XSS from stealing long-lived refresh tokens.
 *
 * CSRF Analysis:
 *   The refresh endpoint POST /api/auth/refresh issues a new access token.
 *   A CSRF attack could trigger a refresh on behalf of an authenticated user,
 *   but the attacker still cannot read the new access token (CORS blocks reads).
 *   The resource being "changed" is just swapping one valid token for another —
 *   no state change that harms the user.
 *
 *   More critically: all protected actions require a short-lived access token
 *   in the Authorization header. Since access tokens live in memory (not cookies),
 *   a CSRF attacker can never obtain one — so they cannot perform any write
 *   operation even after triggering a refresh.
 *
 *   SameSite settings:
 *     - Development: 'lax'   — same-origin requests + top-level navigations
 *     - Production:  'strict' — only first-party same-site requests
 *   This is sufficient for the stateless JWT model used here.
 *   If you ever add session-based state (e.g., CSRF-sensitive cookie-only actions),
 *   add an explicit CSRF token (e.g., via the 'csrf' npm package).
 */
function cookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,       // JS cannot access
    secure: isProd,       // HTTPS only in production
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/auth',    // only sent to auth endpoints
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches JWT_REFRESH_EXPIRY)
  };
}

/**
 * Set the refresh token as an httpOnly cookie on the response.
 */
export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, cookieOptions());
}

/**
 * Clear the refresh token cookie.
 */
export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/auth',
  });
}
