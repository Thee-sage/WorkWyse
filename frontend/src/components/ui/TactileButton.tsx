'use client';
import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface TactileButtonProps {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}

export function TactileButton({
  children,
  href,
  variant = "primary",
  className = "",
  onClick,
  type = "button",
  disabled,
}: TactileButtonProps) {
  const isPrimary = variant === "primary";

  const baseClass = isPrimary
    ? "inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-lg"
    : "inline-flex items-center gap-2 text-foreground rounded-lg border border-border bg-card";

  const Component = href ? motion.a : motion.button;

  return (
    <Component
      {...(href ? { href } : { type, onClick, disabled })}
      className={`${baseClass} ${className}`}
      style={{ fontSize: "0.95rem", ...(disabled ? { opacity: 0.5, pointerEvents: 'none' as const } : {}) }}

      whileHover={{
        y: -1,
        boxShadow: isPrimary
          ? "0 6px 20px -6px rgba(37, 99, 235, 0.35)"
          : "0 4px 16px -4px rgba(26, 26, 26, 0.1)",
      }}
      whileTap={{ y: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </Component>
  );
}
