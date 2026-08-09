import { Clock, MapPin, Users, AlertTriangle, CheckCircle, Flag } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { TrustScoreBadge } from "./TrustScoreBadge";

interface ReportCardProps {
  id?: string;
  company: string;
  companySlug?: string;
  role: string;
  location: string;
  date: string;
  status: "ghost" | "legitimate" | "suspicious";
  trustScore: number;
  confirmations: number;
  excerpt: string;
  index?: number;
  linkable?: boolean;
}

export function ReportCard({
  id,
  company,
  companySlug,
  role,
  location,
  date,
  status,
  trustScore,
  confirmations,
  excerpt,
  index = 0,
  linkable = true,
}: ReportCardProps) {
  const statusConfig = {
    ghost: { label: "Ghost Job", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    legitimate: { label: "Legitimate", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
    suspicious: { label: "Suspicious", icon: Flag, color: "text-amber-600 bg-amber-50" },
  };

  const s = statusConfig[status];
  const StatusIcon = s.icon;

  const card = (
    <motion.div
      className="bg-card rounded-xl border border-border p-6 relative overflow-hidden cursor-pointer group h-full"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{
        y: -4,
        boxShadow: "0 8px 28px -8px rgba(26, 26, 26, 0.1), 0 2px 8px -2px rgba(26, 26, 26, 0.04)",
      }}
      style={{
        boxShadow: "0 1px 3px 0 rgba(26, 26, 26, 0.04)",
      }}
    >
      {/* Corner fold */}
      <div className="absolute top-0 right-0 w-10 h-10 overflow-hidden">
        <div
          className="absolute -top-5 -right-5 w-10 h-10 bg-secondary rotate-45 origin-bottom-left transition-transform duration-200 group-hover:scale-110"
        />
      </div>

      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0">
          <h3 className="text-foreground" style={{ fontSize: "1.1rem" }}>
            {companySlug ? (
              <Link
                to={`/companies/${companySlug}`}
                className="hover:text-accent transition-colors duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {company}
              </Link>
            ) : (
              company
            )}
          </h3>
          <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>{role}</p>
        </div>
        <TrustScoreBadge score={trustScore} size="sm" confirmations={confirmations} expandable />
      </div>

      <div className="flex flex-wrap gap-3 mb-4" style={{ fontSize: "0.8rem" }}>
        <span className="flex items-center gap-1 text-muted-foreground">
          <MapPin size={13} /> {location}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock size={13} /> {date}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Users size={13} /> {confirmations} confirmed
        </span>
      </div>

      <p className="text-muted-foreground mb-4" style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
        &ldquo;{excerpt}&rdquo;
      </p>

      <div className="flex items-center justify-between mt-auto">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.color}`}
          style={{ fontSize: "0.75rem", fontWeight: 500 }}
        >
          <StatusIcon size={12} />
          {s.label}
        </span>
        <span
          className="text-accent transition-colors duration-200 hover:text-accent/80"
          style={{ fontSize: "0.8rem" }}
        >
          Read full report &rarr;
        </span>
      </div>

      {/* Stamp watermark */}
      {status === "ghost" && (
        <div
          className="absolute bottom-4 right-6 pointer-events-none select-none opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "3rem",
            fontWeight: 700,
            transform: "rotate(-10deg)",
          }}
        >
          FLAGGED
        </div>
      )}
    </motion.div>
  );

  if (linkable && id) {
    return <Link to={`/reports/${id}`} className="block h-full">{card}</Link>;
  }

  return card;
}
