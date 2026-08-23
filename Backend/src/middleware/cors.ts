import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import env from '../config/env';
import logger from '../config/logger';
import { ApiError } from '../utils/ApiError';

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * Vercel creates a fresh preview domain for every deployment, so preview
 * origins cannot be enumerated ahead of time. Setting CORS_ORIGIN to a value
 * containing a `*` wildcard segment (for example
 * "https://*.vercel.app,https://workwyse.com") matches those previews without
 * falling back to a blanket allow-all, which credentialed CORS forbids anyway.
 */
function originMatches(origin: string): boolean {
  return allowedOrigins.some((allowed) => {
    if (allowed === origin) return true;
    if (!allowed.includes("*")) return false;

    // Glob match without building a regex, so no pattern from the
    // environment can be interpreted as regex syntax. Each "*" matches a
    // run of characters that contains no dot and no slash, which keeps
    // "https://*.vercel.app" from also matching
    // "https://evil.com/.vercel.app" or a deeper attacker-controlled
    // subdomain.
    const segments = allowed.split("*");
    let cursor = 0;

    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      const isFirst = index === 0;
      const isLast = index === segments.length - 1;

      if (isFirst) {
        if (!origin.startsWith(segment)) return false;
        cursor = segment.length;
        continue;
      }

      const found = isLast && segment !== ""
        ? (origin.endsWith(segment) ? origin.length - segment.length : -1)
        : origin.indexOf(segment, cursor);

      if (found < cursor) return false;

      // The text the wildcard consumed must not cross a label or path
      // boundary.
      const consumed = origin.slice(cursor, found);
      if (consumed.includes(".") || consumed.includes("/")) return false;

      cursor = found + segment.length;
    }

    if (segments[segments.length - 1] === "") {
      // Pattern ended with "*" — the remainder must still be one segment.
      const tail = origin.slice(cursor);
      return !tail.includes(".") && !tail.includes("/");
    }

    return cursor === origin.length;
  });
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Requests with no Origin header are same-origin navigations, health
    // probes, and server-to-server calls (curl, Azure's own prober). The
    // browser only enforces CORS when an Origin is present, so allowing
    // these does not widen what a web page can do.
    if (!origin || originMatches(origin)) {
      return callback(null, true);
    }

    logger.warn('Security: CORS origin rejected', { origin });
    // Passing an error here surfaces as a 500 through the error handler.
    // Returning `false` instead makes the cors package omit the
    // Access-Control-Allow-Origin header, which is what actually blocks the
    // browser, and lets the request continue to the guard below.
    return callback(null, false);
  },
  credentials: true,
  // Explicit rather than reflected, so a stray header cannot be smuggled in.
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  optionsSuccessStatus: 204,
  // Cache the preflight so a chatty SPA is not doubling its request count.
  maxAge: 86_400,
};

const baseCors = cors(corsOptions);

/**
 * CORS plus an explicit rejection for disallowed origins.
 *
 * Omitting the allow-origin header is enough to stop a browser, but the
 * request still reaches the route and consumes database work. Rejecting it
 * with a 403 keeps the behaviour observable in logs and in tests.
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  baseCors(req, res, (err?: unknown) => {
    if (err) return next(err);

    const origin = req.headers.origin;
    if (origin && !originMatches(origin)) {
      return next(ApiError.forbidden('Origin not allowed'));
    }

    next();
  });
};
