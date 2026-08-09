import { Request, Response, NextFunction } from 'express';
import '../types/express';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';

// ─── Permission Map ──────────────────────────────────────────────────
// Maps permission strings to the roles that hold them.

const PERMISSIONS: Record<string, Array<'user' | 'admin' | 'moderator'>> = {
  // Jobs
  'jobs:create': ['user', 'admin', 'moderator'],
  'jobs:update:own': ['user', 'admin', 'moderator'],
  'jobs:delete:own': ['user', 'admin', 'moderator'],
  'jobs:delete:any': ['admin'],

  // Reports
  'reports:create': ['user', 'admin', 'moderator'],
  'reports:review': ['admin', 'moderator'],
  'reports:view:all': ['admin', 'moderator'],

  // Companies
  'companies:create': ['user', 'admin', 'moderator'],
  'companies:delete:any': ['admin'],

  // Admin
  'admin:users:list': ['admin'],
  'admin:users:role': ['admin'],
  'analytics:view': ['admin', 'moderator'],
};

/**
 * Middleware factory: gates a route on a specific permission.
 * Must be used AFTER the `authenticate` middleware.
 */
export const requirePermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) {
      // Unknown permission — fail closed
      logger.error('RBAC: unknown permission requested', { permission });
      return next(ApiError.internal('Unknown permission'));
    }

    if (!allowedRoles.includes(req.user.role as any)) {
      logger.warn('RBAC: permission denied', {
        uid: req.user.uid,
        role: req.user.role,
        permission,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }

    next();
  };
};
