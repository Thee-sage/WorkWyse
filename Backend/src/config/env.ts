import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env BEFORE anything else
dotenv.config();

/** Coerce common truthy strings ("1", "true", "yes") into a boolean. */
const boolish = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return defaultValue;
      return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
    });

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),

  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Email (Gmail SMTP)
  GMAIL_USER: z.string().email('GMAIL_USER must be a valid email'),
  GMAIL_APP_PASSWORD: z.string().min(1, 'GMAIL_APP_PASSWORD is required'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // LinkedIn OAuth
  LINKEDIN_CLIENT_ID: z.string().min(1, 'LINKEDIN_CLIENT_ID is required'),
  LINKEDIN_CLIENT_SECRET: z.string().min(1, 'LINKEDIN_CLIENT_SECRET is required'),
  LINKEDIN_REDIRECT_URI: z.string().default('http://localhost:3000/auth/linkedin/callback'),

  // Cloudinary (optional — upload endpoint checks at runtime)
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),

  // TraceOps observability (optional)
  TRACEOPS_ENDPOINT: z.string().default(''),
  TRACEOPS_API_KEY: z.string().default(''),

  // ─── Deployment topology ──────────────────────────────────────────
  // Azure App Service terminates TLS at a front-end reverse proxy and
  // forwards X-Forwarded-* headers. Express must be told how many proxy
  // hops to trust or req.ip resolves to the proxy address, which collapses
  // every visitor into a single rate-limit bucket. 1 is correct for a
  // stock App Service; raise it if you add Front Door or a CDN in front.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),

  // The refresh cookie travels from the Vercel frontend to the Azure
  // backend. Those are different registrable domains, so the exchange is
  // cross-site and requires SameSite=None; Secure. 'lax'/'strict' silently
  // drop the cookie and break every refresh in production.
  COOKIE_SAMESITE: z.enum(['none', 'lax', 'strict']).optional(),
  COOKIE_SECURE: boolish(false),
  // Optional: share the cookie across subdomains (e.g. ".workwyse.com").
  COOKIE_DOMAIN: z.string().default(''),

  // ─── Rate limiting ────────────────────────────────────────────────
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(600),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  // Disable only for load testing against a throwaway environment.
  RATE_LIMIT_ENABLED: boolish(true),

  // ─── Outbound fetch hardening (SSRF) ──────────────────────────────
  // Permits the URL extractor to reach private/loopback addresses. This
  // must stay false in production; it exists so local development can
  // point the extractor at a fixture server on localhost.
  ALLOW_PRIVATE_NETWORK_FETCH: boolish(false),

  // ─── Admin access passphrase ────────────────────────────────────────
  // A second factor required to unlock admin actions, on top of having an
  // 'admin' role account. An admin account alone is not enough to reach
  // the admin surface — the caller must also know this passphrase. Unset
  // in development is tolerated (the check is skipped) so local admin
  // work isn't blocked; unset in production is a fatal misconfiguration,
  // since it would otherwise mean the admin surface has no second factor
  // at all in the environment that matters most.
  ADMIN_ACCESS_PASSPHRASE: z.string().default(''),

  // ─── Logging ──────────────────────────────────────────────────────
  // Azure App Service containers have an ephemeral, sometimes read-only
  // application directory. File transports are opt-in so a failed write
  // cannot take the process down; stdout is collected by App Service logs.
  LOG_TO_FILE: boolish(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;
const isProd = data.NODE_ENV === 'production';

// Defaults that depend on NODE_ENV, applied after parsing so an explicit
// value in the environment always wins.
const cookieSameSite = data.COOKIE_SAMESITE ?? (isProd ? 'none' : 'lax');
// SameSite=None is rejected by browsers unless the cookie is also Secure.
const cookieSecure = data.COOKIE_SECURE || isProd || cookieSameSite === 'none';

const env = {
  ...data,
  COOKIE_SAMESITE: cookieSameSite,
  COOKIE_SECURE: cookieSecure,
};

// ─── Fail-fast production safety checks ─────────────────────────────
// These are configuration mistakes that produce a silently broken or
// insecure deployment rather than a crash, so they are checked explicitly.
const fatal: string[] = [];

if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
  fatal.push(
    'JWT_SECRET and JWT_REFRESH_SECRET must be different — sharing one secret lets a ' +
      'refresh token be replayed as an access token if any type check is ever missed.'
  );
}

if (isProd) {
  if (env.CORS_ORIGIN.split(',').some((o) => o.trim() === '*')) {
    fatal.push('CORS_ORIGIN must not be "*" in production — credentialed CORS requires exact origins.');
  }
  if (env.CORS_ORIGIN.split(',').some((o) => o.trim().startsWith('http://'))) {
    fatal.push('CORS_ORIGIN must use https:// in production.');
  }
  if (cookieSameSite === 'none' && !cookieSecure) {
    fatal.push('COOKIE_SAMESITE=none requires COOKIE_SECURE=true.');
  }
  if (env.ALLOW_PRIVATE_NETWORK_FETCH) {
    fatal.push('ALLOW_PRIVATE_NETWORK_FETCH must be false in production — it disables SSRF protection.');
  }
  if (!env.ADMIN_ACCESS_PASSPHRASE || env.ADMIN_ACCESS_PASSPHRASE.length < 16) {
    fatal.push(
      'ADMIN_ACCESS_PASSPHRASE must be set to a value at least 16 characters long in production — ' +
        'without it the admin surface has no second factor beyond the account role.'
    );
  }
  for (const [key, value] of Object.entries({
    JWT_SECRET: env.JWT_SECRET,
    JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
  })) {
    if (/^(your-|changeme|secret|test)/i.test(value)) {
      fatal.push(`${key} still looks like a placeholder value.`);
    }
  }
}

if (fatal.length > 0) {
  console.error('❌ Unsafe configuration — refusing to start:');
  for (const msg of fatal) console.error(`   • ${msg}`);
  process.exit(1);
}

export default env;
