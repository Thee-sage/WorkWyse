import rateLimit, { ipKeyGenerator, Options } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import env from '../config/env';
import logger from '../config/logger';
import '../types/express';

/**
 * Rate limiting.
 *
 * Two deployment details drive the shape of this file:
 *
 *  1. Azure App Service sits behind a reverse proxy. Express only reports a
 *     real client address once `trust proxy` is configured (see createApp),
 *     and until it is, every visitor shares one bucket and the whole site
 *     locks out after the first hundred requests.
 *
 *  2. The default MemoryStore is per-process. Scaling App Service beyond a
 *     single instance multiplies every limit below by the instance count.
 *     That is acceptable for a launch on one instance, but the moment
 *     scale-out is enabled these need a shared store (Redis via
 *     rate-limit-redis, or Azure Cache for Redis) or the limits stop
 *     meaning anything. `assertSingleInstanceOrSharedStore` logs a loud
 *     warning when it detects a scaled-out deployment.
 */

/** Per-user key when authenticated, IPv6-safe IP key otherwise. */
const userKeyGenerator = (req: Request, res: Response): string => {
  if (req.user?.uid) return `uid:${req.user.uid}`;
  // ipKeyGenerator normalises IPv6 to a /64 subnet, so a single client
  // cannot cycle through its address range to reset the counter.
  return ipKeyGenerator(req.ip ?? '', 56);
};

/** Shared options: standard headers, JSON body, and a logged breach. */
function makeLimiter(name: string, options: Partial<Options>) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Health probes must never be throttled or Azure will cycle the instance.
    skip: (req) => !env.RATE_LIMIT_ENABLED || req.path.startsWith('/health'),
    handler: (req, res, _next, opts) => {
      logger.warn('Rate limit exceeded', {
        limiter: name,
        uid: req.user?.uid,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      res.status(opts.statusCode).json(opts.message);
    },
    ...options,
  });
}

/**
 * Global limiter — a coarse abuse ceiling keyed by client address.
 *
 * Note that visitors sharing an egress address (corporate NAT, mobile
 * carrier CGNAT, a university) share this bucket, which is why the ceiling
 * is set well above what one person generates.
 *
 * The previous value of 100 per 15 minutes was below what a single user
 * browsing the app generates: the registry, a job record, its comments and
 * activity feed are already several calls per page view. The default is now
 * 600 per 15 minutes (~40/min sustained) and is tunable per environment.
 */
export const globalLimiter = makeLimiter('global', {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_GLOBAL_MAX,
  // Deliberately IP-keyed rather than user-keyed. This limiter is mounted
  // at the application level, which is before any route runs `authenticate`,
  // so req.user is always undefined here and a per-user key would silently
  // degrade to the IP fallback anyway. The per-user budgets below sit after
  // authentication and do key on uid.
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/** Auth: 10 requests per 15 minutes per IP (register, login, OTP) */
export const authLimiter = makeLimiter('auth', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

/**
 * Admin passphrase unlock: strict, keyed per account so one admin's
 * mistyped attempts cannot lock out another, and tight enough to make
 * brute-forcing a fixed-length passphrase impractical.
 */
export const adminUnlockLimiter = makeLimiter('adminUnlock', {
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: userKeyGenerator,
  message: { success: false, message: 'Too many admin unlock attempts. Please try again later.' },
});

/** OTP: 5 requests per 10 minutes per IP */
export const otpLimiter = makeLimiter('otp', {
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please try again in 10 minutes.' },
});

/** Report/job submission: 10 per hour per user */
export const reportLimiter = makeLimiter('report', {
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: userKeyGenerator,
  message: { success: false, message: 'Too many submissions. Please try again later.' },
});

/** Upload: 20 per hour per user */
export const uploadLimiter = makeLimiter('upload', {
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: userKeyGenerator,
  message: { success: false, message: 'Too many uploads. Please try again later.' },
});

/** Voting: 30 votes per 15 minutes per user */
export const voteLimiter = makeLimiter('vote', {
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: userKeyGenerator,
  message: { success: false, message: 'Too many votes. Please slow down.' },
});

/** Finding 3.2 — Flag reports: 10 per hour per user */
export const flagReportLimiter = makeLimiter('flagReport', {
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: userKeyGenerator,
  message: { success: false, message: 'Too many reports. Please try again later.' },
});

/**
 * Moderator decision requests: a thin HTTP-layer throttle, not the actual
 * one-per-day quota — that is enforced in ReportService.requestDecision
 * against the database (a rolling 24h window, survives restarts, correct
 * even behind multiple instances). This just stops a moderator from
 * hammering the endpoint with retries while they're already at their
 * limit, which would otherwise be a wasted database round trip per attempt.
 */
export const decisionRequestLimiter = makeLimiter('decisionRequest', {
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: userKeyGenerator,
  message: { success: false, message: 'Too many decision requests. Please try again later.' },
});

/**
 * Outbound-fetch limiter for the URL extractor and liveness check.
 *
 * These endpoints make the server perform a network request on the caller's
 * behalf, so they are the most expensive routes to abuse even with the SSRF
 * guard in place. The liveness check is unauthenticated, which is why it is
 * keyed by IP rather than by user.
 */
export const outboundFetchLimiter = makeLimiter('outboundFetch', {
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: userKeyGenerator,
  message: { success: false, message: 'Too many URL checks. Please try again later.' },
});

/**
 * Extension lookup: keyed by API key rather than by user, since the caller
 * authenticates with req.apiKey, not req.user — userKeyGenerator would fall
 * through to the IP key for every request and let one popular key's traffic
 * from many IPs bypass the intended per-key budget. Generous enough for
 * normal browsing (a lookup roughly every time a job page loads) while
 * still bounding a misbehaving or compromised key.
 */
export const extensionLookupLimiter = makeLimiter('extensionLookup', {
  windowMs: 15 * 60 * 1000,
  max: 120,
  keyGenerator: (req) =>
    req.apiKey?.id ? `apikey:${req.apiKey.id}` : ipKeyGenerator(req.ip ?? '', 56),
  message: { success: false, message: 'Too many lookups. Please try again later.' },
});

/**
 * Warn once at boot if the deployment is scaled out while the limiters are
 * still using per-process memory. WEBSITE_INSTANCE_ID is set by App Service.
 */
export function warnIfScaledOutWithMemoryStore(): void {
  const instanceCount = Number(process.env.WEBSITE_SITE_INSTANCE_COUNT ?? '1');
  if (instanceCount > 1) {
    logger.error(
      'Rate limiters are using an in-memory store while running on multiple instances — ' +
        'effective limits are multiplied by the instance count. Configure a shared Redis store.',
      { instanceCount }
    );
  }
}

/** Express 5 forwards async errors; keep the signature explicit for clarity. */
export type LimiterMiddleware = (req: Request, res: Response, next: NextFunction) => void;
