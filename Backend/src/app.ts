import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

// Load and validate env FIRST — refuses to start if misconfigured
import env from './config/env';
import logger from './config/logger';

// ─── TraceOps Observability ──────────────────────────────────────────
// NOTE: this ships request telemetry to an external endpoint. Leave
// TRACEOPS_ENDPOINT unset in production unless that destination is covered
// by the same confidentiality guarantees as the database.
import TraceOps from 'traceops-sdk';
if (env.TRACEOPS_ENDPOINT) {
  TraceOps.init({
    endpoint: env.TRACEOPS_ENDPOINT,
    serviceName: 'workwyse-backend',
    apiKey: env.TRACEOPS_API_KEY || undefined,
  });
  logger.info('TraceOps observability enabled', { endpoint: env.TRACEOPS_ENDPOINT });
}

import type { Server } from 'http';
import createApp from './createApp';
import { connectDB, disconnectDB } from './config/database';
import { warnIfScaledOutWithMemoryStore } from './middleware/rateLimiter';

const app = createApp();

// ─── Process-level crash guards ──────────────────────────────────────
// A rejected promise that nobody handles terminates the process by default
// in modern Node. On Azure that is a hard restart mid-request for every
// in-flight caller. These handlers log the fault and keep serving; a truly
// corrupt process is still replaced, because uncaughtException exits after
// draining connections.
let server: Server | undefined;
let shuttingDown = false;

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception — shutting down after draining connections', {
    error: error.message,
    stack: error.stack,
  });
  // The process state can no longer be trusted, so drain and let App
  // Service start a fresh instance rather than serving from a broken one.
  void shutdown('uncaughtException', 1);
});

/**
 * Graceful shutdown.
 *
 * Azure sends SIGTERM and then force-kills after a grace period, so the
 * drain is bounded by its own timer: a hung keep-alive connection must not
 * be able to hold the old instance open past the deadline.
 */
async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`${signal} received — shutting down gracefully`);

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(exitCode || 1);
  }, 15_000);
  // Do not let the timer itself keep the event loop alive.
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await disconnectDB();
  } catch (error) {
    logger.error('Error during shutdown', { error: (error as Error)?.message });
  } finally {
    clearTimeout(forceExit);
    process.exit(exitCode);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// ─── Start Server ────────────────────────────────────────────────────
const startServer = async () => {
  warnIfScaledOutWithMemoryStore();

  // Start listening first. connectDB retries in the background, and the
  // readiness probe reports DEGRADED until it succeeds — so a slow database
  // delays traffic rather than failing the container's startup probe.
  server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Liveness:  http://localhost:${env.PORT}/health`);
    logger.info(`Readiness: http://localhost:${env.PORT}/health/ready`);
  });

  // Azure's front end idles connections at 240s; keep-alive must outlive it
  // or the proxy reuses a socket the app has already closed, surfacing as
  // sporadic 502s.
  server.keepAliveTimeout = 120_000;
  server.headersTimeout = 125_000;
  // Cap how long a single request may occupy a socket.
  server.requestTimeout = 60_000;

  await connectDB();
};

// Only bootstrap when executed directly, so importing this module (in tests
// or scripts) does not open a port or a database connection.
if (require.main === module) {
  void startServer();
}

export { app, startServer, shutdown };
export default app;
