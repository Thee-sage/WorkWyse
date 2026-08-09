import { Search, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Link, useLocation } from "react-router";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: "/reports", label: "Reports" },
    { to: "/companies", label: "Companies" },
    { to: "/profile", label: "Profile" },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Search className="w-[18px] h-[18px] text-accent-foreground" />
          </div>
          <span
            className="tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 600 }}
          >
            WorkWyse
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`transition-colors duration-200 ${
                isActive(link.to) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontSize: "0.875rem" }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/submit"
            className="bg-accent text-accent-foreground px-5 py-2 rounded-lg transition-shadow duration-200 hover:shadow-md"
            style={{ fontSize: "0.875rem" }}
          >
            Submit a Report
          </Link>
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="md:hidden bg-card border-t border-border px-6 py-4 flex flex-col gap-4 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`transition-colors ${
                  isActive(link.to) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ fontSize: "0.875rem" }}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/submit"
              className="bg-accent text-accent-foreground px-5 py-2 rounded-lg text-center"
              style={{ fontSize: "0.875rem" }}
              onClick={() => setMenuOpen(false)}
            >
              Submit a Report
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
