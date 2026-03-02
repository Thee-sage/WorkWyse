import { User } from '../types/user';

const API_URL = 'http://localhost:5000/api/auth';

export async function sendOTP(username: string, email: string, password: string, userType: 'public' | 'private' = 'public'): Promise<{ message: string; email: string }> {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, userType }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to send OTP');
  }
  return await res.json();
}

export async function verifyOTP(email: string, otp: string): Promise<{ message: string; username: string; uid: string; email: string; type: 'public' | 'private' }> {
  const res = await fetch(`${API_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'OTP verification failed');
  }
  return await res.json();
}

export async function updateUserType(uid: string, userType: 'public' | 'private'): Promise<{ message: string; username: string; uid: string; type: 'public' | 'private' }> {
  const res = await fetch(`${API_URL}/user-type`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, userType }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update user type');
  }
  return await res.json();
}

// Keep for backward compatibility if needed
export async function registerUser(username: string, password: string): Promise<User> {
  throw new Error('Please use sendOTP and verifyOTP for registration');
}

export async function loginUser(username: string, password: string): Promise<User> {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Login failed');
  }
  return await res.json();
} 