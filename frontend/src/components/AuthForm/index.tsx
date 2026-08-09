'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './style.module.css';
import { api, setAccessToken } from '../../lib/api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ui/Toast';
import { ApiError } from '../../lib/api';

interface AuthFormProps {
  mode: 'login' | 'register';
  onAuth: (identifier: string, password: string) => Promise<void>;
}

export default function AuthForm({ mode, onAuth }: AuthFormProps) {
  // Login uses `identifier` (email or username), register still collects both
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'public' | 'private'>('public');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { setUser } = useAuth();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (mode === 'login') {
      setLoading(true);
      try {
        await onAuth(identifier, password);
        toast.success('Logged in successfully!');
      } catch (err: unknown) {
        const msg = err instanceof ApiError ? err.message : 'Login failed';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    } else {
      // Registration flow
      if (!otpSent) {
        // Step 1: Send OTP
        setLoading(true);
        try {
          await api.auth.register({ username, email, password, userType });
          setOtpSent(true);
          toast.success('OTP sent! Check your email.');
        } catch (err: unknown) {
          const msg = err instanceof ApiError ? err.message : 'Failed to send OTP';
          setError(msg);
          toast.error(msg);
        } finally {
          setLoading(false);
        }
      } else {
        // Step 2: Verify OTP -- this now auto-logs in the user
        setVerifying(true);
        try {
          const res = await api.auth.verifyOTP(email, otp);
          const { user, accessToken } = res.data;

          // Store access token in memory; refresh token is set
          // automatically as an httpOnly cookie by the server (Finding 7.3)
          setAccessToken(accessToken);
          localStorage.setItem('user', JSON.stringify(user));
          setUser(user);

          toast.success('Registration successful!');
          await onAuth(username, password); // triggers redirect
        } catch (err: unknown) {
          const msg = err instanceof ApiError ? err.message : 'OTP verification failed';
          setError(msg);
          toast.error(msg);
        } finally {
          setVerifying(false);
        }
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        {/* Left -- Brand Panel */}
        <div className={styles.brandPanel}>
          <p className={styles.brandLogo}>WorkWyse</p>
          <h1 className={styles.brandTagline}>
            {mode === 'login'
              ? 'Welcome back, investigator.'
              : 'Join the investigation.'}
          </h1>
          <p className={styles.brandDescription}>
            {mode === 'login'
              ? 'Sign in to continue tracking ghost jobs and helping the community separate real opportunities from noise.'
              : 'Create an account to report suspicious listings, upvote verified jobs, and help build a more transparent job market.'}
          </p>
          <div className={styles.brandDecor}>W</div>
        </div>

        {/* Right -- Form Panel */}
        <div className={styles.formPanel}>
          <div className={styles.header}>
            <h2 className={styles.title}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            <p className={styles.subtitle}>
              {mode === 'login' ? (
                <>Don&apos;t have an account?{' '}<Link href="/register" className={styles.subtitleLink}>Create one</Link></>
              ) : (
                <>Already have an account?{' '}<Link href="/login" className={styles.subtitleLink}>Sign in</Link></>
              )}
            </p>
          </div>

          <form className={styles.formContent} onSubmit={handleSubmit}>
            {/* Login: single identifier field (email or username) */}
            {mode === 'login' && (
              <div className={styles.inputSection}>
                <label htmlFor="identifier" className={styles.label}>Email or Username</label>
                <input
                  id="identifier"
                  type="text"
                  className={styles.input}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="you@example.com or your username"
                />
              </div>
            )}

            {/* Register: separate username field */}
            {mode === 'register' && (
              <div className={styles.inputSection}>
                <label htmlFor="username" className={styles.label}>Username</label>
                <input
                  id="username"
                  type="text"
                  className={styles.input}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  disabled={otpSent}
                  autoComplete="username"
                  placeholder="Your username"
                />
              </div>
            )}
            
            {mode === 'register' && (
              <>
                <div className={styles.inputSection}>
                  <label htmlFor="email" className={styles.label}>Email</label>
                  <input
                    id="email"
                    type="email"
                    className={styles.input}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={otpSent}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                  <p className={styles.emailHint}>
                    Using the same email as your LinkedIn makes future identity verification seamless.
                  </p>
                </div>
                {!otpSent && (
                  <div className={styles.inputSection}>
                    <label className={styles.label}>Account Type</label>
                    <div className={styles.userTypeContainer}>
                      <button
                        type="button"
                        onClick={() => setUserType('public')}
                        className={`${styles.userTypeButton} ${styles.userTypeButtonPublic} ${userType === 'public' ? styles.active : ''}`}
                      >
                        Public
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserType('private')}
                        className={`${styles.userTypeButton} ${styles.userTypeButtonPrivate} ${userType === 'private' ? styles.active : ''}`}
                      >
                        Private
                      </button>
                    </div>
                    <p className={styles.userTypeDescription}>
                      {userType === 'public' 
                        ? 'Public users can vote on jobs and add job listings.' 
                        : 'Private users can only add reviews, no voting or job posting.'}
                    </p>
                  </div>
                )}
              </>
            )}
            
            <div className={styles.inputSection}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={otpSent && mode === 'register'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'login' ? 'Your password' : 'Min. 8 chars, uppercase, lowercase, number'}
              />

              {/* Forgot Password link -- only on login */}
              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginTop: '0.375rem' }}>
                  <Link
                    href="/forgot-password"
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      fontWeight: 500,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            {mode === 'register' && otpSent && (
              <div className={styles.inputSection}>
                <label htmlFor="otp" className={styles.label}>Verification Code</label>
                <input
                  id="otp"
                  type="text"
                  className={`${styles.input} ${styles.otpInput}`}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  placeholder="000000"
                />
                <p className={styles.otpHint}>
                  We sent a 6-digit code to your email
                </p>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.buttonContainer}>
              <button 
                type="submit" 
                className={styles.submitButton} 
                disabled={loading || verifying}
              >
                {loading 
                  ? (mode === 'login' ? 'Signing in...' : 'Sending code...')
                  : verifying
                  ? 'Verifying...'
                  : mode === 'login'
                  ? 'Sign In'
                  : otpSent
                  ? 'Verify & Create Account'
                  : 'Send Verification Code'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}