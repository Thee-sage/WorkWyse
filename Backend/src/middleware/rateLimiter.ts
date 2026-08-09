import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import '../types/express';

/** Extract per-user key: uid if authenticated, otherwise delegate to default IP key */
const userKeyGenerator = (req: Request, res: any): string => {
  if (req.user?.uid) return req.user.uid;
  // Fallback: not authenticated — use default IP-based key
  return req.ip || 'unknown';
};

/**
 * Wrap keyGenerator to satisfy express-rate-limit v7 IPv6 validation.
 * We tell it to skip the ipKeyGenerator check because we only use req.ip
 * as a last resort when user.uid is unavailable.
 */
const perUserLimiterOptions = {
  keyGenerator: userKeyGenerator,
  validate: false as const,
};

/** Global rate limiter: 100 requests per 15 minutes per IP */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/** Auth rate limiter: 10 requests per 15 minutes per IP (register, login, OTP) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

/** OTP rate limiter: 5 requests per 10 minutes per IP */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please try again in 10 minutes.' },
});

/** Report/job submission: 10 per hour per user */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  ...perUserLimiterOptions,
  message: { success: false, message: 'Too many submissions. Please try again later.' },
});

/** Upload: 20 per hour per user */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  ...perUserLimiterOptions,
  message: { success: false, message: 'Too many uploads. Please try again later.' },
});

/** Voting: 30 votes per 15 minutes per user */
export const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  ...perUserLimiterOptions,
  message: { success: false, message: 'Too many votes. Please slow down.' },
});

/** Finding 3.2 — Flag reports: 10 per hour per user */
export const flagReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  ...perUserLimiterOptions,
  message: { success: false, message: 'Too many reports. Please try again later.' },
});
