'use client';

import AuthForm from '../../components/AuthForm';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  async function handleLogin(identifier: string, password: string) {
    await login(identifier, password);
    router.push('/');
  }

  return <AuthForm mode="login" onAuth={handleLogin} />;
}