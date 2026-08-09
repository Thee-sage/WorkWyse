import { Search, Heart } from "lucide-react";
import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="relative z-10 bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4 w-fit">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Search className="w-4 h-4 text-accent-foreground" />
              </div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600 }}>
                WorkWyse
              </span>
            </Link>
            <p className="opacity-60 max-w-sm" style={{ fontSize: "0.85rem", lineHeight: 1.7 }}>
              A public archive of hiring experiences. Helping job seekers make informed decisions and holding companies accountable for transparent hiring practices.
            </p>
          </div>

          <div>
            <h4 className="mb-4 opacity-80" style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Platform
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Browse Reports", to: "/reports" },
                { label: "Company Records", to: "/companies" },
                { label: "Submit Report", to: "/submit" },
                { label: "My Profile", to: "/profile" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="opacity-50 hover:opacity-80 transition-opacity duration-200"
                    style={{ fontSize: "0.85rem" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 opacity-80" style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              About
            </h4>
            <ul className="space-y-2.5">
              {["Our Mission", "How It Works", "Privacy Policy", "Contact Us"].map((item) => (
                <li key={item}>
                  <span
                    className="opacity-50 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                    style={{ fontSize: "0.85rem" }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="opacity-40" style={{ fontSize: "0.8rem" }}>
            &copy; 2026 WorkWyse. All rights reserved.
          </p>
          <p className="flex items-center gap-1 opacity-40" style={{ fontSize: "0.8rem" }}>
            Made with <Heart size={12} className="text-accent" /> for transparent hiring
          </p>
        </div>
      </div>
    </footer>
  );
}
