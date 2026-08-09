'use client';
import { Building2, FileText, TrendingDown, TrendingUp, ChevronDown, AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { TrustScoreBadge } from "../ui/TrustScoreBadge";

interface CompanyCardProps {
  name: string;
  industry: string;
  totalReports: number;
  ghostJobRate: number;
  trustScore: number;
  trend: "up" | "down";
  compact?: boolean;
}

export function CompanyCard({ name, industry, totalReports, ghostJobRate, trustScore, trend, compact = false }: CompanyCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="bg-card rounded-xl border border-border shadow-sm relative overflow-hidden cursor-pointer transition-shadow duration-200 hover:shadow-md"
      onClick={compact ? undefined : () => setIsOpen(!isOpen)}
    >
      {/* Archive tab */}
      <div
        className="absolute top-0 left-6 px-3 py-1 rounded-b-md border-x border-b border-border z-10"
        style={{ fontSize: "0.65rem", fontWeight: 500, backgroundColor: "var(--secondary)" }}
      >
        COMPANY FILE
      </div>

      <div className="p-6">
        <div className="mt-4 flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--muted)" }}>
            <Building2 size={24} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 style={{ fontSize: "1.1rem", fontFamily: "'Playfair Display', serif" }}>{name}</h3>
              <TrustScoreBadge score={trustScore} size="sm" />
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>{industry}</p>
          </div>
          {!compact && (
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <ChevronDown size={18} style={{ color: "var(--muted-foreground)" }} />
            </motion.div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          {[
            { icon: <FileText size={14} />, value: totalReports, label: "Reports", iconClass: "text-muted-foreground" },
            {
              icon: trend === "down"
                ? <TrendingDown size={14} className="text-emerald-600" />
                : <TrendingUp size={14} className="text-red-500" />,
              value: `${ghostJobRate}%`,
              label: "Ghost Rate",
              iconClass: "",
            },
            { icon: <span style={{ fontSize: "0.85rem" }}>&bull;</span>, value: `${trustScore}%`, label: "Trust", iconClass: "text-muted-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-lg" style={{ backgroundColor: "var(--background)" }}>
              <div className={`flex items-center justify-center gap-1 mb-1 ${stat.iconClass}`}>
                {stat.icon}
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 600 }}>{stat.value}</p>
              <p style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable drawer */}
      <AnimatePresence>
        {isOpen && !compact && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-dashed border-border pt-4">
              <div className="flex items-center gap-2 mb-3" style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                <FileText size={12} />
                File Contents
              </div>

              <div className="space-y-2">
                {[
                  {
                    icon: ghostJobRate > 50 ? <AlertTriangle size={13} className="text-red-500" /> : <CheckCircle2 size={13} className="text-emerald-600" />,
                    text: ghostJobRate > 50 ? "High ghost job rate detected" : "Acceptable ghost job rate",
                  },
                  { icon: <Eye size={13} className="text-blue-600" />, text: `${totalReports} reports under review` },
                  {
                    icon: <TrendingDown size={13} style={{ color: trend === "down" ? "#2F6F5E" : "#E5484D" }} />,
                    text: trend === "down" ? "Ghost rate declining" : "Ghost rate increasing",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-2.5 p-2 rounded-md"
                    style={{ fontSize: "0.8rem", backgroundColor: "var(--background)" }}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.06, ease: "easeOut" }}
                  >
                    {item.icon}
                    <span style={{ color: "var(--muted-foreground)" }}>{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex justify-between mb-1.5" style={{ fontSize: "0.7rem" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Trust Score</span>
                  <span style={{ fontWeight: 500 }}>{trustScore}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: trustScore >= 70 ? "#2F6F5E" : trustScore >= 40 ? "#D4A84A" : "#E5484D" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${trustScore}%` }}
                    transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
