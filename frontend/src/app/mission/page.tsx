'use client';
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { MarkerHighlight } from "@/components/ui/MarkerHighlight";
import { TactileButton } from "@/components/ui/TactileButton";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Scale, TrendingDown, ArrowRight } from "lucide-react";

const milestones = [
  { year: "2024", label: "Platform Founded", detail: "Built by a small team of developers who experienced ghost job listings firsthand." },
  { year: "Early 2025", label: "10,000 Reports", detail: "Community reaches its first major milestone. 800+ companies on file." },
  { year: "Mid 2025", label: "Company Response Program", detail: "Companies can officially respond to reports and provide context." },
  { year: "2026", label: "12,847 Reports & Growing", detail: "WorkWyse becomes the largest public archive of hiring transparency data." },
];

const goals = [
  { icon: Eye, title: "Full Hiring Transparency", body: "Every job listing that stays open longer than 90 days without a hire should have a public reason. We're building toward that standard." },
  { icon: Scale, title: "Industry Accountability", body: "We're compiling data that regulators, journalists, and researchers can use to hold companies to higher hiring standards." },
  { icon: TrendingDown, title: "Zero Wasted Applications", body: "One day, every job seeker will be able to verify a listing is real before they invest a single hour. That's the goal." },
];

export default function MissionPage() {
  return (
    <>
      {/* Header */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20" style={{ backgroundColor: "rgba(237,236,235,0.4)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>Our Mission</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, lineHeight: 1.2 }}>
              End the Era of{" "}
              <MarkerHighlight delay={0.3}>Ghost Listings</MarkerHighlight>
            </h1>
            <p className="mt-6 max-w-2xl" style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>
              WorkWyse exists to make job searching honest. We're building the world's most comprehensive, community-verified archive of hiring practices — so no job seeker ever wastes time on a fake listing again.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <div className="bg-card rounded-2xl border border-border p-10 md:p-14 relative overflow-hidden shadow-sm">
              <div className="absolute top-6 right-8 pointer-events-none select-none" style={{ fontFamily: "'Playfair Display', serif", fontSize: "5rem", fontWeight: 700, opacity: 0.03, transform: "rotate(-8deg)" }}>MISSION</div>
              <p className="text-accent mb-4" style={{ fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>Our Statement</p>
              <blockquote style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)", fontWeight: 600, lineHeight: 1.5, borderLeft: "3px solid var(--accent)", paddingLeft: "1.5rem" }}>
                "To create a world where every job seeker can trust the listings they apply to, and every company is held accountable for the hiring experience they create."
              </blockquote>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Goals */}
      <section className="py-20 md:py-24" style={{ backgroundColor: "rgba(237,236,235,0.4)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal className="mb-12">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>Long-Term Goals</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {goals.map((goal, i) => {
              const Icon = goal.icon;
              return (
                <ScrollReveal key={goal.title} delay={i * 0.1}>
                  <div className="bg-card rounded-xl border border-border p-6 h-full">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(37,99,235,0.08)" }}>
                      <Icon size={22} style={{ color: "var(--accent)" }} />
                    </div>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.6rem" }}>{goal.title}</h3>
                    <p style={{ fontSize: "0.875rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>{goal.body}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal className="mb-12">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>Our Journey</h2>
          </ScrollReveal>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px" style={{ backgroundColor: "var(--border)" }} />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <motion.div key={i} className="flex gap-6 pl-14 relative"
                  initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}>
                  <div className="absolute left-3.5 top-1.5 w-5 h-5 rounded-full border-2 border-accent bg-card" />
                  <div>
                    <p className="text-accent" style={{ fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.06em" }}>{m.year}</p>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 600, margin: "0.2rem 0" }}>{m.label}</h3>
                    <p style={{ fontSize: "0.875rem", lineHeight: 1.7, color: "var(--muted-foreground)" }}>{m.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 md:pb-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <ScrollReveal>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>Join the Mission</h2>
            <p className="mt-3 mb-7 max-w-md mx-auto" style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>
              Every report you file makes the job market more honest for everyone who comes after you.
            </p>
            <Link href="/submit-report">
              <TactileButton variant="primary" className="px-8 py-3">File a Report <ArrowRight size={16} /></TactileButton>
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
