import { motion } from "motion/react";

export function ReportIllustration() {
  return (
    <svg viewBox="0 0 300 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs">
      {/* Clipboard */}
      <rect x="60" y="30" width="180" height="210" rx="8" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1.5" />
      <rect x="110" y="18" width="80" height="24" rx="12" fill="#EDECEB" stroke="#1A1A1A" strokeWidth="1.2" />
      <circle cx="150" cy="30" r="4" fill="#1A1A1A" opacity="0.3" />

      {/* Checklist item 1 */}
      <rect x="85" y="65" width="14" height="14" rx="3" stroke="#2563EB" strokeWidth="1.5" fill="none" />
      <motion.path
        d="M 88 72 L 92 76 L 99 67"
        stroke="#2563EB" strokeWidth="1.5" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
      />
      <motion.rect
        x="110" y="68" width="100" height="6" rx="2" fill="#1A1A1A" opacity="0.12"
        initial={{ width: 0 }}
        whileInView={{ width: 100 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
      />

      {/* Checklist item 2 */}
      <rect x="85" y="95" width="14" height="14" rx="3" stroke="#2563EB" strokeWidth="1.5" fill="none" />
      <motion.path
        d="M 88 102 L 92 106 L 99 97"
        stroke="#2563EB" strokeWidth="1.5" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.45, ease: "easeOut" }}
      />
      <motion.rect
        x="110" y="98" width="80" height="6" rx="2" fill="#1A1A1A" opacity="0.12"
        initial={{ width: 0 }}
        whileInView={{ width: 80 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.55, ease: "easeOut" }}
      />

      {/* Unchecked items */}
      <rect x="85" y="125" width="14" height="14" rx="3" stroke="#1A1A1A" strokeWidth="1.5" fill="none" opacity="0.2" />
      <rect x="110" y="128" width="110" height="6" rx="2" fill="#1A1A1A" opacity="0.08" />

      <rect x="85" y="155" width="14" height="14" rx="3" stroke="#1A1A1A" strokeWidth="1.5" fill="none" opacity="0.2" />
      <rect x="110" y="158" width="90" height="6" rx="2" fill="#1A1A1A" opacity="0.08" />

      {/* Pen */}
      <g transform="translate(200, 175) rotate(-30)">
        <rect x="0" y="0" width="6" height="50" rx="2" fill="#2563EB" opacity="0.7" />
        <polygon points="0,50 6,50 3,60" fill="#1A1A1A" opacity="0.5" />
      </g>
    </svg>
  );
}

export function VerificationIllustration() {
  return (
    <svg viewBox="0 0 300 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs">
      {/* Rings */}
      <circle cx="150" cy="130" r="90" fill="none" stroke="#1A1A1A" strokeWidth="1" strokeDasharray="6 4" opacity="0.12" />
      <circle cx="150" cy="130" r="60" fill="none" stroke="#2F6F5E" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.25" />

      {/* Central badge */}
      <motion.g
        initial={{ scale: 0.8, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
        style={{ transformOrigin: "150px 130px" }}
      >
        <circle cx="150" cy="130" r="30" fill="#2F6F5E" opacity="0.08" />
        <circle cx="150" cy="130" r="30" fill="none" stroke="#2F6F5E" strokeWidth="2" />
        <path d="M 138 130 L 146 138 L 162 122" stroke="#2F6F5E" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>

      {/* User dots */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 150 + Math.cos(rad) * 75;
        const y = 130 + Math.sin(rad) * 75;
        return (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.06, ease: "easeOut" }}
          >
            <circle cx={x} cy={y} r="8" fill={i % 3 === 0 ? "#2563EB" : i % 3 === 1 ? "#2F6F5E" : "#E3E2E0"} opacity="0.5" />
            <circle cx={x} cy={y} r="3" fill="#FFFFFF" />
          </motion.g>
        );
      })}

      {/* Connection lines */}
      {[0, 90, 180, 270].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 150 + Math.cos(rad) * 75;
        const y = 130 + Math.sin(rad) * 75;
        return (
          <motion.line
            key={i}
            x1="150" y1="130" x2={x} y2={y}
            stroke="#2F6F5E" strokeWidth="0.8" opacity="0.15"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.08, ease: "easeOut" }}
          />
        );
      })}
    </svg>
  );
}

export function TransparencyIllustration() {
  return (
    <svg viewBox="0 0 300 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs">
      {/* File cabinet */}
      <rect x="70" y="40" width="160" height="200" rx="6" fill="#EDECEB" stroke="#1A1A1A" strokeWidth="1.5" />

      {/* Drawer 1 */}
      <rect x="85" y="55" width="130" height="50" rx="4" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1" />
      <circle cx="150" cy="80" r="4" fill="none" stroke="#1A1A1A" strokeWidth="1.2" />
      <rect x="95" y="62" width="40" height="5" rx="2" fill="#2F6F5E" opacity="0.25" />

      {/* Drawer 2 */}
      <motion.g
        initial={{ x: 0 }}
        whileInView={{ x: -5 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      >
        <rect x="75" y="115" width="155" height="50" rx="4" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1" />
        <circle cx="152" cy="140" r="4" fill="none" stroke="#1A1A1A" strokeWidth="1.2" />
        <rect x="90" y="122" width="50" height="5" rx="2" fill="#E5484D" opacity="0.25" />
      </motion.g>

      {/* Files */}
      <motion.rect
        x="90" y="105" width="30" height="15" rx="2" fill="#EEF4FF" stroke="#93B8E8" strokeWidth="0.8"
        initial={{ y: 112, opacity: 0 }}
        whileInView={{ y: 105, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.5, ease: "easeOut" }}
      />
      <motion.rect
        x="125" y="108" width="25" height="12" rx="2" fill="#DBEAFE" stroke="#93B8E8" strokeWidth="0.8"
        initial={{ y: 114, opacity: 0 }}
        whileInView={{ y: 108, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.6, ease: "easeOut" }}
      />
      <motion.rect
        x="155" y="106" width="28" height="14" rx="2" fill="#FEE2E2" stroke="#D4A0A0" strokeWidth="0.8"
        initial={{ y: 113, opacity: 0 }}
        whileInView={{ y: 106, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.7, ease: "easeOut" }}
      />

      {/* Drawer 3 */}
      <rect x="85" y="175" width="130" height="50" rx="4" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1" />
      <circle cx="150" cy="200" r="4" fill="none" stroke="#1A1A1A" strokeWidth="1.2" />
      <rect x="95" y="182" width="35" height="5" rx="2" fill="#1A1A1A" opacity="0.1" />

      {/* Magnifying glass */}
      <g transform="translate(220, 90)">
        <circle cx="0" cy="0" r="22" fill="none" stroke="#1A1A1A" strokeWidth="2" />
        <circle cx="0" cy="0" r="18" fill="#FFFFFF" opacity="0.5" />
        <line x1="16" y1="16" x2="32" y2="32" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}
