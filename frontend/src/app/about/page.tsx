'use client';
import { motion } from "framer-motion";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { MarkerHighlight } from "@/components/ui/MarkerHighlight";
import { TactileButton } from "@/components/ui/TactileButton";
import { ArrowRight, Search, Users, ShieldCheck, FileText } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      {/* Header */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20" style={{ backgroundColor: "rgba(237,236,235,0.4)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>About WorkWyse</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, lineHeight: 1.2 }}>
              We Believe Hiring Should Be{" "}
              <MarkerHighlight delay={0.3}>Honest</MarkerHighlight>
            </h1>
            <p className="mt-6 max-w-2xl" style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>
              WorkWyse was built by job seekers, for job seekers. We got tired of investing hours into applications — writing cover letters, solving coding challenges, sitting through interviews — only to be ghosted. So we built a public archive to change that.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
            <ScrollReveal direction="left">
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>The Problem</h2>
              <p className="mt-4" style={{ fontSize: "0.95rem", lineHeight: 1.9, color: "var(--muted-foreground)" }}>
                Ghost job listings are a growing problem. Companies post roles they have no intention of filling — to collect resumes, appear to be growing, or fulfill compliance requirements. The result? Job seekers spend thousands of hours on applications that were never real to begin with.
              </p>
              <p className="mt-4" style={{ fontSize: "0.95rem", lineHeight: 1.9, color: "var(--muted-foreground)" }}>
                There was no central place to warn others. Until now.
              </p>
            </ScrollReveal>
            <ScrollReveal direction="right" delay={0.1}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>Our Solution</h2>
              <p className="mt-4" style={{ fontSize: "0.95rem", lineHeight: 1.9, color: "var(--muted-foreground)" }}>
                WorkWyse is a community-powered archive. Real people file real reports. The community verifies them. Companies accumulate a public record — one that hiring managers can't delete.
              </p>
              <p className="mt-4" style={{ fontSize: "0.95rem", lineHeight: 1.9, color: "var(--muted-foreground)" }}>
                We also celebrate companies that do it right. Transparent hiring, honest salary ranges, timely responses — those get recognized too.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 md:py-24" style={{ backgroundColor: "rgba(237,236,235,0.4)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal className="text-center mb-12">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>By the Numbers</h2>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "12,847", label: "Reports Filed", icon: FileText },
              { value: "2,400+", label: "Companies on File", icon: Search },
              { value: "38,000+", label: "Community Members", icon: Users },
              { value: "89%", label: "Accuracy Rate", icon: ShieldCheck },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <ScrollReveal key={stat.label} delay={i * 0.08}>
                  <div className="bg-card rounded-xl border border-border p-6 text-center shadow-sm">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "rgba(37,99,235,0.08)" }}>
                      <Icon size={20} style={{ color: "var(--accent)" }} />
                    </div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 700 }}>{stat.value}</p>
                    <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>{stat.label}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal className="text-center mb-12">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>Our Values</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Radical Transparency", body: "Every data point on WorkWyse is visible to the public. No paywalls. No hidden reports. Hiring accountability needs to be accessible to everyone." },
              { title: "Community First", body: "Reports gain credibility through community verification. We trust the collective experience of thousands over the PR statements of corporations." },
              { title: "Truth, Not Grievance", body: "We don't allow anonymous hate. Reports must be specific, factual, and verifiable. We celebrate good hiring just as loudly as we flag bad practices." },
            ].map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 0.1}>
                <div className="bg-card rounded-xl border border-border p-6 h-full">
                  <div className="w-1.5 h-8 rounded-full mb-4" style={{ backgroundColor: "var(--accent)" }} />
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>{v.title}</h3>
                  <p style={{ fontSize: "0.875rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>{v.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 md:pb-32">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <div className="bg-card rounded-2xl border border-border p-10 md:p-14 text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-4 left-6 pointer-events-none select-none" style={{ fontFamily: "'Playfair Display', serif", fontSize: "3.5rem", fontWeight: 700, opacity: 0.03, transform: "rotate(-10deg)" }}>HONEST</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>Ready to Make Hiring More Honest?</h2>
              <p className="mt-3 max-w-md mx-auto" style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>
                File your first report or browse what the community has already uncovered.
              </p>
              <div className="mt-7 flex flex-wrap gap-4 justify-center">
                <Link href="/submit-report">
                  <TactileButton variant="primary" className="px-7 py-3">Submit a Report</TactileButton>
                </Link>
                <Link href="/reports">
                  <TactileButton variant="secondary" className="px-5 py-3">Browse Reports <ArrowRight size={16} /></TactileButton>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
