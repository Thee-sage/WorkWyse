"use client";
import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../AuthContext";
import { SearchIcon } from "../ui/primitives";
import Logo from "../ui/Logo";

interface NavItem {
  label: string;
  href: string;
  hint?: string;
  match?: (path: string) => boolean;
  requiresAuth?: boolean;
}

// Mirrors SubNav.tsx's item list — kept as a separate array rather than a
// shared import because the two components render it very differently
// (a horizontal scroller vs. a full-height drawer list) and having them
// diverge slightly over time is more likely than one file serving both well.
//
// The drawer has vertical room the tab strip does not, so each destination
// carries a one-line hint saying what is actually there. "Activity" and
// "Registry" are otherwise indistinguishable to someone who has never used
// WorkWyse.
const BROWSE: NavItem[] = [
  { label: "Home", href: "/", match: (p) => p === "/" },
  { label: "Registry", href: "/registry", hint: "Every listing we track", match: (p) => p.startsWith("/registry") },
  { label: "Companies", href: "/companies", hint: "Every employer we track", match: (p) => p.startsWith("/companies") },
  { label: "Activity", href: "/activity", hint: "Everything that changed, site-wide", match: (p) => p.startsWith("/activity") },
];

// "Your activity" is labelled "Your profile" for the same reason as in
// SubNav — it sat next to the global "Activity" feed and read as a filter on
// it. Route unchanged.
const YOURS: NavItem[] = [
  { label: "Your profile", href: "/profile", hint: "What you filed, watched, challenged", match: (p) => p.startsWith("/profile"), requiresAuth: true },
  { label: "Notifications", href: "/notifications", hint: "What changed on your contributions", match: (p) => p.startsWith("/notifications"), requiresAuth: true },
  { label: "How this works", href: "/about", match: (p) => p.startsWith("/about") },
];

/**
 * Mobile navigation: a hamburger trigger plus a full-height slide-in drawer.
 *
 * Below the md breakpoint, SubNav's horizontally-scrolling tab strip is the
 * wrong pattern — eight cramped mono-text tabs in a scrollable sliver, no
 * search at all (the desktop search bar is `hidden md:flex`), and tiny
 * touch targets. This replaces that experience entirely on small screens;
 * SubNav itself stays hidden below md (see TopBar.tsx) and continues to
 * serve tablet/desktop exactly as before.
 */
export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on route change — otherwise the drawer stays open behind the new
  // page after tapping a link.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open, and close on Escape — the
  // same conventions AccountMenu already uses for its dropdown.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setOpen(false);
    router.push(query.trim() ? `/registry?search=${encodeURIComponent(query.trim())}` : "/registry");
  }

  const yours = YOURS.filter((item) => !item.requiresAuth || isAuthenticated);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="md:hidden shrink-0 w-8 h-8 flex flex-col items-center justify-center gap-[4px] -mr-1"
      >
        <span className="block w-[18px] h-[1.5px] bg-ink" />
        <span className="block w-[18px] h-[1.5px] bg-ink" />
        <span className="block w-[18px] h-[1.5px] bg-ink" />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Scrim — tapping outside the panel closes it, same as AccountMenu's
              click-outside behaviour. */}
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={panelRef}
            role="menu"
            className="absolute top-0 right-0 h-full w-[86%] max-w-[340px] bg-background border-l border-border-strong flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between px-4 h-[52px] border-b border-border-strong shrink-0">
              <Logo height={24} className="text-ink" />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="w-8 h-8 flex items-center justify-center text-[20px] leading-none text-ink-soft"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSearch} role="search" className="flex items-center gap-2.5 h-11 px-3.5 mx-4 mt-4 bg-card border border-border-mid shrink-0 focus-within:border-ink transition-colors">
              <SearchIcon size={13} className="text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Look up a job or a company"
                placeholder="Look up a job or a company"
                className="flex-1 min-w-0 bg-transparent text-[14px] placeholder:text-faint outline-none"
              />
              <button type="submit" aria-label="Search" className="font-mono text-[11px] text-faintest shrink-0">
                ⏎
              </button>
            </form>

            <nav className="mt-4 flex flex-col">
              <DrawerGroupLabel>THE RECORD</DrawerGroupLabel>
              {BROWSE.map((item) => (
                <DrawerLink key={item.href} item={item} pathname={pathname} />
              ))}
              {yours.length > 0 && (
                <>
                  <DrawerGroupLabel className="mt-4">
                    {isAuthenticated ? "YOU" : "MORE"}
                  </DrawerGroupLabel>
                  {yours.map((item) => (
                    <DrawerLink key={item.href} item={item} pathname={pathname} />
                  ))}
                </>
              )}
            </nav>

            <div className="mt-auto p-4 border-t border-border-soft shrink-0 flex flex-col gap-2.5">
              {!isAuthenticated && (
                <div className="flex items-center gap-2.5">
                  <Link
                    href="/login"
                    className="!no-underline flex-1 text-center font-mono text-[11px] tracking-[0.1em] border border-border-mid px-4 py-3"
                  >
                    LOG IN
                  </Link>
                  <Link
                    href="/register"
                    className="!no-underline flex-1 text-center font-mono text-[11px] tracking-[0.1em] border border-ink px-4 py-3 hover:bg-ink hover:text-background transition-colors"
                  >
                    REGISTER
                  </Link>
                </div>
              )}
              <Link
                href="/contribute"
                className="!no-underline block text-center font-mono text-[11px] tracking-[0.1em] bg-ink text-background px-4 py-3 hover:bg-ink-soft transition-colors"
              >
                CONTRIBUTE
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DrawerGroupLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`px-4 pb-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground ${className}`}>
      {children}
    </span>
  );
}

/**
 * A drawer row. Active is marked with a 2px accent bar on the leading edge —
 * the vertical equivalent of SubNav's underline — because the previous
 * background-tint-only treatment was easy to miss against the panel colour.
 */
function DrawerLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      className={`!no-underline px-4 py-3 border-b border-border-soft border-l-2 transition-colors ${
        active ? "text-ink bg-panel border-l-accent" : "text-ink-soft border-l-transparent"
      }`}
    >
      <span className="block text-[15px] font-medium">{item.label}</span>
      {item.hint && <span className="block mt-0.5 text-[12.5px] text-muted">{item.hint}</span>}
    </Link>
  );
}
