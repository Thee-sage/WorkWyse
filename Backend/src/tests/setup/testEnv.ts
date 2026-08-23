/**
 * Populates process.env before any module is imported.
 *
 * Registered via jest.config.js `setupFiles`, which runs before the module
 * registry is loaded for each test file. Seeding real values here means the
 * suite exercises the actual config/env.ts — its Zod schema, its derived
 * cookie defaults, and its production safety checks — instead of a hand
 * written mock that silently drifts out of sync whenever a variable is
 * added.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/workwyse-test';

// Distinct secrets: config/env.ts refuses to start when they match.
process.env.JWT_SECRET = 'a-test-secret-that-is-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'a-refresh-secret-that-is-at-least-32-characters-long!!';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';

process.env.GMAIL_USER = 'test@example.com';
process.env.GMAIL_APP_PASSWORD = 'test-app-password';

process.env.CORS_ORIGIN = 'http://localhost:3000,https://workwyse.vercel.app';

process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id';
process.env.LINKEDIN_CLIENT_SECRET = 'test-linkedin-client-secret';
process.env.LINKEDIN_REDIRECT_URI = 'http://localhost:3000/auth/linkedin/callback';

process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

// Never emit telemetry from a test run.
process.env.TRACEOPS_ENDPOINT = '';
process.env.TRACEOPS_API_KEY = '';

process.env.TRUST_PROXY_HOPS = '1';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.RATE_LIMIT_GLOBAL_MAX = '600';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.ALLOW_PRIVATE_NETWORK_FETCH = 'false';
process.env.ADMIN_ACCESS_PASSPHRASE = 'test-admin-passphrase-at-least-16-chars';
process.env.LOG_TO_FILE = 'false';
