import mongoose from 'mongoose';
import env from './env';
import logger from './logger';

/**
 * MongoDB connection management with automatic recovery.
 *
 * The previous implementation called process.exit(1) when the first
 * connection attempt failed. On Azure App Service that turns a few seconds
 * of Atlas unavailability — a failover, a brief network blip, a cold start
 * racing DNS — into a container crash loop, and App Service backs off
 * restarts after repeated failures. Retrying with exponential backoff keeps
 * the process alive and lets it heal on its own once the database returns.
 *
 * Mongoose already reconnects by itself after an initial successful
 * connection; the retry loop here covers the initial connect, and the event
 * handlers keep `isDbHealthy()` accurate so the readiness probe can pull the
 * instance out of rotation while it is disconnected.
 */

const MAX_INITIAL_ATTEMPTS = 10;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;

let connected = false;

/** Readiness signal consumed by the /health/ready probe. */
export const isDbHealthy = (): boolean =>
  connected && mongoose.connection.readyState === 1;

export const getDbState = (): string => {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] ?? 'unknown';
};

function registerConnectionHandlers(): void {
  mongoose.connection.on('connected', () => {
    connected = true;
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    connected = false;
    logger.error('MongoDB disconnected — readiness probe will report unhealthy until it recovers');
  });

  mongoose.connection.on('reconnected', () => {
    connected = true;
    logger.info('MongoDB reconnected');
  });

  // Without a listener, a connection-level error is emitted as an unhandled
  // 'error' event and takes the whole process down.
  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error', { error: (error as Error)?.message });
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDB = async (): Promise<void> => {
  registerConnectionHandlers();

  for (let attempt = 1; attempt <= MAX_INITIAL_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        family: 4,
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000,
        // Bound the pool so a traffic spike cannot exhaust Atlas connection
        // limits; App Service can run several instances against one cluster.
        maxPoolSize: 20,
        minPoolSize: 2,
        // Surface a dead socket rather than hanging a request forever.
        socketTimeoutMS: 45_000,
      });
      connected = true;
      logger.info('MongoDB connected successfully');
      return;
    } catch (error) {
      const isLastAttempt = attempt === MAX_INITIAL_ATTEMPTS;
      // Exponential backoff with jitter so parallel instances restarting
      // together do not retry in lockstep.
      const delay = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
      const jittered = Math.round(delay * (0.5 + Math.random() * 0.5));

      logger.error('MongoDB connection attempt failed', {
        attempt,
        of: MAX_INITIAL_ATTEMPTS,
        retryInMs: isLastAttempt ? null : jittered,
        error: (error as Error)?.message,
      });

      if (isLastAttempt) {
        // Give up on blocking startup, but do not kill the process — the
        // server still serves /health, and mongoose keeps retrying in the
        // background so the instance can recover without a restart.
        logger.error('MongoDB unreachable after all initial attempts — starting in degraded mode');
        return;
      }

      await sleep(jittered);
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    connected = false;
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('MongoDB disconnection error', { error: (error as Error)?.message });
  }
};
