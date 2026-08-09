import { ShieldCheck, ShieldAlert, ShieldQuestion, Users, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

interface TrustScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  expandable?: boolean;
  confirmations?: number;
}

export function TrustScoreBadge({
  score,
  size = "md",
  expandable = false,
  confirmations,
}: TrustScoreBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getConfig = () => {
    if (score >= 70)
      return {
        label: "Verified",
        detail: "Community verified",
        color: "bg-emerald-100 text-emerald-800 border-emerald-300",
        bgExpand: "bg-emerald-50 border-emerald-200",
        icon: ShieldCheck,
      };
    if (score >= 40)
      return {
        label: "Uncertain",
        detail: "Under review",
        color: "bg-amber-100 text-amber-800 border-amber-300",
        bgExpand: "bg-amber-50 border-amber-200",
        icon: ShieldQuestion,
      };
    return {
      label: "Caution",
      detail: "Multiple flags",
      color: "bg-red-100 text-red-800 border-red-300",
      bgExpand: "bg-red-50 border-red-200",
      icon: ShieldAlert,
    };
  };

  const config = getConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 gap-1",
    md: "px-3 py-1 gap-1.5",
    lg: "px-4 py-1.5 gap-2",
  };

  const iconSize = { sm: 12, md: 16, lg: 20 };

  return (
    <div
      className="relative"
      onMouseEnter={() => expandable && setIsExpanded(true)}
      onMouseLeave={() => expandable && setIsExpanded(false)}
    >
      <div
        className={`inline-flex items-center rounded-full border ${config.color} ${sizeClasses[size]} cursor-default transition-shadow duration-200 ${isExpanded ? "shadow-sm" : ""}`}
        style={{
          fontSize: size === "sm" ? "0.7rem" : size === "md" ? "0.8rem" : "0.875rem",
          fontWeight: 500,
        }}
      >
        <Icon size={iconSize[size]} />
        <span>{config.label}</span>
        <span className="opacity-60">({score}%)</span>
      </div>

      <AnimatePresence>
        {isExpanded && expandable && (
          <motion.div
            className={`absolute top-full right-0 mt-1.5 rounded-lg border ${config.bgExpand} p-2.5 shadow-md z-50 whitespace-nowrap`}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ transformOrigin: "top right" }}
          >
            <div className="flex flex-col gap-1" style={{ fontSize: "0.72rem" }}>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={11} />
                <span>{config.detail}</span>
              </div>
              {confirmations !== undefined && (
                <div className="flex items-center gap-1.5 opacity-70">
                  <Users size={11} />
                  <span>{confirmations} confirmations</span>
                </div>
              )}
              <div className="mt-1 pt-1 border-t border-current/10 flex items-center gap-1.5">
                <div className="w-14 h-1.5 rounded-full bg-current/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-current/40"
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
                  />
                </div>
                <span className="opacity-60">{score}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
