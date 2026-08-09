import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';
import env from '../config/env';

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
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    isOperational = true;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    isOperational = true;
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
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
    });
  } else {
    logger.warn(`${statusCode} ${message}`, { path: req.path, method: req.method });
  }

  res.status(statusCode).json({
    success: false,
    message: env.NODE_ENV === 'production' && !isOperational ? 'Internal server error' : message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
