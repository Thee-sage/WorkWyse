import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import env from '../config/env';
import logger from '../config/logger';

/**
 * Email delivery.
 *
 * Resend is used when RESEND_API_KEY is set: it sends from the verified
 * workwyse.tech domain with real SPF/DKIM, which is both far better for
 * inbox placement and not coupled to one personal Gmail account's sending
 * limits. Gmail SMTP remains as a fallback purely so the app still runs for
 * a developer who hasn't set up a Resend key locally.
 *
 * config/env.ts refuses to boot if neither is configured, so `sendMail`
 * below can assume one of the two branches is always viable.
 */

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const gmailTransporter =
  env.GMAIL_USER && env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
      })
    : null;

interface MailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send one email through whichever transport is configured.
 *
 * Throws on failure — callers decide whether that should surface to the
 * user (registration) or be swallowed (password reset, where a thrown
 * error would leak whether an address exists).
 */
async function sendMail({ to, subject, html }: MailInput): Promise<void> {
  if (resend) {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    // The Resend SDK reports failures in the response body rather than by
    // throwing, so an unchecked call silently "succeeds" on a rejected send.
    if (error) {
      throw new Error(`Resend: ${error.message}`);
    }
    return;
  }

  if (gmailTransporter) {
    await gmailTransporter.sendMail({
      from: `"WorkWyse" <${env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return;
  }

  throw new Error('No email transport configured');
}

// ─── Shared template chrome ──────────────────────────────────────────
// Colours mirror the app's palette (see frontend/src/app/globals.css) so a
// WorkWyse email doesn't look like it came from a different product: ink
// #141c18 for text, accent #0f6b60 for emphasis, near-white surfaces.

/**
 * CORS_ORIGIN can hold several comma-separated origins; the first is the
 * canonical site. Links and image sources built from the raw value would be
 * malformed as soon as a second origin is configured.
 */
function siteOrigin(): string {
  return env.CORS_ORIGIN.split(',')[0].trim();
}

function layout(body: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #141c18; line-height: 1.6;">
      <div style="border-bottom: 1px solid #141c18; padding-bottom: 12px; margin-bottom: 28px;">
        <!--
          Most mail clients block remote images until the reader allows them,
          so the alt text is the wordmark itself: a blocked logo degrades to
          "WorkWyse" in the same position rather than to a broken-image icon.
          SVG is not an option here — Gmail and Outlook both drop it.
        -->
        <img src="${siteOrigin()}/brand/lockup-black@2x.png" alt="WorkWyse" height="22"
             style="height: 22px; width: auto; border: 0; font-size: 17px; font-weight: 700; letter-spacing: -0.025em; color: #141c18;" />
      </div>
      ${body}
      <div style="border-top: 1px solid #e2e8e4; margin-top: 32px; padding-top: 14px; color: #7d8a83; font-size: 12px;">
        A public record of what is known about job listings.
      </div>
    </div>
  `;
}

function codeBlock(code: string): string {
  return `
    <div style="background-color: #f7f9f8; border: 1px solid #dbe4de; padding: 22px; text-align: center; margin: 22px 0;">
      <span style="color: #0f6b60; font-size: 32px; letter-spacing: 8px; font-weight: 600; font-family: 'SFMono-Regular', Consolas, monospace;">${code}</span>
    </div>
  `;
}

// ─── Registration OTP ────────────────────────────────────────────────

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  try {
    await sendMail({
      to: email,
      subject: 'Your WorkWyse verification code',
      html: layout(`
        <h2 style="font-size: 20px; margin: 0 0 12px;">Confirm your email</h2>
        <p style="margin: 0;">Use this code to finish creating your WorkWyse account.</p>
        ${codeBlock(otp)}
        <p style="color: #5e6b64; font-size: 14px; margin: 0;">This code expires in 10 minutes.</p>
        <p style="color: #5e6b64; font-size: 14px; margin: 8px 0 0;">If you didn't request it, you can ignore this email.</p>
      `),
    });
    logger.info('OTP email sent', { to: email });
  } catch (error) {
    logger.error('Failed to send OTP email', { error: (error as Error).message, to: email });
    // Registration genuinely cannot continue without this, so unlike the
    // reset flow below, the failure is surfaced to the caller.
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
  try {
    await sendMail({
      to: email,
      subject: 'Reset your WorkWyse password',
      html: layout(`
        <h2 style="font-size: 20px; margin: 0 0 12px;">Password reset</h2>
        <p style="margin: 0;">Hi <strong>${username}</strong> — use this code to set a new password.</p>
        ${codeBlock(otp)}
        <p style="color: #5e6b64; font-size: 14px; margin: 0;">This code expires in 10 minutes.</p>
        <p style="color: #5e6b64; font-size: 14px; margin: 8px 0 0;">
          If you didn't request a reset, ignore this email — your password won't change.
        </p>
        <p style="color: #7d8a83; font-size: 12px; margin: 16px 0 0;">
          Never share this code. WorkWyse staff will never ask you for it.
        </p>
      `),
    });
    logger.info('Password reset email sent', { to: email });
  } catch (error) {
    logger.error('Failed to send password reset email', {
      error: (error as Error).message,
      to: email,
    });
    // Intentionally silent — throwing here would reveal whether the address
    // is registered.
  }
}

// ─── Report Status Notification ──────────────────────────────────────

export async function sendReportStatusEmail(
  email: string,
  status: 'reviewed' | 'dismissed'
): Promise<void> {
  const statusText = status === 'reviewed' ? 'reviewed' : 'dismissed';
  const detail =
    status === 'reviewed'
      ? 'A moderator reviewed the challenge you filed and acted on it.'
      : 'A moderator reviewed the challenge you filed and dismissed it.';

  try {
    await sendMail({
      to: email,
      subject: `Your challenge was ${statusText}`,
      html: layout(`
        <h2 style="font-size: 20px; margin: 0 0 12px;">Challenge ${statusText}</h2>
        <p style="margin: 0;">${detail}</p>
        <p style="color: #5e6b64; font-size: 14px; margin: 16px 0 0;">
          You can see everything you've filed under "Challenges filed" on your profile.
        </p>
      `),
    });
    logger.info('Report status email sent', { to: email });
  } catch (error) {
    logger.error('Failed to send report status email', {
      error: (error as Error).message,
      to: email,
    });
  }
}

// ─── Evidence Upload Notification ────────────────────────────────────

export async function sendEvidenceUploadedEmail(
  email: string,
  jobTitle: string,
  jobId: string
): Promise<void> {
  const siteUrl = siteOrigin();

  try {
    await sendMail({
      to: email,
      subject: 'New evidence on a record you filed',
      html: layout(`
        <h2 style="font-size: 20px; margin: 0 0 12px;">New evidence added</h2>
        <p style="margin: 0;">
          Someone attached new evidence to <strong>${jobTitle}</strong>.
        </p>
        <p style="margin: 18px 0 0;">
          <a href="${siteUrl}/registry/${jobId}" style="color: #0f6b60; font-weight: 600;">View the record →</a>
        </p>
      `),
    });
    logger.info('Evidence upload email sent', { to: email });
  } catch (error) {
    logger.error('Failed to send evidence email', {
      error: (error as Error).message,
      to: email,
    });
  }
}
