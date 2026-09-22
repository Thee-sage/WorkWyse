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

/**
 * The four places the public record lives. CONTRIBUTE and NOTIFICATIONS used
 * to sit here too, but both already have a permanent control in the top bar
 * immediately above (the outlined CONTRIBUTE button and the bell), so the tab
 * was pure duplication competing with the more prominent copy of itself.
 */
const PRIMARY: NavItem[] = [
  { label: "HOME", href: "/", match: (p) => p === "/" },
  { label: "REGISTRY", href: "/registry", match: (p) => p.startsWith("/registry") },
  { label: "COMPANIES", href: "/companies", match: (p) => p.startsWith("/companies") },
  { label: "ACTIVITY", href: "/activity", match: (p) => p.startsWith("/activity") },
];

/**
 * Right-aligned group: "your own stuff" and "help". Kept visually apart from
 * PRIMARY so eight equal-weight tabs stop reading as one undifferentiated row.
 *
 * "YOUR ACTIVITY" is labelled "YOUR PROFILE" here: sitting one item away from
 * the global "ACTIVITY" feed, the old label read as a filtered version of it
 * rather than a different destination. This also matches what AccountMenu
 * already calls the same page ("Profile & activity"). Route unchanged.
 */
const SECONDARY: NavItem[] = [
  { label: "YOUR PROFILE", href: "/profile", match: (p) => p.startsWith("/profile"), requiresAuth: true },
  { label: "HOW THIS WORKS", href: "/about", match: (p) => p.startsWith("/about") },
];

export default function SubNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const secondary = SECONDARY.filter((item) => !item.requiresAuth || isAuthenticated);

  // Deliberately no "MODERATION" entry here, even for staff accounts — the
  // admin/moderation surface is being kept unlisted for now: reachable only
  // by someone who already has the direct /moderation link, not discoverable
  // by browsing the app. The route itself still enforces its own
  // authentication and role checks (and, for admin actions, the passphrase
  // second factor); this only removes the visible signpost to it.
  return (
    <nav
      aria-label="Sections"
      className="flex items-center gap-0 px-4 md:px-8 border-b border-border overflow-x-auto bg-panel"
    >
      {PRIMARY.map((item) => (
        <NavTab key={item.href} item={item} pathname={pathname} />
      ))}
      {secondary.length > 0 && (
        <div className="ml-auto flex items-center">
          {secondary.map((item) => (
            <NavTab key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      )}
    </nav>
  );
}

/**
 * A single tab. The active state is a 2px accent underline rather than the
 * previous grey→black text shift, which at 10px uppercase mono was too subtle
 * to answer "where am I?". The underline is the same treatment the shared
 * `Tab` primitive already uses on Company and Profile, so this introduces no
 * new visual language.
 */
function NavTab({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`font-mono text-[10px] tracking-[0.1em] py-2.5 px-3 whitespace-nowrap !no-underline border-b-2 -mb-px transition-colors ${
        active
          ? "text-ink border-accent"
          : "text-muted-foreground border-transparent hover:text-ink hover:border-border-mid"
      }`}
    >
      {item.label}
    </Link>
  );
}
