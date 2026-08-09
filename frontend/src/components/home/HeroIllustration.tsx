'use client';
import { motion, useSpring, useTransform } from "framer-motion";
import { useCallback, useRef } from "react";

export function HeroIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const springConfig = { stiffness: 80, damping: 20 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    mouseX.set(nx);
    mouseY.set(ny);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const bgX = useTransform(mouseX, [-1, 1], [-3, 3]);
  const bgY = useTransform(mouseY, [-1, 1], [-2, 2]);
  const fgX = useTransform(mouseX, [-1, 1], [-7, 7]);
  const fgY = useTransform(mouseY, [-1, 1], [-5, 5]);

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ cursor: "default" }}
    >
      <svg viewBox="0 0 480 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md">
        {/* Background layer */}
        <motion.g style={{ x: bgX, y: bgY }}>
          <rect x="88" y="48" width="280" height="350" rx="6" fill="#1A1A1A" opacity="0.04" />
          <rect x="80" y="40" width="280" height="350" rx="6" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1.2" />
          <rect x="80" y="40" width="280" height="28" rx="6" fill="#EDECEB" />
          <rect x="80" y="62" width="280" height="6" fill="#EDECEB" />
          <circle cx="96" cy="54" r="4" fill="#E5484D" opacity="0.6" />
          <circle cx="110" cy="54" r="4" fill="#F5A623" opacity="0.5" />
          <circle cx="124" cy="54" r="4" fill="#2F6F5E" opacity="0.5" />
          <rect x="180" y="49" width="80" height="10" rx="5" fill="#1A1A1A" opacity="0.06" />
          <rect x="105" y="82" width="120" height="10" rx="3" fill="#1A1A1A" opacity="0.75" />
          <rect x="105" y="100" width="170" height="6" rx="2" fill="#1A1A1A" opacity="0.15" />
          <rect x="105" y="118" width="55" height="5" rx="2" fill="#2563EB" opacity="0.2" />
          <rect x="168" y="118" width="4" height="5" rx="1" fill="#1A1A1A" opacity="0.1" />
          <rect x="180" y="118" width="45" height="5" rx="2" fill="#1A1A1A" opacity="0.1" />
          <line x1="105" y1="136" x2="335" y2="136" stroke="#1A1A1A" strokeWidth="0.5" strokeDasharray="4 3" opacity="0.15" />
          <rect x="105" y="148" width="220" height="4" rx="2" fill="#1A1A1A" opacity="0.1" />
          <rect x="105" y="160" width="195" height="4" rx="2" fill="#1A1A1A" opacity="0.1" />
          <rect x="105" y="172" width="210" height="4" rx="2" fill="#1A1A1A" opacity="0.1" />
          <rect x="105" y="184" width="170" height="4" rx="2" fill="#1A1A1A" opacity="0.1" />
          <motion.rect x="101" y="145" width="180" height="14" rx="2" fill="#E5484D" opacity="0.07"
            initial={{ width: 0 }} animate={{ width: 180 }}
            transition={{ duration: 0.6, delay: 1.0, ease: "easeOut" }} />
          <motion.line x1="101" y1="159" x2="281" y2="159" stroke="#E5484D" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 1.2, ease: "easeOut" }} />
          <motion.rect x="101" y="169" width="130" height="14" rx="2" fill="#E5484D" opacity="0.05"
            initial={{ width: 0 }} animate={{ width: 130 }}
            transition={{ duration: 0.5, delay: 1.4, ease: "easeOut" }} />
          <rect x="105" y="206" width="60" height="5" rx="2" fill="#1A1A1A" opacity="0.12" />
          <rect x="105" y="218" width="85" height="8" rx="3" fill="#1A1A1A" opacity="0.06" />
          <text x="108" y="225" fill="#1A1A1A" fontSize="7" fontFamily="Inter, sans-serif" opacity="0.35">$0 – ???</text>
          <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 1.6, ease: "easeOut" }}>
            <polygon points="200,210 208,224 192,224" fill="none" stroke="#E5484D" strokeWidth="1.5" />
            <text x="200" y="222" textAnchor="middle" fill="#E5484D" fontSize="8" fontFamily="Inter, sans-serif" fontWeight="600" dominantBaseline="middle">!</text>
          </motion.g>
          <rect x="105" y="248" width="80" height="24" rx="5" fill="#1A1A1A" opacity="0.06" stroke="#1A1A1A" strokeWidth="0.8" />
          <text x="145" y="263" textAnchor="middle" fill="#1A1A1A" fontSize="8" fontFamily="Inter, sans-serif" opacity="0.3" dominantBaseline="middle">Apply Now</text>
          <rect x="200" y="250" width="110" height="18" rx="3" fill="#E5484D" opacity="0.06" />
          <text x="255" y="261" textAnchor="middle" fill="#E5484D" fontSize="7" fontFamily="Inter, sans-serif" opacity="0.6" dominantBaseline="middle">Reposted 3 times</text>
          <text x="108" y="310" fill="#1A1A1A" fontSize="6.5" fontFamily="Inter, sans-serif" opacity="0.25">Posted: Aug 2024</text>
        </motion.g>

        {/* Foreground layer */}
        <motion.g style={{ x: fgX, y: fgY }}>
          <motion.g transform="translate(285, 180) rotate(-8)"
            initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 1.5, ease: [0.22, 0.61, 0.36, 1] }}>
            <rect x="-48" y="-22" width="96" height="44" rx="4" fill="none" stroke="#E5484D" strokeWidth="2.5" />
            <rect x="-48" y="-22" width="96" height="44" rx="4" fill="#E5484D" opacity="0.04" />
            <text x="0" y="1" textAnchor="middle" fill="#E5484D" fontSize="11" fontFamily="'Playfair Display', serif" fontWeight="600" dominantBaseline="middle">GHOST JOB</text>
            <text x="0" y="14" textAnchor="middle" fill="#E5484D" fontSize="7" fontFamily="Inter, sans-serif" opacity="0.6" dominantBaseline="middle">FLAGGED</text>
          </motion.g>

          <motion.g transform="translate(155, 330)"
            initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, delay: 1.9, ease: [0.22, 0.61, 0.36, 1] }}>
            <circle cx="0" cy="0" r="32" fill="none" stroke="#2F6F5E" strokeWidth="2" strokeDasharray="3 2" />
            <circle cx="0" cy="0" r="25" fill="none" stroke="#2F6F5E" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="25" fill="#2F6F5E" opacity="0.04" />
            <text x="0" y="-4" textAnchor="middle" fill="#2F6F5E" fontSize="7" fontFamily="Inter, sans-serif" fontWeight="600" dominantBaseline="middle">COMMUNITY</text>
            <text x="0" y="7" textAnchor="middle" fill="#2F6F5E" fontSize="7" fontFamily="Inter, sans-serif" fontWeight="600" dominantBaseline="middle">VERIFIED</text>
          </motion.g>

          <motion.g transform="translate(320, 70) rotate(3)"
            initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 2.2, ease: "easeOut" }}>
            <rect x="0" y="0" width="95" height="75" rx="3" fill="#EEF4FF" stroke="#2563EB" strokeWidth="0.8" opacity="0.8" />
            <rect x="0" y="0" width="95" height="14" rx="3" fill="#2563EB" opacity="0.08" />
            <text x="8" y="10" fill="#2563EB" fontSize="6.5" fontFamily="Inter, sans-serif" fontWeight="500" opacity="0.7">INVESTIGATOR NOTE</text>
            <text x="8" y="30" fill="#1A1A1A" fontSize="7.5" fontFamily="Inter, sans-serif" opacity="0.7">No response after</text>
            <text x="8" y="42" fill="#1A1A1A" fontSize="7.5" fontFamily="Inter, sans-serif" opacity="0.7">6 weeks. Same</text>
            <text x="8" y="54" fill="#1A1A1A" fontSize="7.5" fontFamily="Inter, sans-serif" opacity="0.7">listing reposted.</text>
            <text x="8" y="67" fill="#E5484D" fontSize="7.5" fontFamily="Inter, sans-serif" fontWeight="500" opacity="0.8">14 confirmations</text>
          </motion.g>

          <motion.g transform="translate(72, 78)"
            initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 2.0, ease: "easeOut" }}>
            <circle cx="0" cy="0" r="18" fill="none" stroke="#2563EB" strokeWidth="2" />
            <circle cx="0" cy="0" r="14" fill="#2563EB" opacity="0.03" />
            <line x1="13" y1="13" x2="26" y2="26" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
          </motion.g>

          <motion.path d="M 72 100 C 82 120, 90 135, 100 145"
            stroke="#2563EB" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.4" strokeDasharray="3 2"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 2.3, ease: "easeOut" }} />
        </motion.g>
      </svg>
    </motion.div>
  );
}
