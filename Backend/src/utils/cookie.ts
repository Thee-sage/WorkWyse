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
 * SameSite and the Vercel/Azure split:
 *   The frontend is served from Vercel and the API from Azure App Service.
 *   Those are different registrable domains, which makes every API call a
 *   cross-site request. A cookie set with SameSite=Strict or Lax is simply
 *   not attached to cross-site XHR, so POST /api/auth/refresh would arrive
 *   with no cookie and every session would end at the 15-minute access-token
 *   expiry with a forced logout. Production therefore needs SameSite=None,
 *   which browsers only honour together with Secure (HTTPS-only).
 *
 * CSRF analysis under SameSite=None:
 *   Dropping to SameSite=None means a third-party page can trigger
 *   POST /api/auth/refresh with the cookie attached. That is acceptable here
 *   because the endpoint's only effect is rotating the refresh token and
 *   returning a new access token in the response *body* — which the attacker
 *   cannot read, since CORS only allows the configured origins and the
 *   response is not opaque-readable. Every state-changing endpoint requires
 *   the access token in an Authorization header, and access tokens live in
 *   memory rather than in a cookie, so a cross-site caller can never obtain
 *   one. The cookie is also scoped to path=/api/auth, so it is not sent to
 *   any other route.
 *
 *   If cookie-authenticated write endpoints are ever added, this reasoning
 *   stops holding and an explicit CSRF token becomes necessary.
 */
function cookieOptions(): CookieOptions {
  const options: CookieOptions = {
    httpOnly: true,                 // JS cannot access
    secure: env.COOKIE_SECURE,      // required whenever sameSite is 'none'
    sameSite: env.COOKIE_SAMESITE,
    path: '/api/auth',              // only sent to auth endpoints
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches JWT_REFRESH_EXPIRY)
  };

  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }

  return options;
}

/**
 * Set the refresh token as an httpOnly cookie on the response.
 */
export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, cookieOptions());
}

/**
 * Clear the refresh token cookie.
 *
 * The attributes here must match the ones used when setting it — a browser
 * ignores a clear whose path/domain/sameSite differ, which would leave a
 * stale refresh cookie in place after logout.
 */
export function clearRefreshCookie(res: Response): void {
  const { maxAge: _maxAge, ...rest } = cookieOptions();
  res.clearCookie(REFRESH_COOKIE, rest);
}
