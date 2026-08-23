import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import crypto from 'crypto';

import env from './config/env';
import logger from './config/logger';
import { isDbHealthy, getDbState } from './config/database';
import { corsMiddleware } from './middleware/cors';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import jobsRouter from './routes/jobs';
import companiesRouter from './routes/companies';
import reportsRouter from './routes/reports';
import uploadRouter from './routes/upload';
import analyticsRouter from './routes/analytics';
import activityRouter from './routes/activity';
import notificationsRouter from './routes/notifications';
import commentsRouter from './routes/comments';
import exportRouter from './routes/export';
import adminRouter from './routes/admin';
import usersRouter from './routes/users';
import extensionRouter from './routes/extension';

/**
 * Build the Express application.
 *
 * This is separated from server startup so the exact production middleware
 * stack — helmet, CORS, rate limiting, body limits, the error handler — can
 * be exercised by the test suite. Importing the old app.ts started a real
 * listener and opened a database connection as a side effect, which meant
 * tests had to rebuild a partial stack by hand and therefore never covered
 * the security middleware at all.
 */
/** Body limit for the CSV import route — roughly ten thousand rows. */
const LARGE_BODY_LIMIT = '1mb';

export function createApp(): Application {
  const app = express();

  // ─── Proxy awareness ──────────────────────────────────────────────
  // Azure App Service terminates TLS at a front end and forwards
  // X-Forwarded-For / X-Forwarded-Proto. Without this, req.ip is the
  // proxy's address (so every client shares one rate-limit bucket) and
  // req.secure is always false. The value is a hop count rather than
  // `true`: trusting every proxy header lets a client spoof X-Forwarded-For
  // and evade IP-based limits entirely.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);

  // Do not advertise the framework.
  app.disable('x-powered-by');

  // ─── Request correlation ──────────────────────────────────────────
  app.use((req: Request, res: Response, next: NextFunction) => {
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && /^[\w-]{1,128}$/.test(incoming)
        ? incoming
        : crypto.randomUUID();
    (req as Request & { id: string }).id = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  // ─── Security Middleware ──────────────────────────────────────────
  app.use(
    helmet({
      // Strict-Transport-Security: Azure serves the API over HTTPS, and the
      // browser should refuse to downgrade after the first visit.
      hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
      // This service returns JSON, never markup, so the strictest CSP is
      // free of charge and neutralises any HTML that slips into a response.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      // Allow the frontend on a different origin to read allowed responses;
      // CORS remains the actual gate.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
    })
  );

  // Browsers must not sniff a JSON error body as HTML.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Nothing here should ever be cached by a shared proxy.
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use(hpp());
  app.use(corsMiddleware);
  app.use(globalLimiter);

  // ─── Body Parsing ─────────────────────────────────────────────────
  // 10kb covers every JSON endpoint except the CSV import, which receives
  // a whole spreadsheet in one string field.
  //
  // The limit has to be chosen here rather than by mounting a second parser
  // on the export router: the first express.json in the chain consumes the
  // stream, so a later parser with a larger limit never sees the body and
  // the request is rejected with 413 before it reaches the route.
  const standardJson = express.json({ limit: '10kb' });
  const largeJson = express.json({ limit: LARGE_BODY_LIMIT });

  app.use((req, res, next) =>
    req.path.startsWith('/api/export') ? largeJson(req, res, next) : standardJson(req, res, next)
  );
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());

  // ─── Logging ──────────────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(
      morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
        stream: { write: (message: string) => logger.http(message.trim()) },
        // Probe traffic would otherwise dominate the logs.
        skip: (req) => req.path.startsWith('/health'),
      })
    );
  }

  // ─── Health checks ────────────────────────────────────────────────
  // Liveness: is the process up? Azure restarts the container when this
  // fails, so it must not depend on any downstream service — a database
  // outage should take the instance out of rotation, not restart it.
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      status: 'OK',
      message: 'WorkWyse API is running',
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  // Readiness: can this instance actually serve requests? Point the Azure
  // App Service health check at this path.
  app.get('/health/ready', (_req: Request, res: Response) => {
    const dbUp = isDbHealthy();
    res.status(dbUp ? 200 : 503).json({
      success: dbUp,
      status: dbUp ? 'READY' : 'DEGRADED',
      checks: { database: getDbState() },
    });
  });

  // ─── Routes ───────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/jobs/:id/comments', commentsRouter);
  app.use('/api/companies', companiesRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/export', exportRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/users', usersRouter);
  // Not linked from anywhere in the web app UI — see routes/extension.ts.
  app.use('/api/extension', extensionRouter);

  // ─── 404 handler ──────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // ─── Centralized Error Handler (must be LAST) ─────────────────────
  app.use(errorHandler);

  return app;
}

export default createApp;
