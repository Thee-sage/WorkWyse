'use client';

import AuthForm from '../../components/AuthForm';
import { loginUser } from '../../components/AuthAPI';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  async function handleLogin(username: string, password: string) {
    await login(username, password);
    router.push('/');
  }

  return <AuthForm mode="login" onAuth={handleLogin} />;
} 