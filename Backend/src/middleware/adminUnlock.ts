import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../config/env';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';

/**
 * Second factor gating the admin surface.
 *
 * Having an 'admin' role account is necessary but no longer sufficient to
 * reach admin actions — the caller must also present a short-lived unlock
 * token proved by ADMIN_ACCESS_PASSPHRASE. This exists specifically so
 * that an admin account being compromised (a leaked session, a guessed
 * password) does not automatically mean the admin surface is reachable:
 * the passphrase is a separate secret the attacker would also need.
 *
 * Unlock tokens are bound to the specific admin uid that unlocked them —
 * one admin's unlock cannot be replayed by a different account, even
 * another admin — and expire after ADMIN_UNLOCK_TTL_MS regardless of
 * activity, so a stolen unlock token has a short useful life.
 */

const ADMIN_UNLOCK_TTL = '12h';
const ADMIN_UNLOCK_TTL_MS = 12 * 60 * 60 * 1000;

interface AdminUnlockPayload {
  uid: string;
  purpose: 'admin_unlock';
}

/** Constant-time comparison so passphrase checking isn't timing-oracle-able. */
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify the passphrase and issue an unlock token for the calling admin.
 * Must run after `authenticate` and `authorize('admin')` — req.user is
 * required, and only an admin role can ever obtain one of these.
 */
export function issueAdminUnlock(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();

  if (!env.ADMIN_ACCESS_PASSPHRASE) {
    // Development-only escape hatch — production startup already refuses
    // to boot without this set (see config/env.ts), so this branch is
    // unreachable there.
    logger.warn('Security: ADMIN_ACCESS_PASSPHRASE is unset — admin unlock is disabled in this environment');
    throw ApiError.internal('Admin access is not configured in this environment.');
  }

  const { passphrase } = req.body as { passphrase?: string };
  if (!passphrase || !safeEquals(passphrase, env.ADMIN_ACCESS_PASSPHRASE)) {
    logger.warn('Security: failed admin unlock attempt', { uid: req.user.uid, ip: req.ip });
    throw ApiError.unauthorized('Incorrect passphrase.');
  }

  const token = jwt.sign(
    { uid: req.user.uid, purpose: 'admin_unlock' } satisfies AdminUnlockPayload,
    env.JWT_SECRET,
    { expiresIn: ADMIN_UNLOCK_TTL }
  );

  logger.info('Admin unlock granted', { uid: req.user.uid });

  res.json({
    success: true,
    data: { unlockToken: token, expiresInMs: ADMIN_UNLOCK_TTL_MS },
    message: 'Admin access unlocked.',
  });
}

/**
 * Requires a valid, non-expired unlock token bound to the current caller.
 * Must run after `authenticate` (req.user must already be set).
 */
export function requireAdminUnlock(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());

  const header = req.headers['x-admin-unlock'];
  const token = Array.isArray(header) ? header[0] : header;

  if (!token || typeof token !== 'string') {
    return next(ApiError.forbidden('Admin access is locked. Unlock it with the admin passphrase first.'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AdminUnlockPayload;

    if (decoded.purpose !== 'admin_unlock') {
      return next(ApiError.forbidden('Invalid admin unlock token.'));
    }
    if (decoded.uid !== req.user.uid) {
      // Not this admin's unlock token — never honour it, even for another
      // admin account.
      logger.warn('Security: admin unlock token used by a different account than it was issued to', {
        tokenUid: decoded.uid,
        callerUid: req.user.uid,
      });
      return next(ApiError.forbidden('This unlock token does not belong to your account.'));
    }

    next();
  } catch {
    return next(ApiError.forbidden('Admin access is locked or the unlock has expired. Unlock it again.'));
  }
}
