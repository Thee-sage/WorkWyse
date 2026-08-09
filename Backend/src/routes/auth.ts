import express from 'express';
import AuthController from '../controllers/AuthController';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  refreshTokenSchema,
  updateUserTypeSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} from '../validators/auth.schema';

const router = express.Router();

// ─── Public routes (rate-limited) ────────────────────────────────────

router.post('/register', otpLimiter, validate(registerSchema), AuthController.register);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), AuthController.verifyOTP);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refreshToken);

// ─── Forgot Password flow (rate-limited to prevent abuse) ────────────

router.post('/forgot-password', otpLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/verify-reset-otp', authLimiter, validate(verifyResetOtpSchema), AuthController.verifyResetOtp);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), AuthController.resetPassword);

// ─── Protected routes ────────────────────────────────────────────────

router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);
router.put('/user-type', authenticate, validate(updateUserTypeSchema), AuthController.updateUserType);

// ─── LinkedIn verification (must be logged in) ────────────────────────

router.get('/linkedin', authenticate, AuthController.linkedinAuth);
router.post('/linkedin/callback', authenticate, AuthController.linkedinCallback);

export default router;