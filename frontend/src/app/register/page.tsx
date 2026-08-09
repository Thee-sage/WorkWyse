"use client";
import AuthForm from '../../components/AuthForm';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  // After OTP verification, AuthForm auto-logs in the user and calls this
  async function handleRegister(_identifier: string, _password: string) {
    router.push('/');
  }

  return <AuthForm mode="register" onAuth={handleRegister} />;
}