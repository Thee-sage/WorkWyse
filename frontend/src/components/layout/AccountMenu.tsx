"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthContext";
import { useToast } from "../ui/Toast";
import { api } from "../../lib/api";
import { ContributorStats } from "../../types/user";
import { initials, tierLabel } from "../../lib/record";

/**
 * Account dropdown, opened from the initials badge in TopBar.
 *
 * This restores functionality that existed in the pre-redesign profile page
 * (account type, logout) but had no entry point after the redesign: nothing
 * linked to /settings and there was no logout control anywhere in the nav.
 * Rather than pack those actions permanently into the top bar, they live
 * here — the conventional place for account-level actions in a modern app.
 */
export default function AccountMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [stats, setStats] = useState<ContributorStats | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetched lazily on first open rather than on every page load — the menu
  // is a small, occasional-use surface, so there's no reason to spend a
  // request on it before the user asks to see it.
  useEffect(() => {
    if (open && !stats && user) {
      api.users
        .contributorStats(user.username)
        .then((r) => setStats(r.data))
        .catch(() => {});
    }
  }, [open, stats, user]);

  // Close on outside click and on Escape — standard dropdown behaviour.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Close whenever a navigation happens (a menu link was clicked).
  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      // Uses the real auth system — AuthContext.logout calls POST
      // /api/auth/logout (clearing the httpOnly refresh cookie server-side)
      // and clears the in-memory access token and cached user client-side.
      // This is not a UI-only reset.
      await logout();
      setOpen(false);
      toast.success("Logged out");
      router.push("/");
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-[26px] h-[26px] rounded-full bg-ink text-background font-mono text-[9.5px] flex items-center justify-center"
        title={user.username}
      >
        {initials(user.username)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[34px] z-30 w-[248px] bg-card border border-border-strong shadow-lg"
        >
          <div className="px-3.5 py-3 border-b border-border-soft">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13.5px] font-semibold truncate">{user.username}</span>
              {stats && (
                <span
                  title={`Tier ${stats.tier} of 3 — ${tierLabel(stats.tier)}`}
                  className="font-mono text-[9px] tracking-[0.08em] border border-border-mid text-muted px-1.5 py-0.5"
                >
                  T{stats.tier} · {tierLabel(stats.tier).toUpperCase()}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11.5px] text-muted-foreground truncate">{user.email}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`w-[6px] h-[6px] rounded-full ${user.type === "public" ? "bg-accent" : "bg-amber"}`}
              />
              <span className="font-mono text-[9.5px] tracking-[0.08em] text-muted-foreground">
                {user.type === "public" ? "PUBLIC ACCOUNT" : "PRIVATE ACCOUNT"}
              </span>
            </div>
          </div>

          <nav className="py-1.5">
            <MenuLink onClick={() => go("/profile")}>Profile &amp; activity</MenuLink>
            <MenuLink onClick={() => go("/settings")}>Account settings</MenuLink>
            <MenuLink onClick={() => go("/settings#visibility")}>Privacy (public / private)</MenuLink>
            <MenuLink onClick={() => go("/notifications")}>Notifications</MenuLink>
            {/* No "Moderation" entry, even for admins — that surface is kept
                unlisted for now. See SubNav.tsx for the full rationale. */}
          </nav>

          <div className="py-1.5 border-t border-border-soft">
            <button
              role="menuitem"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full text-left px-3.5 py-2 text-[13px] text-destructive hover:bg-panel disabled:opacity-60 transition-colors"
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href="#"
      role="menuitem"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="!no-underline block px-3.5 py-2 text-[13px] text-ink-soft hover:bg-panel hover:text-ink transition-colors"
    >
      {children}
    </Link>
  );
}
