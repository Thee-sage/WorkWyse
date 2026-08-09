'use client';
import { motion } from "framer-motion";
import { MarkerHighlight } from "@/components/ui/MarkerHighlight";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function BannerPage() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-background" style={{ minHeight: '100vh', display: 'flex' }}>
      <style>{`nav, footer { display: none !important; } main { padding: 0 !important; margin: 0 !important; }`}</style>
      <motion.h1
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease }}
        style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(3.5rem, 6vw, 5rem)", lineHeight: 1.15, fontWeight: 700, textAlign: "center" }}
      >
        Stop Applying<br />
        <span className="relative inline-block">
          <MarkerHighlight delay={0.7}>Into The Void</MarkerHighlight>
          <motion.svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" preserveAspectRatio="none">
            <motion.path d="M 0 6 Q 50 0 100 4 Q 150 8 200 2" stroke="#2563EB" strokeWidth="2.5" fill="none" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }} />
          </motion.svg>
        </span>
      </motion.h1>
    </div>
  );
}
