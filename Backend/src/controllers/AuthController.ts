import { Request, Response } from 'express';
import '../types/express';
import AuthService from '../services/AuthService';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { REFRESH_COOKIE, setRefreshCookie, clearRefreshCookie } from '../utils/cookie';
import { ApiError } from '../utils/ApiError';

const AuthController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.register(req.body);
    ApiResponse.success(res, result, 'OTP sent to your email. Please verify to complete registration.');
  }),

  /**
   * Verify registration OTP and issue tokens.
   * Finding 7.3: refresh token is set as an httpOnly cookie.
   */
  verifyOTP: catchAsync(async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const result = await AuthService.verifyOTP(email, otp);
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...responseData } = result;
    ApiResponse.created(res, responseData, 'Registration successful!');
  }),

  /**
   * Login — accepts email or username in the `identifier` field.
   * Finding 7.3: refresh token is set as an httpOnly cookie.
   */
  login: catchAsync(async (req: Request, res: Response) => {
    const { identifier, password } = req.body;
    const result = await AuthService.login(identifier, password);
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...responseData } = result;
    ApiResponse.success(res, responseData, 'Login successful.');
  }),

  /**
   * Refresh — reads the refresh token from the httpOnly cookie (or body as fallback).
   */
  refreshToken: catchAsync(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] || req.body.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token is required' });
    }
    const tokens = await AuthService.refreshToken(token);
    setRefreshCookie(res, tokens.refreshToken);
    ApiResponse.success(res, { accessToken: tokens.accessToken }, 'Token refreshed.');
  }),

  /**
   * Logout — clears the refresh token cookie.
   */
  logout: catchAsync(async (req: Request, res: Response) => {
    await AuthService.logout(req.user!.uid);
    clearRefreshCookie(res);
    ApiResponse.success(res, null, 'Logged out successfully.');
  }),

  updateUserType: catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.updateUserType(req.user!.uid, req.body.userType);
    ApiResponse.success(res, result, 'User type updated.');
  }),

  getMe: catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.getMe(req.user!.uid);
    ApiResponse.success(res, result, 'User profile fetched.');
  }),

  linkedinAuth: catchAsync(async (_req: Request, res: Response) => {
    const url = AuthService.getLinkedInAuthUrl();
    ApiResponse.success(res, { url }, 'LinkedIn authorization URL generated.');
  }),

  linkedinCallback: catchAsync(async (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code) throw ApiError.badRequest('Missing LinkedIn authorization code.');
    const result = await AuthService.verifyWithLinkedIn(req.user!.uid, code);
    ApiResponse.success(res, result, 'LinkedIn verification successful!');
  }),

  // ─── Forgot Password ───────────────────────────────────────────────

  /**
   * Step 1: Request a password-reset OTP.
   * Always returns 200 to prevent email enumeration.
   */
  forgotPassword: catchAsync(async (req: Request, res: Response) => {
    await AuthService.requestPasswordReset(req.body.email);
    // Always return success regardless of whether the email exists
    ApiResponse.success(
      res,
      null,
      'If an account with that email exists, a reset code has been sent.'
    );
  }),

  /**
   * Step 2: Verify the password-reset OTP.
   * Returns a short-lived reset token on success.
   */
  verifyResetOtp: catchAsync(async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const result = await AuthService.verifyPasswordResetOTP(email, otp);
    ApiResponse.success(res, result, 'OTP verified. You may now set a new password.');
  }),

  /**
   * Step 3: Set a new password using the verified reset token.
   */
  resetPassword: catchAsync(async (req: Request, res: Response) => {
    const { resetToken, newPassword } = req.body;
    await AuthService.resetPassword(resetToken, newPassword);
    ApiResponse.success(res, null, 'Password reset successful. Please log in with your new password.');
  }),
};

export default AuthController;
