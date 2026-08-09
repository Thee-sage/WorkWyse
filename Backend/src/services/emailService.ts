import nodemailer from 'nodemailer';
import env from '../config/env';
import logger from '../config/logger';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_APP_PASSWORD,
  },
});

// ─── Registration OTP ────────────────────────────────────────────────

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const mailOptions = {
    from: `"WorkWyse" <${env.GMAIL_USER}>`,
    to: email,
    subject: 'Your Registration OTP - WorkWyse',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Registration Verification</h2>
        <p>Thank you for registering! Please use the following OTP to complete your registration:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`OTP email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send OTP email', { error, to: email });
    throw new Error('Failed to send OTP email. Please try again.');
  }
}

// ─── Password Reset OTP ──────────────────────────────────────────────

/**
 * Send a password-reset OTP email.
 * Silent fail: do not throw — prevents email-existence enumeration.
 */
export async function sendPasswordResetEmail(
  email: string,
  username: string,
  otp: string
): Promise<void> {
  const mailOptions = {
    from: `"WorkWyse" <${env.GMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Code - WorkWyse',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi <strong>${username}</strong>,</p>
        <p>We received a request to reset your WorkWyse password. Use the code below - it expires in <strong>10 minutes</strong>.</p>
        <div style="background-color: #f4f4f4; padding: 24px; text-align: center; margin: 20px 0; border-radius: 10px; border: 2px dashed #7c3aed;">
          <h1 style="color: #7c3aed; font-size: 38px; letter-spacing: 10px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h1>
        </div>
        <p style="color: #666; font-size: 14px;">If you did not request a password reset, you can safely ignore this email - your password will not change.</p>
        <p style="color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 12px; margin-top: 20px;">
          For your security, never share this code with anyone. WorkWyse staff will never ask for it.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send password reset email', { error, to: email });
    // Intentionally silent - do not throw to prevent email enumeration
  }
}

// ─── Report Status Notification ──────────────────────────────────────

export async function sendReportStatusEmail(
  email: string,
  status: 'reviewed' | 'dismissed'
): Promise<void> {
  const statusText = status === 'reviewed' ? 'Reviewed' : 'Dismissed';
  const detail =
    status === 'reviewed'
      ? 'Our moderation team has reviewed your report and taken appropriate action.'
      : 'After review, our team determined no action was needed on this report.';

  const mailOptions = {
    from: `"WorkWyse" <${env.GMAIL_USER}>`,
    to: email,
    subject: `Your Report Has Been ${statusText} - WorkWyse`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Report Status Update</h2>
        <p>${detail}</p>
        <p style="color: #666; font-size: 14px;">You can view your reports in your WorkWyse account under "My Reports".</p>
        <p style="color: #666; font-size: 14px;">Thank you for helping keep WorkWyse safe.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Report status email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send report status email', { error, to: email });
  }
}

// ─── Evidence Upload Notification ────────────────────────────────────

export async function sendEvidenceUploadedEmail(
  email: string,
  jobTitle: string,
  jobId: string
): Promise<void> {
  const mailOptions = {
    from: `"WorkWyse" <${env.GMAIL_USER}>`,
    to: email,
    subject: 'New Evidence Uploaded on Your Job Report - WorkWyse',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Evidence Added</h2>
        <p>Someone has uploaded new evidence on your job report: <strong>${jobTitle}</strong>.</p>
        <p>
          <a href="${env.CORS_ORIGIN}/jobs/${jobId}" style="color: #007bff;">View the report</a>
        </p>
        <p style="color: #666; font-size: 14px;">If you did not submit this report, please contact support.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Evidence upload email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send evidence email', { error, to: email });
  }
}
