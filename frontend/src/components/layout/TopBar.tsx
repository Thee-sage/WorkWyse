"use client";
import { useEffect, useState, useCallback, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthContext";
import { api } from "../../lib/api";
import SubNav from "./SubNav";
import AccountMenu from "./AccountMenu";
import MobileNav from "./MobileNav";

export default function TopBar() {
  const { user, isAuthenticated } = useAuth();
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
        <Link href="/" className="text-[17px] font-bold tracking-[-0.025em] shrink-0">
          WorkWyse
        </Link>
        <span className="hidden lg:inline font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
          A PUBLIC RECORD OF WHAT IS KNOWN ABOUT JOB LISTINGS
        </span>

        <form
          onSubmit={handleSearch}
          className="hidden md:flex items-center gap-2.5 h-[30px] px-3 bg-card border border-border-mid w-[280px] ml-auto"
        >
          <span className="w-[9px] h-[9px] rounded-full border-[1.5px] border-faint shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Look up a job or a company"
            className="flex-1 min-w-0 bg-transparent text-[12.5px] placeholder:text-faint outline-none"
          />
          <span className="font-mono text-[9.5px] text-faintest">⏎</span>
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
          {isAuthenticated && (
            <Link href="/notifications" className="relative font-mono text-[13px] text-ink-soft" aria-label="Notifications">
              ◔
              {unread > 0 && <span className="absolute -top-1 -right-1.5 w-[6px] h-[6px] rounded-full bg-amber" />}
            </Link>
          )}
          {isAuthenticated && <AccountMenu />}
          <MobileNav />
        </div>

        {isAuthenticated ? (
          <div className="hidden md:flex items-center gap-5 shrink-0">
            <Link href="/notifications" className="relative font-mono text-[11px] text-ink-soft" aria-label="Notifications">
              ◔
              {unread > 0 && (
                <span className="absolute -top-1 -right-1.5 w-[6px] h-[6px] rounded-full bg-amber" />
              )}
            </Link>
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
