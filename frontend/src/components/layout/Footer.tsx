import { Search, Heart } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", position: "relative", zIndex: 10 }}>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 w-fit">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <Search size={16} color="white" />
              </div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600 }}>
                WorkWyse
              </span>
            </Link>
            <p style={{ fontSize: "0.85rem", lineHeight: 1.7, opacity: 0.6, maxWidth: "24rem" }}>
              A public archive of hiring experiences. Helping job seekers make informed decisions and holding companies accountable for transparent hiring practices.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.8, marginBottom: "1rem" }}>
              Platform
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                { label: "Browse Reports", to: "/reports" },
                { label: "Company Records", to: "/companies" },
                { label: "Submit Report", to: "/submit-report" },
                { label: "My Profile", to: "/profile" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.to}
                    style={{ fontSize: "0.85rem", opacity: 0.5, transition: "opacity 0.2s" }}
                    className="hover:opacity-80"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.8, marginBottom: "1rem" }}>
              About
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                { label: "Our Mission", to: "/mission" },
                { label: "How It Works", to: "/how-it-works" },
                { label: "Privacy Policy", to: "/privacy" },
                { label: "Contact Us", to: "/contact" },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.to} style={{ fontSize: "0.85rem", opacity: 0.5, transition: "opacity 0.2s" }} className="hover:opacity-80">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <p style={{ fontSize: "0.8rem", opacity: 0.4 }}>
            &copy; 2026 WorkWyse. All rights reserved.
          </p>
          <p className="flex items-center gap-1" style={{ fontSize: "0.8rem", opacity: 0.4 }}>
            Made with <Heart size={12} color="#2563eb" /> for transparent hiring
          </p>
        </div>
      </div>
    </footer>
  );
}
