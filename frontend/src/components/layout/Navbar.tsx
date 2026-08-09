'use client';
import { Search, Menu, X, LogIn, LogOut, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../AuthContext";
import { useToast } from "../ui/Toast";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading, isAdmin, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const isActive = (path: string) => pathname.startsWith(path);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const navLinks = [
    { to: "/reports", label: "Reports" },
    { to: "/companies", label: "Companies" },
    ...(user ? [{ to: "/profile", label: "Profile" }] : []),
    ...(user ? [{ to: "/settings", label: "Settings" }] : []),
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: "rgba(247,246,243,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Search size={18} color="white" />
          </div>
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.25rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            WorkWyse
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              href={link.to}
              style={{
                fontSize: "0.875rem",
                color: isActive(link.to) ? "var(--foreground)" : "var(--muted-foreground)",
                transition: "color 0.2s",
              }}
            >
              {link.label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/admin"
              style={{
                fontSize: "0.875rem",
                color: isActive("/admin") ? "var(--foreground)" : "var(--accent)",
                transition: "color 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <Shield size={14} /> Admin
            </Link>
          )}

          {!loading && !user && (
            <>
              <Link
                href="/login"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.875rem",
                  color: "var(--muted-foreground)",
                  transition: "color 0.2s",
                }}
              >
                <LogIn size={14} /> Login
              </Link>
              <Link
                href="/register"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "white",
                  padding: "0.5rem 1.25rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  transition: "box-shadow 0.2s",
                }}
                className="hover:shadow-md"
              >
                Register
              </Link>
            </>
          )}

          {user && (
            <Link
              href="/submit-report"
              style={{
                backgroundColor: "var(--accent)",
                color: "white",
                padding: "0.5rem 1.25rem",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                transition: "box-shadow 0.2s",
              }}
              className="hover:shadow-md"
            >
              Submit a Report
            </Link>
          )}

          {user && (
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.875rem",
                color: "var(--muted-foreground)",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
            >
              <LogOut size={14} /> Logout
            </button>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ color: "var(--foreground)" }}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            style={{
              backgroundColor: "var(--card)",
              borderTop: "1px solid var(--border)",
            }}
            className="md:hidden px-6 py-4 flex flex-col gap-4 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                href={link.to}
                style={{
                  fontSize: "0.875rem",
                  color: isActive(link.to) ? "var(--foreground)" : "var(--muted-foreground)",
                }}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {!loading && !user && (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Login</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Register</Link>
              </>
            )}

            {user && (
              <>
                <Link
                  href="/submit-report"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "white",
                    padding: "0.5rem 1.25rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    textAlign: "center",
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  Submit a Report
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--muted-foreground)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  Logout
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
