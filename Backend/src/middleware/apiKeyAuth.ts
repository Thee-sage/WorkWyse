import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import ApiKey, { ApiKeyScope } from '../models/ApiKey';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';

/**
 * Authenticates non-browser clients (the future WorkWyse extension, or any
 * other API integration) via a static bearer key rather than the cookie +
 * short-lived-JWT flow used by the web app.
 *
 * Kept as its own middleware, separate from middleware/auth.ts, because the
 * two credential types must never be interchangeable: a leaked extension
 * key should not be usable to mint session behaviour, and a web session
 * token should not work here either. req.apiKey is a distinct field from
 * req.user for the same reason — a handler can tell at a glance which kind
 * of caller it is serving.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        userId?: string;
        scopes: ApiKeyScope[];
      };
    }
  }
}

function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/** Middleware factory: requires a valid API key holding the given scope. */
export const requireApiKey = (scope: ApiKeyScope) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers['x-api-key'];
    const rawKey = Array.isArray(header) ? header[0] : header;

    if (!rawKey || typeof rawKey !== 'string') {
      return next(ApiError.unauthorized('X-API-Key header is required'));
    }

    try {
      const keyHash = hashKey(rawKey);
      const record = await ApiKey.findOne({ keyHash });

      if (!record || record.revokedAt) {
        logger.warn('Security: invalid or revoked API key presented', {
          path: req.path,
          ip: req.ip,
        });
        return next(ApiError.unauthorized('Invalid API key'));
      }

      if (!record.scopes.includes(scope)) {
        logger.warn('Security: API key missing required scope', {
          path: req.path,
          scope,
          keyId: record._id,
        });
        return next(ApiError.forbidden('This API key does not have the required scope'));
      }

      req.apiKey = {
        id: (record._id as any).toString(),
        userId: record.userId?.toString(),
        scopes: record.scopes,
      };

      // Best-effort — a failed write here must never block the request.
      ApiKey.updateOne({ _id: record._id }, { lastUsedAt: new Date() }).catch(() => {});

      next();
    } catch (err) {
      logger.error('API key lookup failed', { err });
      next(ApiError.internal('Could not validate API key'));
    }
  };
};
