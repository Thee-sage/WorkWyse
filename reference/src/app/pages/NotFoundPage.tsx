import { Link } from "react-router";
import { ArrowLeft, Search } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="pt-36 pb-24 text-center">
      <div className="max-w-md mx-auto px-6">
        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-6">
          <Search className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 600 }}>
          Page Not Found
        </h1>
        <p className="text-muted-foreground mt-3" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
          The archive you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-accent mt-6 hover:text-accent/80 transition-colors"
          style={{ fontSize: "0.9rem" }}
        >
          <ArrowLeft size={16} /> Back to home
        </Link>
      </div>
    </div>
  );
}
