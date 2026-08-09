'use client';
import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../components/AuthContext';
import { useToast } from '../../../../components/ui/Toast';
import { ApiError } from '../../../../lib/api';

function LinkedInCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyWithLinkedIn } = useAuth();
  const toast = useToast();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error('LinkedIn authorisation was denied.');
      router.replace('/profile');
      return;
    }

    if (!code) {
      toast.error('Missing authorisation code from LinkedIn.');
      router.replace('/profile');
      return;
    }

    verifyWithLinkedIn(code)
      .then(() => {
        toast.success('LinkedIn verification successful! Your account is now verified. ✅');
        router.replace('/profile');
      })
      .catch((err: unknown) => {
        const msg = err instanceof ApiError ? err.message : 'LinkedIn verification failed.';
        toast.error(msg);
        router.replace('/profile');
      });
  }, [searchParams, router, verifyWithLinkedIn, toast]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: '3px solid #0A66C2',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: '1rem', color: 'var(--muted-foreground)' }}>
        Verifying your LinkedIn identity…
      </p>
    </div>
  );
}

export default function LinkedInCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LinkedInCallbackContent />
    </Suspense>
  );
}
