"use client";
import AuthForm from '../../components/AuthForm';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  async function handleRegister(username: string, password: string) {
    // Registration is handled by AuthForm with OTP verification
    // This is called after successful OTP verification
    router.push('/login');
  }

  return <AuthForm mode="register" onAuth={handleRegister} />;
} 