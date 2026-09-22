"use client";
import { useEffect, useState, useCallback, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthContext";
import { api } from "../../lib/api";
import SubNav from "./SubNav";
import AccountMenu from "./AccountMenu";
import MobileNav from "./MobileNav";
import { SearchIcon } from "../ui/primitives";
import Logo from "../ui/Logo";

export default function TopBar() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.notifications.unreadCount();
      setUnread(res.data.unreadCount);
    } catch {
      /* silent — the bell just won't show a count */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/registry?search=${encodeURIComponent(query.trim())}` : "/registry");
  }

  return (
    <div className="sticky top-0 z-20 bg-background">
      <div className="flex items-center gap-5 px-4 md:px-8 h-[52px] border-b border-border-strong">
        {/* The lockup replaces the old text wordmark, inheriting `text-ink`
            and dimming on hover the way the nav links do. Below `sm` it drops
            to the symbol alone: the full lockup is ~159px wide at this height,
            which crowds the bell, avatar and hamburger on a narrow phone, and
            the brand guide rules out shrinking the lockup to compensate. */}
        <Link href="/" aria-label="WorkWyse — home" className="shrink-0 text-ink hover:text-ink-soft transition-colors">
          <Logo height={26} decorative className="hidden sm:block" />
          <Logo variant="symbol" height={22} decorative className="block sm:hidden" />
        </Link>
        <span className="hidden lg:inline font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
          A PUBLIC RECORD OF WHAT IS KNOWN ABOUT JOB LISTINGS
        </span>

        <form
          onSubmit={handleSearch}
          role="search"
          className="hidden md:flex items-center gap-2.5 h-[30px] px-3 bg-card border border-border-mid w-[280px] ml-auto focus-within:border-ink transition-colors"
        >
          <SearchIcon className="text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Look up a job or a company"
            placeholder="Look up a job or a company"
            className="flex-1 min-w-0 bg-transparent text-[12.5px] placeholder:text-faint outline-none"
          />
          <span className="font-mono text-[9.5px] text-faintest" aria-hidden="true">⏎</span>
        </form>

        {/* On mobile this lives inside the drawer instead (see MobileNav),
            so it doesn't compete for space with search/bell/avatar in a
            52px row on a narrow phone. */}
        <Link
          href="/contribute"
          className="hidden md:inline-block font-mono text-[10px] tracking-[0.1em] border border-ink px-3 py-[7px] hover:bg-ink hover:text-background transition-colors shrink-0 !no-underline"
        >
          CONTRIBUTE
        </Link>

        {/* Mobile-only: search and contribute move into the drawer, so this
            pushes the hamburger to the far right the same way the desktop
            search bar does with `ml-auto`. */}
        <div className="md:hidden ml-auto flex items-center gap-4">
          {isAuthenticated && <NotificationBell unread={unread} />}
          {isAuthenticated && <AccountMenu />}
          <MobileNav />
        </div>

        {isAuthenticated ? (
          <div className="hidden md:flex items-center gap-5 shrink-0">
            <NotificationBell unread={unread} />
            <AccountMenu />
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-3 shrink-0 font-mono text-[10px] tracking-[0.08em]">
            <Link href="/login">LOG IN</Link>
            <Link href="/register" className="border border-ink px-3 py-[7px] !no-underline hover:bg-ink hover:text-background transition-colors">
              REGISTER
            </Link>
          </div>
        )}
      </div>
      <div className="hidden md:block">
        <SubNav />
      </div>
    </div>
  );
}

/**
 * Notifications entry point.
 *
 * This was a bare "◔" character with an aria-label — visually a quarter-circle
 * that reads as nothing in particular, and its unread state was a 6px amber
 * dot carrying no number. The glyph is now a bell drawn in the same thin-stroke
 * geometric style as the rest of the app's marks, and the unread state shows
 * the actual count (capped at 9+) so the bar answers "how much is waiting?"
 * rather than only "something is waiting".
 */
function NotificationBell({ unread }: { unread: number }) {
  const label = unread > 0 ? `Notifications — ${unread} unread` : "Notifications";
  return (
    <Link
      href="/notifications"
      aria-label={label}
      title={label}
      className="relative text-ink-soft hover:text-ink transition-colors shrink-0"
    >
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
        <path
          d="M4 7a4.5 4.5 0 0 1 9 0c0 3 1 4.2 1.5 4.7H2.5C3 11.2 4 10 4 7Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M7 13.8a1.7 1.7 0 0 0 3 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-amber text-background font-mono text-[9px] font-semibold flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
