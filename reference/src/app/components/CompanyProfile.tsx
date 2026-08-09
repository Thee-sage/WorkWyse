import { Building2, FileText, TrendingDown, TrendingUp, ChevronDown, AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { TrustScoreBadge } from "./TrustScoreBadge";

interface CompanyProfileProps {
  name: string;
  industry: string;
  totalReports: number;
  ghostJobRate: number;
  trustScore: number;
  trend: "up" | "down";
  compact?: boolean;
}

export function CompanyProfile({ name, industry, totalReports, ghostJobRate, trustScore, trend, compact = false }: CompanyProfileProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="bg-card rounded-xl border border-border shadow-sm relative overflow-hidden cursor-pointer transition-shadow duration-200 hover:shadow-md"
      onClick={compact ? undefined : () => setIsOpen(!isOpen)}
    >
      {/* Archive tab */}
      <div
        className="absolute top-0 left-6 bg-secondary px-3 py-1 rounded-b-md border-x border-b border-border z-10"
        style={{ fontSize: "0.65rem", fontWeight: 500 }}
      >
        COMPANY FILE
      </div>

      <div className="p-6">
        <div className="mt-4 flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 style={{ fontSize: "1.1rem" }}>{name}</h3>
              <TrustScoreBadge score={trustScore} size="sm" />
            </div>
            <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>{industry}</p>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {!compact && <ChevronDown size={18} className="text-muted-foreground" />}
          </motion.div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          {[
            {
              icon: <FileText size={14} />,
              value: totalReports,
              label: "Reports",
              iconClass: "text-muted-foreground",
            },
            {
              icon: trend === "down" ? <TrendingDown size={14} className="text-emerald-600" /> : <TrendingUp size={14} className="text-red-500" />,
              value: `${ghostJobRate}%`,
              label: "Ghost Rate",
              iconClass: "",
            },
            {
              icon: <span style={{ fontSize: "0.85rem" }}>&bull;</span>,
              value: `${trustScore}%`,
              label: "Trust",
              iconClass: "text-muted-foreground",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-3 bg-background rounded-lg"
            >
              <div className={`flex items-center justify-center gap-1 mb-1 ${stat.iconClass}`}>
                {stat.icon}
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 600 }}>{stat.value}</p>
              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{stat.label}</p>
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
              <div className="flex items-center gap-2 mb-3 text-muted-foreground" style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                <FileText size={12} />
                File Contents
              </div>

              <div className="space-y-2">
                {[
                  {
                    icon: ghostJobRate > 50 ? <AlertTriangle size={13} className="text-red-500" /> : <CheckCircle2 size={13} className="text-emerald-600" />,
                    text: ghostJobRate > 50 ? "High ghost job rate detected" : "Acceptable ghost job rate",
                  },
                  {
                    icon: <Eye size={13} className="text-blue-600" />,
                    text: `${totalReports} reports under review`,
                  },
                  {
                    icon: <TrendingDown size={13} className={trend === "down" ? "text-emerald-600" : "text-red-500"} />,
                    text: trend === "down" ? "Ghost rate declining" : "Ghost rate increasing",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-2.5 p-2 rounded-md bg-background"
                    style={{ fontSize: "0.8rem" }}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.06, ease: "easeOut" }}
                  >
                    {item.icon}
                    <span className="text-muted-foreground">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex justify-between mb-1.5" style={{ fontSize: "0.7rem" }}>
                  <span className="text-muted-foreground">Trust Score</span>
                  <span style={{ fontWeight: 500 }}>{trustScore}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: trustScore >= 70 ? "#2F6F5E" : trustScore >= 40 ? "#D4A84A" : "#E5484D",
                    }}
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