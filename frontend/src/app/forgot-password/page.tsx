'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';

type Step = 'email' | 'otp' | 'new-password' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Step 1: Request OTP ─────────────────────────────────────────

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setStep('otp');
      toast.success('If that email exists, a reset code has been sent.');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP ──────────────────────────────────────────

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.verifyResetOtp(email, otp);
      setResetToken(res.data.resetToken);
      setStep('new-password');
      toast.success('Code verified! Set your new password.');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Invalid or expired code.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3: Set New Password ────────────────────────────────────

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Client-side strength check
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must include uppercase, lowercase, and a number.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword(resetToken, newPassword);
      setStep('done');
      toast.success('Password reset successfully!');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to reset password.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step Progress Indicator ─────────────────────────────────────

  const stepIndex = { email: 0, otp: 1, 'new-password': 2, done: 3 }[step];
  const stepLabels = ['Email', 'Verify', 'New Password', 'Done'];

  function ProgressBar() {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 32 }}>
        {stepLabels.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < stepLabels.length - 1 ? 1 : 0, gap: 4 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
                background: i <= stepIndex ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color: i <= stepIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s',
              }}
            >
              {i < stepIndex ? '✓' : i + 1}
            </div>
            {i < stepLabels.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  borderRadius: 99,
                  background: i < stepIndex ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                  transition: 'all 0.5s',
                }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ─── Shared Styles ───────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 0.875rem',
    border: '1px solid var(--border)',
    borderRadius: '0.5rem',
    fontSize: '0.925rem',
    fontFamily: "'Inter', sans-serif",
    background: 'var(--input-background)',
    color: 'var(--foreground)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--muted-foreground)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: '0.375rem',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    color: 'var(--primary-foreground)',
    fontWeight: 600,
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    background: 'var(--primary)',
    fontSize: '0.925rem',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: "'Inter', sans-serif",
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.2s',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5rem 2rem 2rem',
        background: 'var(--background)',
      }}
    >
      <div
        style={{
          maxWidth: '28rem',
          width: '100%',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '1rem',
          padding: '2.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header */}
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.65rem',
            fontWeight: 600,
            color: 'var(--foreground)',
            marginBottom: '0.5rem',
          }}
        >
          {step === 'done' ? 'All set!' : 'Reset Password'}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '2rem', lineHeight: 1.5 }}>
          {step === 'email' && 'Enter the email linked to your account and we\'ll send a verification code.'}
          {step === 'otp' && `We sent a 6-digit code to ${email}. Enter it below.`}
          {step === 'new-password' && 'Choose a strong new password for your account.'}
          {step === 'done' && 'Your password has been updated. You can now log in with your new credentials.'}
        </p>

        <ProgressBar />

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="reset-email" style={labelStyle}>Email Address</label>
              <input
                id="reset-email"
                type="email"
                style={inputStyle}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                autoFocus
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="reset-otp" style={labelStyle}>Verification Code</label>
              <input
                id="reset-otp"
                type="text"
                style={{
                  ...inputStyle,
                  letterSpacing: '0.4em',
                  textAlign: 'center',
                  fontSize: '1.35rem',
                  fontWeight: 600,
                }}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                placeholder="000000"
                autoFocus
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textAlign: 'center', marginTop: '0.5rem' }}>
                Didn&apos;t receive a code?{' '}
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 500, fontSize: '0.75rem', padding: 0 }}
                >
                  Resend
                </button>
              </p>
            </div>
            {error && <ErrorBox msg={error} />}
            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 'new-password' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="new-password" style={labelStyle}>New Password</label>
              <input
                id="new-password"
                type="password"
                style={inputStyle}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Min. 8 chars, uppercase, lowercase, number"
                autoFocus
              />
              <PasswordStrength password={newPassword} />
            </div>
            <div>
              <label htmlFor="confirm-password" style={labelStyle}>Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                style={{
                  ...inputStyle,
                  borderColor:
                    confirmPassword.length > 0
                      ? confirmPassword === newPassword
                        ? 'rgba(16,185,129,0.5)'
                        : 'rgba(239,68,68,0.5)'
                      : 'var(--border)',
                }}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Re-enter your new password"
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? 'Resetting...' : 'Set New Password'}
            </button>
          </form>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 28,
              }}
            >
              ✓
            </div>
            <button
              onClick={() => router.push('/login')}
              style={{ ...buttonStyle, marginTop: 8 }}
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Back to Login link */}
        {step !== 'done' && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
            Remember your password?{' '}
            <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div
      style={{
        background: 'rgba(229,72,77,0.06)',
        border: '1px solid rgba(229,72,77,0.2)',
        color: 'var(--destructive)',
        padding: '0.625rem 0.875rem',
        borderRadius: '0.5rem',
        fontSize: '0.825rem',
        fontWeight: 500,
      }}
    >
      {msg}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ];
  const passed = checks.filter(c => c.pass).length;
  const strength = passed <= 1 ? 'Weak' : passed <= 2 ? 'Fair' : passed <= 3 ? 'Good' : 'Strong';
  const colors = { Weak: '#ef4444', Fair: '#f59e0b', Good: '#3b82f6', Strong: '#10b981' };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {/* Strength bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background: i < passed ? colors[strength] : 'rgba(255,255,255,0.08)',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: colors[strength], fontWeight: 600 }}>{strength}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          {checks.map(c => (
            <span
              key={c.label}
              style={{
                fontSize: 10.5,
                color: c.pass ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                textDecoration: c.pass ? 'none' : 'line-through',
              }}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
