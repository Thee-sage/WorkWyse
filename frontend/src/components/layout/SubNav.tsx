"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../AuthContext";

interface NavItem {
  label: string;
  href: string;
  match?: (path: string) => boolean;
  requiresAuth?: boolean;
  requiresStaff?: boolean;
  glyph?: string;
}

const ITEMS: NavItem[] = [
  { label: "HOME", href: "/", match: (p) => p === "/" },
  { label: "REGISTRY", href: "/registry", match: (p) => p.startsWith("/registry") },
  { label: "COMPANIES", href: "/companies", match: (p) => p.startsWith("/companies") },
  { label: "ACTIVITY", href: "/activity", match: (p) => p.startsWith("/activity") },
  { label: "CONTRIBUTE", href: "/contribute", match: (p) => p.startsWith("/contribute") },
  { label: "YOUR ACTIVITY", href: "/profile", match: (p) => p.startsWith("/profile"), requiresAuth: true },
  { label: "NOTIFICATIONS", href: "/notifications", match: (p) => p.startsWith("/notifications"), requiresAuth: true },
  { label: "HOW THIS WORKS", href: "/about", match: (p) => p.startsWith("/about") },
];

export default function SubNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const items = ITEMS.filter((item) => !item.requiresAuth || isAuthenticated);

  // Deliberately no "MODERATION" entry here, even for staff accounts — the
  // admin/moderation surface is being kept unlisted for now: reachable only
  // by someone who already has the direct /moderation link, not discoverable
  // by browsing the app. The route itself still enforces its own
  // authentication and role checks (and, for admin actions, the passphrase
  // second factor); this only removes the visible signpost to it.
  return (
    <div className="flex items-center gap-0 px-4 md:px-8 border-b border-border overflow-x-auto bg-panel">
      {items.map((item) => {
        const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`font-mono text-[10px] tracking-[0.1em] py-2.5 px-3 whitespace-nowrap !no-underline transition-colors ${
              active ? "text-ink" : "text-muted-foreground hover:text-ink-soft"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
