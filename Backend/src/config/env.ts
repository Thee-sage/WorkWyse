import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env BEFORE anything else
dotenv.config();

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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;
export default env;
