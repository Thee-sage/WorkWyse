"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User } from "../types/user";
import {
  api,
  setAccessToken,
  clearTokens,
  getAccessToken,
} from "../lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  verifyWithLinkedIn: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore session via the httpOnly refresh cookie
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Finding 7.3: The refresh token is in an httpOnly cookie (JS can't read it),
        // so we just attempt a refresh — the browser sends the cookie automatically.
        const newAccessToken = await api.auth.refresh();
        if (newAccessToken) {
          // Fetch fresh user data from the server
          const res = await api.auth.getMe();
          const userData = res.data;
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        } else {
          // No valid refresh cookie — clear stale data
          localStorage.removeItem('user');
        }
      } catch {
        clearTokens();
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api.auth.login(identifier, password);
    const { user: userData, accessToken } = res.data;

    setAccessToken(accessToken);
    // Finding 7.3: refresh token is set automatically by the server as an httpOnly cookie
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) {
        await api.auth.logout();
      }
    } catch {
      // Ignore errors on logout
    } finally {
      clearTokens();
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  const verifyWithLinkedIn = useCallback(async (code: string) => {
    const res = await api.auth.verifyLinkedIn(code);
    const updated = res.data;
    setUser(prev => {
      if (!prev) return prev;
      const newUser = {
        ...prev,
        linkedinVerified: updated.linkedinVerified,
        linkedinDisplayName: updated.linkedinDisplayName,
        linkedinAvatarUrl: updated.linkedinAvatarUrl,
      };
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    setUser,
    verifyWithLinkedIn,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}