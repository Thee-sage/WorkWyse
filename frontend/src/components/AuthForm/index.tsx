'use client';
import { useState } from 'react';
import styles from './style.module.css';
import { sendOTP, verifyOTP } from '../AuthAPI';

interface AuthFormProps {
  mode: 'login' | 'register';
  onAuth: (username: string, password: string) => Promise<void>;
}

export default function AuthForm({ mode, onAuth }: AuthFormProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'public' | 'private'>('public');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (mode === 'login') {
      setLoading(true);
      try {
        await onAuth(username, password);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Registration flow
      if (!otpSent) {
        // Step 1: Send OTP
        setLoading(true);
        try {
          await sendOTP(username, email, password, userType);
          setOtpSent(true);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        // Step 2: Verify OTP
        setVerifying(true);
        try {
          await verifyOTP(email, otp);
          await onAuth(username, password);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setVerifying(false);
        }
      }
    }
  };

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <h2 className={styles.title}>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <div className={styles.formContent}>
        <div className={styles.inputSection}>
          <label htmlFor="username" className={styles.label}>Username</label>
          <input
            id="username"
            type="text"
            className={styles.input}
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            disabled={otpSent && mode === 'register'}
            autoComplete="username"
            placeholder="Enter your username"
          />
        </div>
        
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
                placeholder="Enter your email"
              />
            </div>
            {!otpSent && (
              <div className={styles.inputSection}>
                <label className={styles.label}>Account Type</label>
                <div className={styles.userTypeContainer}>
                  <button
                    type="button"
                    onClick={() => setUserType('public')}
                    className={`${styles.userTypeButton} ${styles.userTypeButtonPublic} ${userType === 'public' ? 'active' : ''}`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('private')}
                    className={`${styles.userTypeButton} ${styles.userTypeButtonPrivate} ${userType === 'private' ? 'active' : ''}`}
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
            placeholder="Enter your password"
          />
        </div>

        {mode === 'register' && otpSent && (
          <div className={styles.inputSection}>
            <label htmlFor="otp" className={styles.label}>OTP Verification</label>
            <input
              id="otp"
              type="text"
              className={`${styles.input} ${styles.otpInput}`}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              placeholder="Enter 6-digit OTP"
            />
            <p className={styles.otpHint}>
              Check your email for the OTP code
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
              ? (mode === 'login' ? 'Logging in...' : 'Sending OTP...')
              : verifying
              ? 'Verifying...'
              : mode === 'login'
              ? 'Login'
              : otpSent
              ? 'Verify & Register'
              : 'Send OTP'
            }
          </button>
        </div>
      </div>
    </form>
  );
} 