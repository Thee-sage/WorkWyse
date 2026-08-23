import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';
import env from '../config/env';

/**
 * Errors thrown by middleware rather than by application code.
 *
 * body-parser and multer signal failures with their own shapes. Before these
 * were handled, an oversized body or a malformed JSON document fell through
 * to the generic branch and came back as a 500 — which tells the client to
 * retry a request that can never succeed, and hides a client mistake behind
 * what looks like a server fault.
 */
interface MiddlewareError extends Error {
  /** body-parser: 'entity.too.large', 'entity.parse.failed', ... */
  type?: string;
  /** multer: 'LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', ... */
  code?: string | number;
  /** http-errors convention, set by body-parser. */
  status?: number;
  statusCode?: number;
  /** http-errors: true when the message is safe to show a client. */
  expose?: boolean;
}

/** Map a body-parser or multer failure to its correct status and message. */
function classifyMiddlewareError(
  err: MiddlewareError
): { statusCode: number; message: string } | null {
  switch (err.type) {
    case 'entity.too.large':
      return { statusCode: 413, message: 'Request body is too large.' };
    case 'entity.parse.failed':
      return { statusCode: 400, message: 'Request body is not valid JSON.' };
    case 'entity.verify.failed':
      return { statusCode: 400, message: 'Request body failed verification.' };
    case 'encoding.unsupported':
      return { statusCode: 415, message: 'Unsupported content encoding.' };
    case 'charset.unsupported':
      return { statusCode: 415, message: 'Unsupported charset.' };
    case 'request.aborted':
      return { statusCode: 400, message: 'Request aborted.' };
    default:
      break;
  }

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return { statusCode: 413, message: 'File is too large.' };
    case 'LIMIT_FILE_COUNT':
      return { statusCode: 400, message: 'Too many files uploaded.' };
    case 'LIMIT_UNEXPECTED_FILE':
      return { statusCode: 400, message: 'Unexpected file field.' };
    case 'LIMIT_PART_COUNT':
    case 'LIMIT_FIELD_KEY':
    case 'LIMIT_FIELD_VALUE':
    case 'LIMIT_FIELD_COUNT':
      return { statusCode: 400, message: 'Upload exceeded a form limit.' };
    default:
      break;
  }

  // Generic http-errors instances: honour an exposed 4xx, but never let an
  // arbitrary error dictate a 5xx status or leak its own message.
  const status = err.status ?? err.statusCode;
  if (err.expose === true && typeof status === 'number' && status >= 400 && status < 500) {
    return { statusCode: status, message: err.message };
  }

  return null;
}

/**
 * Centralized error-handling middleware.
 * Must be registered AFTER all routes.
 */
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Default values
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  // Our custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  } else {
    const classified = classifyMiddlewareError(err as MiddlewareError);
    if (classified) {
      statusCode = classified.statusCode;
      message = classified.message;
      isOperational = true;
    }
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    // The raw mongoose message embeds field paths and the rejected values.
    // Requests are already validated by Zod at the edge, so anything
    // reaching here is a schema mismatch that the client cannot act on.
    message = 'Submitted data failed validation.';
    isOperational = true;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    isOperational = true;
  }

  // Mongoose duplicate key error
  if ((err as MiddlewareError).code === 11000) {
    statusCode = 409;
    message = 'Duplicate value — this record already exists';
    isOperational = true;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
  }

  // Log the error
  if (!isOperational) {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      requestId: (req as Request & { id?: string }).id,
    });
  } else {
    logger.warn(`${statusCode} ${message}`, {
      path: req.path,
      method: req.method,
      requestId: (req as Request & { id?: string }).id,
    });
  }

  res.status(statusCode).json({
    success: false,
    message: env.NODE_ENV === 'production' && !isOperational ? 'Internal server error' : message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
