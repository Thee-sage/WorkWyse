'use client';
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { MarkerHighlight } from "@/components/ui/MarkerHighlight";
import { TactileButton } from "@/components/ui/TactileButton";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileEdit, Users, BarChart2, Search, CheckCircle, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: FileEdit,
    title: "Someone Files a Report",
    detail: "A job seeker submits a detailed account of their application experience. They describe the listing, timeline, responses (or non-responses), and any red flags they encountered. Reports can be filed anonymously.",
    note: "Takes about 5 minutes to complete.",
  },
  {
    number: "02",
    icon: Search,
    title: "The Report Enters the Archive",
    detail: "The report is immediately published to WorkWyse and linked to the company's public file. It's visible to anyone searching that company or role. The report receives a preliminary trust score based on the detail provided.",
    note: "No approval process — radical transparency.",
  },
  {
    number: "03",
    icon: Users,
    title: "The Community Verifies",
    detail: "Other job seekers who had similar experiences can confirm the report or add context. Each confirmation raises the report's trust score. Disputes can also be filed — these reduce the score. Everything is visible.",
    note: "Reports with 5+ confirmations are marked Verified.",
  },
  {
    number: "04",
    icon: BarChart2,
    title: "Companies Build a Public Record",
    detail: "Every report adds to a company's cumulative file. Ghost rate, trust score, response rate — all calculated transparently from community data. Companies with consistently poor records are flagged.",
    note: "Companies can respond to reports in the discussion section.",
  },
  {
    number: "05",
    icon: CheckCircle,
    title: "Job Seekers Make Better Decisions",
    detail: "Before applying to any role, job seekers can look up the company, check their ghost rate and trust score, and read first-hand accounts from the community. Apply confident. Or skip the ghost.",
    note: "Free forever, for everyone.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* Header */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20" style={{ backgroundColor: "rgba(237,236,235,0.4)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>How It Works</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, lineHeight: 1.2 }}>
              From Report to{" "}
              <MarkerHighlight delay={0.3}>Community Truth</MarkerHighlight>
            </h1>
            <p className="mt-6 max-w-2xl" style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>
              WorkWyse is powered entirely by the community. Here's exactly how a report goes from one person's experience to a verified, public record that helps thousands.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={i}
                  className="bg-card rounded-xl border border-border p-7 md:p-9 relative overflow-hidden"
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {/* Background step number */}
                  <div className="absolute top-4 right-6 pointer-events-none select-none"
                    style={{ fontFamily: "'Playfair Display', serif", fontSize: "4.5rem", fontWeight: 700, opacity: 0.04, lineHeight: 1 }}>
                    {step.number}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start gap-5">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(37,99,235,0.08)" }}>
                      <Icon size={26} style={{ color: "var(--accent)" }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)", letterSpacing: "0.06em" }}>STEP {step.number}</span>
                      </div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.6rem" }}>{step.title}</h3>
                      <p style={{ fontSize: "0.9rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>{step.detail}</p>
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: "var(--background)", fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                        <CheckCircle size={13} style={{ color: "var(--accent)" }} />
                        {step.note}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust Score Explainer */}
      <section className="py-20 md:py-24" style={{ backgroundColor: "rgba(237,236,235,0.4)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal className="mb-10">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>How Trust Scores Work</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { range: "70–100%", label: "Verified", color: "#2F6F5E", bg: "bg-emerald-50", border: "border-emerald-200", detail: "Strong community consensus. Multiple confirmed accounts. High confidence in report accuracy." },
              { range: "40–69%", label: "Uncertain", color: "#D4A84A", bg: "bg-amber-50", border: "border-amber-200", detail: "Mixed signals. Some confirmations, some disputes. Worth reading the full discussion before deciding." },
              { range: "0–39%", label: "Caution", color: "#E5484D", bg: "bg-red-50", border: "border-red-200", detail: "Low community confidence or high dispute rate. May be one-sided. Review context carefully." },
            ].map((tier) => (
              <ScrollReveal key={tier.range}>
                <div className={`rounded-xl border p-5 h-full ${tier.bg} ${tier.border}`}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 700, color: tier.color }}>{tier.range}</p>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem", color: tier.color }}>{tier.label}</p>
                  <p style={{ fontSize: "0.82rem", lineHeight: 1.7, color: "var(--muted-foreground)" }}>{tier.detail}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <ScrollReveal>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>Ready to Contribute?</h2>
            <p className="mt-3 mb-7 max-w-md mx-auto" style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>
              Your experience, no matter how small it seems, could save someone else days of wasted effort.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/submit-report">
                <TactileButton variant="primary" className="px-7 py-3">File a Report</TactileButton>
              </Link>
              <Link href="/reports">
                <TactileButton variant="secondary" className="px-5 py-3">Browse Reports <ArrowRight size={16} /></TactileButton>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
