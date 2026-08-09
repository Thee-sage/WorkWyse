'use client';
import { motion } from "framer-motion";

export function ReportIllustration() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <svg viewBox="0 0 360 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm">
        <rect x="40" y="20" width="280" height="240" rx="8" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1" />
        <rect x="40" y="20" width="280" height="36" rx="8" fill="#EDECEB" />
        <rect x="40" y="48" width="280" height="8" fill="#EDECEB" />
        <rect x="60" y="36" width="100" height="8" rx="3" fill="#1A1A1A" opacity="0.2" />
        <rect x="240" y="34" width="60" height="12" rx="4" fill="#2563EB" opacity="0.15" />
        <rect x="60" y="75" width="80" height="8" rx="3" fill="#1A1A1A" opacity="0.7" />
        <rect x="60" y="92" width="180" height="5" rx="2" fill="#1A1A1A" opacity="0.12" />
        <rect x="60" y="104" width="150" height="5" rx="2" fill="#1A1A1A" opacity="0.12" />
        <rect x="60" y="116" width="200" height="5" rx="2" fill="#1A1A1A" opacity="0.12" />
        <rect x="60" y="140" width="240" height="1" stroke="#1A1A1A" strokeDasharray="4 3" opacity="0.1" />
        <rect x="60" y="155" width="120" height="8" rx="3" fill="#1A1A1A" opacity="0.08" />
        <rect x="60" y="170" width="90" height="8" rx="3" fill="#1A1A1A" opacity="0.08" />
        <motion.rect x="56" y="152" width="130" height="16" rx="2" fill="#2563EB" opacity="0.07"
          initial={{ width: 0 }} whileInView={{ width: 130 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }} />
        <rect x="60" y="200" width="80" height="28" rx="6" fill="#2563EB" opacity="0.9" />
        <text x="100" y="215" textAnchor="middle" fill="white" fontSize="9" fontFamily="Inter, sans-serif" fontWeight="500" dominantBaseline="middle">Submit Report</text>
        <motion.g initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.6, ease: [0.22, 0.61, 0.36, 1] }} style={{ transformOrigin: "260px 200px" }}>
          <circle cx="260" cy="200" r="28" fill="#2F6F5E" opacity="0.08" stroke="#2F6F5E" strokeWidth="1.5" />
          <text x="260" y="198" textAnchor="middle" fill="#2F6F5E" fontSize="8" fontFamily="Inter, sans-serif" fontWeight="600" dominantBaseline="middle">FILED</text>
          <text x="260" y="208" textAnchor="middle" fill="#2F6F5E" fontSize="7" fontFamily="Inter, sans-serif" opacity="0.7" dominantBaseline="middle">✓</text>
        </motion.g>
      </svg>
    </motion.div>
  );
}

export function VerificationIllustration() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <svg viewBox="0 0 360 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm">
        {[
          { x: 60, y: 40, color: "#2563EB", label: "Alex C.", delay: 0 },
          { x: 180, y: 80, color: "#2F6F5E", label: "Priya S.", delay: 0.1 },
          { x: 120, y: 150, color: "#D4A84A", label: "Jordan R.", delay: 0.2 },
          { x: 250, y: 40, color: "#E5484D", label: "Sam P.", delay: 0.15 },
          { x: 280, y: 160, color: "#6366f1", label: "Taylor K.", delay: 0.25 },
        ].map((node) => (
          <motion.g key={node.label} initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay: node.delay, ease: [0.22, 0.61, 0.36, 1] }}>
            <circle cx={node.x} cy={node.y} r="22" fill={node.color} opacity="0.1" stroke={node.color} strokeWidth="1.5" />
            <circle cx={node.x} cy={node.y} r="14" fill={node.color} opacity="0.2" />
            <text x={node.x} y={node.y} textAnchor="middle" fill={node.color} fontSize="7" fontFamily="Inter, sans-serif" fontWeight="600" dominantBaseline="middle">{node.label.split(" ")[0]}</text>
            <text x={node.x} y={node.y + 30} textAnchor="middle" fill="#6B6B6B" fontSize="7" fontFamily="Inter, sans-serif">{node.label}</text>
          </motion.g>
        ))}
        <motion.line x1="82" y1="55" x2="158" y2="80" stroke="#2563EB" strokeWidth="1" strokeDasharray="3 2" opacity="0.3"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }} />
        <motion.line x1="180" y1="102" x2="142" y2="138" stroke="#2F6F5E" strokeWidth="1" strokeDasharray="3 2" opacity="0.3"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }} />
        <motion.line x1="228" y1="55" x2="200" y2="75" stroke="#E5484D" strokeWidth="1" strokeDasharray="3 2" opacity="0.3"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.35 }} />
        <motion.g initial={{ opacity: 0, scale: 0.7 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.6, ease: [0.22, 0.61, 0.36, 1] }} style={{ transformOrigin: "180px 210px" }}>
          <rect x="100" y="195" width="160" height="36" rx="8" fill="#2F6F5E" opacity="0.08" stroke="#2F6F5E" strokeWidth="1.5" />
          <text x="180" y="209" textAnchor="middle" fill="#2F6F5E" fontSize="9" fontFamily="Inter, sans-serif" fontWeight="600" dominantBaseline="middle">COMMUNITY VERIFIED</text>
          <text x="180" y="222" textAnchor="middle" fill="#2F6F5E" fontSize="7" fontFamily="Inter, sans-serif" opacity="0.7" dominantBaseline="middle">5 confirmations · Trust score 87%</text>
        </motion.g>
      </svg>
    </motion.div>
  );
}

