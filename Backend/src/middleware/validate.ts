import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Generic Zod validation middleware.
 * Validates req.body, req.query, and/or req.params against provided schemas.
 *
 * Note: In Express 5, req.query and req.params are read-only getters.
 * We parse them for validation only (to catch bad input) but do NOT
 * reassign them — the original values are passed through untouched.
 * req.body is still writable, so we do reassign it with parsed values.
 */
export const validate = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        // Validate only — req.query is read-only in Express 5
        schema.query.parse(req.query);
      }
      if (schema.params) {
        // Validate only — req.params is read-only in Express 5
        schema.params.parse(req.params);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return next(ApiError.badRequest(messages));
      }
      next(err);
    }
  };
};
