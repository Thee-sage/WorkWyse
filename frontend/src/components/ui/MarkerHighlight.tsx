'use client';
import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface MarkerHighlightProps {
  children: ReactNode;
  color?: string;
  delay?: number;
}

export function MarkerHighlight({
  children,
  color = "rgba(37, 99, 235, 0.08)",
  delay = 0,
}: MarkerHighlightProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  return (
    <span ref={ref} className="relative inline">
      <motion.span
        className="absolute inset-0 -mx-0.5 rounded-sm pointer-events-none"
        style={{ background: color, transformOrigin: "left center" }}
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.5, delay, ease: [0.22, 0.61, 0.36, 1] }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}