export function TransparencyIllustration() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <svg viewBox="0 0 360 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm">
        <rect x="30" y="20" width="300" height="240" rx="8" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1" />
        <rect x="30" y="20" width="300" height="10" rx="8" fill="#EDECEB" />
        <rect x="30" y="26" width="300" height="4" fill="#EDECEB" />
        <text x="45" y="47" fill="#1A1A1A" fontSize="11" fontFamily="'Playfair Display', serif" fontWeight="600" opacity="0.8">Greenfield Labs</text>
        <rect x="170" y="38" width="70" height="16" rx="8" fill="#2F6F5E" opacity="0.1" stroke="#2F6F5E" strokeWidth="1" />
        <text x="205" y="48" textAnchor="middle" fill="#2F6F5E" fontSize="7" fontFamily="Inter, sans-serif" fontWeight="600" dominantBaseline="middle">Verified (88%)</text>
        <text x="45" y="65" fill="#6B6B6B" fontSize="7.5" fontFamily="Inter, sans-serif">Biotech &amp; Design · New York, NY</text>
        <line x1="30" y1="76" x2="330" y2="76" stroke="#1A1A1A" strokeWidth="0.5" strokeDasharray="4 3" opacity="0.1" />
        {[
          { label: "Reports", value: "23", x: 60 },
          { label: "Ghost Rate", value: "8%", x: 155 },
          { label: "Trust", value: "88%", x: 250 },
        ].map((stat) => (
          <g key={stat.label}>
            <text x={stat.x} y="100" textAnchor="middle" fill="#1A1A1A" fontSize="14" fontFamily="'Playfair Display', serif" fontWeight="600">{stat.value}</text>
            <text x={stat.x} y="113" textAnchor="middle" fill="#6B6B6B" fontSize="7" fontFamily="Inter, sans-serif">{stat.label}</text>
          </g>
        ))}
        <text x="45" y="138" fill="#6B6B6B" fontSize="7" fontFamily="Inter, sans-serif" fontWeight="500" letterSpacing="0.05em">TRUST SCORE</text>
        <rect x="45" y="146" width="270" height="6" rx="3" fill="#E3E2E0" />
        <motion.rect x="45" y="146" width="238" height="6" rx="3" fill="#2F6F5E"
          initial={{ width: 0 }} whileInView={{ width: 238 }} viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }} />
        {[
          { text: "✓ Acceptable ghost job rate", color: "#2F6F5E" },
          { text: "✓ Transparent salary ranges", color: "#2F6F5E" },
          { text: "↓ Ghost rate declining month-over-month", color: "#2563EB" },
        ].map((item, i) => (
          <motion.text key={i} x="45" y={175 + i * 17} fill={item.color} fontSize="8" fontFamily="Inter, sans-serif"
            initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}>
            {item.text}
          </motion.text>
        ))}
      </svg>
    </motion.div>
  );
}
