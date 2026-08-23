import winston from 'winston';
import env from './env';

const { combine, timestamp, printf, colorize, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

const prodFormat = combine(timestamp(), json());

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    // File transports are opt-in via LOG_TO_FILE. An Azure App Service
    // container has an ephemeral and sometimes read-only application
    // directory, so an unconditional file transport can throw on write or
    // quietly fill the instance disk. stdout is what App Service collects.
    ...(env.LOG_TO_FILE
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 5_242_880, maxFiles: 3 }),
          new winston.transports.File({ filename: 'logs/combined.log', maxsize: 5_242_880, maxFiles: 3 }),
        ]
      : []),
  ],
  silent: env.NODE_ENV === 'test',
});

export default logger;
