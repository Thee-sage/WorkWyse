"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types/user";
import { loginUser } from "./AuthAPI";

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  userType: 'public' | 'private';
  setUserType: (type: 'public' | 'private') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserTypeState] = useState<'public' | 'private'>('public');

  useEffect(() => {
    // Load userType from localStorage on mount (client-side only)
    const storedType = (localStorage.getItem('userType') as 'public' | 'private') || 'public';
    setUserTypeState(storedType);
    // Load user from localStorage on mount
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const uid = localStorage.getItem("uid");
    const storedUserType = (localStorage.getItem('userType') as 'public' | 'private') || 'public';
    if (token && username && uid) {
      setUser({ token, username, uid, type: storedUserType });
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await loginUser(username, password);
    if (res.token) {
      localStorage.setItem("token", res.token);
      localStorage.setItem("username", res.username);
      localStorage.setItem("uid", res.uid);
      // Use the type from the server response
      const userTypeFromServer = res.type || 'public';
      localStorage.setItem("userType", userTypeFromServer);
      setUserTypeState(userTypeFromServer);
      setUser({ ...res, type: userTypeFromServer });
    }
  };

  const register = async (username: string, password: string) => {
    // Registration is now handled by AuthForm with OTP verification
    // This function is kept for backward compatibility but not used
    throw new Error('Please use the registration form with OTP verification');
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("uid");
    localStorage.removeItem("userType");
    setUser(null);
  };

  const setUserType = (type: 'public' | 'private') => {
    setUserTypeState(type);
    localStorage.setItem('userType', type);
    setUser((prev) => prev ? { ...prev, type } : null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, userType, setUserType }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
} 