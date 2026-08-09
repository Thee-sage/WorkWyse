import { Request, Response, NextFunction } from 'express';
import '../types/express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';

interface JwtPayload {
  uid: string;
  username: string;
  role: 'user' | 'admin' | 'moderator';
  isEmailVerified: boolean;
  type: 'access' | 'refresh';
}

/**
 * Verify JWT access token from Authorization header.
 * Attaches decoded user to req.user.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Access token is required'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Finding 7.1 — reject refresh tokens used as access tokens
    if (decoded.type !== 'access') {
      logger.warn('Security: refresh token used as bearer token', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      return next(ApiError.unauthorized('Invalid token type. Use an access token.'));
    }

    req.user = {
      uid: decoded.uid,
      username: decoded.username,
      role: decoded.role,
      isEmailVerified: decoded.isEmailVerified ?? false,
    };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Access token expired'));
    }
    logger.warn('Security: invalid bearer token', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      error: err.message,
    });
    return next(ApiError.unauthorized('Invalid access token'));
  }
};

/**
 * Optional auth — attaches user if token is present, but doesn't reject if missing.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    // Only accept access tokens (silently ignore refresh tokens)
    if (decoded.type === 'access') {
      req.user = {
        uid: decoded.uid,
        username: decoded.username,
        role: decoded.role,
        isEmailVerified: decoded.isEmailVerified ?? false,
      };
    }
  } catch {
    // Token invalid — treat as unauthenticated, no error
  }

  next();
};

/**
 * Requires the authenticated user to have a verified email.
 * Must be used AFTER authenticate middleware.
 * Protects actions like voting, commenting, creating jobs.
 */
export const requireVerified = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (!req.user.isEmailVerified) {
    logger.warn('Security: unverified account attempted protected action', {
      uid: req.user.uid,
      path: req.path,
      method: req.method,
    });
    return next(
      ApiError.forbidden(
        'Email verification required. Please verify your email before performing this action.'
      )
    );
  }

  next();
};

/**
 * Role-based authorization. Must be used AFTER authenticate middleware.
 */
export const authorize = (...roles: Array<'user' | 'admin' | 'moderator'>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role as any)) {
      logger.warn('Security: authorization failure', {
        uid: req.user.uid,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }

    next();
  };
};