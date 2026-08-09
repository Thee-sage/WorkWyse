"use client";
import { useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (adminOnly && !isAdmin) {
      router.replace("/");
    }
  }, [user, loading, isAdmin, adminOnly, router]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>Loading...</div>
      </div>
    );
  }

  if (!user) return null;
  if (adminOnly && !isAdmin) return null;

  return <>{children}</>;
}
