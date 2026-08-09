import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

// Load and validate env FIRST — crashes if misconfigured
import env from './config/env';
import logger from './config/logger';

// ─── TraceOps Observability ──────────────────────────────────────────
import TraceOps from 'traceops-sdk';
if (env.TRACEOPS_ENDPOINT) {
  TraceOps.init({
    endpoint: env.TRACEOPS_ENDPOINT,
    serviceName: 'workwyse-backend',
    apiKey: env.TRACEOPS_API_KEY || undefined,
  });
  logger.info('🔍 TraceOps observability enabled');
}

import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { corsMiddleware } from './middleware/cors';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { connectDB, disconnectDB } from './config/database';

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

const app = express();

// ─── Security Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(hpp());
app.use(corsMiddleware);
app.use(globalLimiter);

// ─── Body Parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── Logging ────────────────────────────────────────────────────────
app.use(
  morgan('dev', {
    stream: { write: (message: string) => logger.http(message.trim()) },
  })
);

// ─── Routes ─────────────────────────────────────────────────────────
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

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'OK', message: 'WorkWyse API is running' });
});

// ─── 404 handler ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Centralized Error Handler (must be LAST) ───────────────────────
app.use(errorHandler);

// ─── TraceOps Express Middleware (after errorHandler) ───────────────
if (env.TRACEOPS_ENDPOINT) {
  TraceOps.express(app);
}

// ─── Start Server ───────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(env.PORT, () => {
      logger.info(` Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
      logger.info(` API Base: http://localhost:${env.PORT}/api`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();

export default app;