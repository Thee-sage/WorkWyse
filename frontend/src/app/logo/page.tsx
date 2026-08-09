'use client';
import { Search } from "lucide-react";

export default function LogoPage() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-background" style={{ minHeight: '100vh', display: 'flex' }}>
      <style>{`nav, footer { display: none !important; } main { padding: 0 !important; margin: 0 !important; }`}</style>
      
      <div className="flex items-center gap-2.5" style={{ transform: 'scale(4)', transformOrigin: 'center' }}>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Search size={18} color="white" />
        </div>
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.25rem",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          WorkWyse
        </span>
      </div>

    </div>
  );
}
