import { z } from 'zod';

// ─── Password strength helper ────────────────────────────────────────
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// ─── Registration ────────────────────────────────────────────────────

export const registerSchema = {
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, dots, and hyphens'),
    email: z.string().email('Invalid email format').max(254),
    password: strongPassword,
    userType: z.enum(['public', 'private']).optional().default('public'),
  }),
};

export const verifyOtpSchema = {
  body: z.object({
    email: z.string().email('Invalid email format'),
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  }),
};

// ─── Login ───────────────────────────────────────────────────────────

export const loginSchema = {
  body: z.object({
    // Accepts either email or username in a single field
    identifier: z.string().min(1, 'Email or username is required').max(254),
    password: z.string().min(1, 'Password is required'),
  }),
};

// ─── Forgot Password flow ─────────────────────────────────────────────

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email('Invalid email format'),
  }),
};

export const verifyResetOtpSchema = {
  body: z.object({
    email: z.string().email('Invalid email format'),
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    resetToken: z.string().min(1, 'Reset token is required'),
    newPassword: strongPassword,
  }),
};

// ─── Token & Settings ─────────────────────────────────────────────────

// Finding 7.3 — refreshToken is now primarily read from an httpOnly cookie.
export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
};

export const updateUserTypeSchema = {
  body: z.object({
    userType: z.enum(['public', 'private'], {
      message: 'userType must be either "public" or "private"',
    }),
  }),
};
