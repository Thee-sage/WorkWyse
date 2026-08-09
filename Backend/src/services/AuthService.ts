import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User, { IUser } from '../models/User';
import OTP from '../models/OTP';
import { sendOTPEmail, sendPasswordResetEmail } from './emailService';
import { ApiError } from '../utils/ApiError';
import env from '../config/env';
import logger from '../config/logger';

// Maximum failed OTP attempts before the record is invalidated
const MAX_OTP_ATTEMPTS = 5;

class AuthService {
  /**
   * Generate a cryptographically unpredictable 6-digit OTP.
   * Uses crypto.randomInt for uniform distribution (no modulo bias).
   */
  private static generateOTP(): string {
    const { randomInt } = require('crypto');
    return String(randomInt(100000, 999999 + 1)).padStart(6, '0');
  }

  /**
   * Sign access + refresh tokens for a user.
   * Finding 7.1 — uses separate secrets and type claims.
   */
  private static signTokens(user: IUser) {
    const basePayload = {
      uid: user.uid,
      username: user.username,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };

    const accessToken = jwt.sign(
      { ...basePayload, type: 'access' },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY as any }
    );

    const refreshToken = jwt.sign(
      { ...basePayload, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY as any }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Build a clean user object safe to return to clients.
   */
  private static safeUser(user: IUser) {
    return {
      username: user.username,
      uid: user.uid,
      email: user.email,
      type: user.type,
      role: user.role,
      linkedinVerified: user.linkedinVerified,
      linkedinDisplayName: user.linkedinDisplayName,
      linkedinAvatarUrl: user.linkedinAvatarUrl,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Registration
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Register — validates uniqueness (case-insensitive) and sends OTP.
   */
  static async register(data: {
    username: string;
    email: string;
    password: string;
    userType: 'public' | 'private';
  }) {
    const { username, email, password, userType } = data;

    // Normalise to lowercase for uniqueness checks — mirrors `lowercase: true` on schema
    const normalUsername = username.toLowerCase().trim();
    const normalEmail = email.toLowerCase().trim();

    // Case-insensitive duplicate check
    const existing = await User.findOne({
      $or: [{ username: normalUsername }, { email: normalEmail }],
    });
    if (existing) {
      if (existing.username === normalUsername) throw ApiError.conflict('Username already exists.');
      if (existing.email === normalEmail) throw ApiError.conflict('Email already registered.');
    }

    // Clear any existing registration OTPs for this email
    await OTP.deleteMany({ email: normalEmail, purpose: 'registration' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = AuthService.generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({
      email: normalEmail,
      otp: hashedOTP,
      expiresAt,
      purpose: 'registration',
      username: normalUsername,
      password: hashedPassword,
      userType,
    });

    await sendOTPEmail(normalEmail, otp);

    logger.info(`Registration OTP sent: ${normalEmail}`);
    return { email: normalEmail };
  }

  /**
   * Verify registration OTP and complete account creation.
   */
  static async verifyOTP(email: string, otp: string) {
    const normalEmail = email.toLowerCase().trim();
    const otpRecord = await OTP.findOne({ email: normalEmail, purpose: 'registration' });

    if (!otpRecord) {
      throw ApiError.badRequest('No pending registration found. Please register again.');
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      throw ApiError.badRequest('OTP has expired. Please request a new one.');
    }

    // Brute-force guard
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await OTP.deleteOne({ _id: otpRecord._id });
      throw ApiError.badRequest('Too many failed attempts. Please register again.');
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      await OTP.findByIdAndUpdate(otpRecord._id, { $inc: { attempts: 1 } });
      throw ApiError.badRequest('Invalid OTP.');
    }

    const { username, password: hashedPassword, userType } = otpRecord;

    if (!username || !hashedPassword) {
      await OTP.deleteOne({ _id: otpRecord._id });
      throw ApiError.badRequest('Registration data expired. Please start over.');
    }

    // Final duplicate check (race-condition safety)
    const existing = await User.findOne({ $or: [{ username }, { email: normalEmail }] });
    if (existing) {
      await OTP.deleteOne({ _id: otpRecord._id });
      throw ApiError.conflict(
        existing.username === username ? 'Username already exists.' : 'Email already registered.'
      );
    }

    const uid = uuidv4();
    const user = await User.create({
      username,
      email: normalEmail,
      password: hashedPassword,
      uid,
      type: userType || 'public',
      role: 'user',
      isEmailVerified: true,   // OTP confirmed — account is verified
    });

    await OTP.deleteOne({ _id: otpRecord._id });

    const tokens = AuthService.signTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    logger.info(`User registered: ${username}`);
    return { user: AuthService.safeUser(user), ...tokens };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Login (email OR username)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Login — accepts either username or email address (case-insensitive).
   */
  static async login(identifier: string, password: string) {
    const normal = identifier.toLowerCase().trim();

    // Determine if identifier is an email or username
    const isEmail = normal.includes('@');

    const user = isEmail
      ? await User.findOne({ email: normal })
      : await User.findOne({ username: normal });

    // Use a generic message to prevent username/email enumeration
    if (!user) {
      logger.warn('Security: login attempt for unknown identifier', { identifier: normal });
      throw ApiError.unauthorized('Invalid credentials.');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logger.warn('Security: failed login — wrong password', { uid: user.uid });
      throw ApiError.unauthorized('Invalid credentials.');
    }

    // Block login if the account was never OTP-verified
    if (!user.isEmailVerified) {
      logger.warn('Security: login attempt on unverified account', { uid: user.uid });
      throw ApiError.unauthorized(
        'Your email address has not been verified. Please complete registration by entering the OTP sent to your email.'
      );
    }

    const tokens = AuthService.signTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    logger.info(`User logged in: ${user.username}`);
    return { user: AuthService.safeUser(user), ...tokens };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Forgot Password — OTP flow
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Step 1 — Request a password-reset OTP.
   * Always returns success even if the email is not found (prevents enumeration).
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const normalEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalEmail });
    if (!user) {
      // Silent success — do not reveal whether the email exists
      logger.info(`Password reset requested for non-existent email: ${normalEmail}`);
      return;
    }

    // Rate-check: prevent flooding — clear old password_reset OTPs first
    await OTP.deleteMany({ email: normalEmail, purpose: 'password_reset' });

    const otp = AuthService.generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({
      email: normalEmail,
      otp: hashedOTP,
      expiresAt,
      purpose: 'password_reset',
    });

    await sendPasswordResetEmail(normalEmail, user.username, otp);
    logger.info(`Password reset OTP sent to: ${normalEmail}`);
  }

  /**
   * Step 2 — Verify the reset OTP (returns a short-lived reset token).
   */
  static async verifyPasswordResetOTP(email: string, otp: string): Promise<{ resetToken: string }> {
    const normalEmail = email.toLowerCase().trim();
    const otpRecord = await OTP.findOne({ email: normalEmail, purpose: 'password_reset' });

    if (!otpRecord) {
      throw ApiError.badRequest('No password reset request found. Please request a new code.');
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      throw ApiError.badRequest('OTP has expired. Please request a new one.');
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await OTP.deleteOne({ _id: otpRecord._id });
      throw ApiError.badRequest('Too many failed attempts. Please request a new code.');
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      await OTP.findByIdAndUpdate(otpRecord._id, { $inc: { attempts: 1 } });
      throw ApiError.badRequest('Invalid OTP.');
    }

    // OTP verified — issue a short-lived reset token (signed JWT, 15 min)
    const resetToken = jwt.sign(
      { email: normalEmail, purpose: 'password_reset' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Delete OTP now — single use
    await OTP.deleteOne({ _id: otpRecord._id });

    logger.info(`Password reset OTP verified for: ${normalEmail}`);
    return { resetToken };
  }

  /**
   * Step 3 — Set new password using the verified reset token.
   */
  static async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, env.JWT_SECRET);
    } catch {
      throw ApiError.badRequest('Reset token is invalid or has expired. Please start over.');
    }

    if (decoded.purpose !== 'password_reset') {
      throw ApiError.badRequest('Invalid reset token.');
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) throw ApiError.notFound('User not found.');

    // Prevent password reuse
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      throw ApiError.badRequest('New password must be different from your current password.');
    }

    user.password = await bcrypt.hash(newPassword, 12);
    // Invalidate all existing refresh tokens by clearing them
    user.refreshToken = null as any;
    await user.save();

    logger.info(`Password reset completed for: ${user.username}`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Token Management
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Refresh access token using a valid refresh token
   */
  static async refreshToken(token: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token.');
    }

    if (decoded.type !== 'refresh') {
      throw ApiError.unauthorized('Invalid token type. Expected refresh token.');
    }

    const user = await User.findOne({ uid: decoded.uid, refreshToken: token });
    if (!user) throw ApiError.unauthorized('Refresh token not found. Please login again.');

    const tokens = AuthService.signTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return tokens;
  }

  /**
   * Logout — clear refresh token
   */
  static async logout(uid: string) {
    await User.findOneAndUpdate({ uid }, { refreshToken: null });
    logger.info(`User logged out: ${uid}`);
  }

  /**
   * Get the current user's profile
   */
  static async getMe(uid: string) {
    const user = await User.findOne({ uid });
    if (!user) throw ApiError.notFound('User not found.');
    return AuthService.safeUser(user);
  }

  // ─────────────────────────────────────────────────────────────────────
  // LinkedIn OAuth
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Build the LinkedIn OAuth authorization URL
   */
  static getLinkedInAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.LINKEDIN_CLIENT_ID,
      redirect_uri: env.LINKEDIN_REDIRECT_URI,
      scope: 'openid profile email',
      state: uuidv4(),
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange LinkedIn auth code for profile and verify user identity
   */
  static async verifyWithLinkedIn(uid: string, code: string) {
    const user = await User.findOne({ uid });
    if (!user) throw ApiError.notFound('User not found.');

    if (user.linkedinVerified) {
      throw ApiError.conflict('Your account is already verified with LinkedIn.');
    }

    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.LINKEDIN_REDIRECT_URI,
        client_id: env.LINKEDIN_CLIENT_ID,
        client_secret: env.LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      logger.error('LinkedIn token exchange failed', { err });
      throw ApiError.badRequest('Failed to exchange LinkedIn authorisation code. Please try again.');
    }

    const tokenData = await tokenRes.json() as { access_token: string };
    const accessToken = tokenData.access_token;

    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      throw ApiError.badRequest('Failed to fetch LinkedIn profile.');
    }

    const profile = await profileRes.json() as {
      sub: string;
      name: string;
      email: string;
      picture?: string;
    };

    if (profile.email.toLowerCase() !== user.email.toLowerCase()) {
      throw ApiError.badRequest(
        `LinkedIn email (${profile.email}) does not match your account email.`
      );
    }

    const existing = await User.findOne({ linkedinId: profile.sub });
    if (existing && existing.uid !== uid) {
      throw ApiError.conflict('This LinkedIn account is already linked to another WorkWyse account.');
    }

    user.linkedinVerified = true;
    user.linkedinId = profile.sub;
    user.linkedinDisplayName = profile.name;
    user.linkedinAvatarUrl = profile.picture;
    user.linkedinVerifiedAt = new Date();
    await user.save();

    logger.info(`LinkedIn verification successful for user: ${user.username}`);

    return {
      username: user.username,
      uid: user.uid,
      linkedinVerified: user.linkedinVerified,
      linkedinDisplayName: user.linkedinDisplayName,
      linkedinAvatarUrl: user.linkedinAvatarUrl,
    };
  }

  /**
   * Update user type (public/private)
   */
  static async updateUserType(uid: string, userType: 'public' | 'private') {
    const user = await User.findOne({ uid });
    if (!user) throw ApiError.notFound('User not found.');

    user.type = userType;
    await user.save();

    return { username: user.username, uid: user.uid, type: user.type };
  }
}

export default AuthService;
