'use client';
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { HeroIllustration } from "../components/home/HeroIllustration";
import { FeatureSection } from "../components/home/FeatureSection";
import { ReportIllustration, VerificationIllustration, TransparencyIllustration } from "../components/home/FeatureIllustrations";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { MarkerHighlight } from "../components/ui/MarkerHighlight";
import { TactileButton } from "../components/ui/TactileButton";
import { FileEdit, Users, FolderOpen, ArrowRight, MapPin, Clock, AlertTriangle, CheckCircle, Flag, Building2, FileText } from "lucide-react";
import { api } from "../lib/api";
import { Job, Company } from "../types/user";

const ease = [0.25, 0.1, 0.25, 1] as const;

function statusFromJob(job: Job): "ghost" | "suspicious" | "legitimate" {
  if (job.isFake) return "ghost";
  const ratio = job.upvotes / (job.upvotes + job.downvotes + 1);
  return ratio > 0.6 ? "legitimate" : "suspicious";
}

function trustScoreFromJob(job: Job): number {
  const total = job.upvotes + job.downvotes;
  if (total === 0) return 50;
  return Math.round((job.upvotes / total) * 100);
}

const statusConfig = {
  ghost: { label: "Ghost Job", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  legitimate: { label: "Legitimate", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
  suspicious: { label: "Suspicious", icon: Flag, color: "text-amber-600 bg-amber-50" },
};

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [jobRes, compRes] = await Promise.all([
        api.jobs.list({ page: 1, limit: 3 }),
        api.companies.list({ page: 1, limit: 3 }),
      ]);
      const jobRaw = jobRes as unknown as { data: Job[]; pagination?: { total: number } };
      const compRaw = compRes as unknown as { data: Company[]; pagination?: { total: number } };
      setJobs(jobRaw.data ?? []);
      setCompanies(compRaw.data ?? []);
      setTotalJobs(jobRaw.pagination?.total ?? 0);
      setTotalCompanies(compRaw.pagination?.total ?? 0);
      setStatsLoaded(true);
    } catch {
      // Silently fail on homepage — show zeros
      setStatsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="pt-28 pb-24 md:pt-36 md:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            <div className="flex-1 max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0, ease }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border mb-6"
                style={{ fontSize: "0.8rem", backgroundColor: "var(--card)" }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--accent)" }} />
                <span style={{ color: "var(--muted-foreground)" }}>
                  {statsLoaded ? `${totalJobs.toLocaleString()} reports filed and counting` : 'Loading...'}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease }}
                style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.2rem, 5vw, 3.5rem)", lineHeight: 1.15, fontWeight: 700 }}
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

              <motion.p className="mt-6 max-w-md" style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease }}>
                WorkWyse helps job seekers identify ghost listings, fake postings, and misleading hiring processes &mdash; before you waste your time.
              </motion.p>

              <motion.div className="mt-8 flex flex-wrap items-center gap-4"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.32, ease }}>
                <Link href="/submit-report">
                  <TactileButton variant="primary" className="px-7 py-3">Submit a Report</TactileButton>
                </Link>
                <Link href="/reports">
                  <TactileButton variant="secondary" className="px-5 py-3">
                    Browse Reports <ArrowRight size={16} />
                  </TactileButton>
                </Link>
              </motion.div>

              <motion.div className="mt-12 flex gap-8 md:gap-12"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}>
                {[
                  { value: statsLoaded ? totalJobs.toLocaleString() : "—", label: "Reports Filed" },
                  { value: statsLoaded ? totalCompanies.toLocaleString() : "—", label: "Companies" },
                  { value: "89%", label: "Accuracy Rate" },
                ].map((stat, i) => (
                  <motion.div key={stat.label}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.55 + i * 0.08 }}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600 }}>{stat.value}</p>
                    <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
            <div className="flex-1 flex justify-center">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal className="text-center mb-16 md:mb-24">
            <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>How It Works</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 600 }}>
              Building a Public Archive of <MarkerHighlight delay={0.2}>Hiring Truth</MarkerHighlight>
            </h2>
          </ScrollReveal>
          <div className="space-y-24 md:space-y-32">
            <FeatureSection icon={<div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(37,99,235,0.1)" }}><FileEdit size={24} style={{ color: "var(--accent)" }} /></div>}
              title="Report Your Experience" description="Submit detailed accounts of your job application journey. Document ghost listings, misleading postings, and hiring red flags." illustration={<ReportIllustration />} />
            <FeatureSection icon={<div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-100"><Users size={24} className="text-emerald-700" /></div>}
              title="Community Verification" description="Reports are reviewed and confirmed by other job seekers who had similar experiences." illustration={<VerificationIllustration />} reversed />
            <FeatureSection icon={<div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50"><FolderOpen size={24} className="text-amber-700" /></div>}
              title="Transparent Company Records" description="Every company has an open file with their hiring history and community trust score." illustration={<TransparencyIllustration />} />
          </div>
        </div>
      </section>

      {/* ─── Recent Reports (from API) ─── */}
      <section className="py-24 md:py-32" style={{ backgroundColor: "rgba(237,236,235,0.4)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal className="text-center mb-14">
            <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>Recent Reports</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 600 }}>From the Community Archive</h2>
            <p className="mt-3 max-w-md mx-auto" style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--muted-foreground)" }}>
              Real experiences from real job seekers, verified by the community.
            </p>
          </ScrollReveal>

          {jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job, i) => {
                const status = statusFromJob(job);
                const trust = trustScoreFromJob(job);
                const s = statusConfig[status];
                const StatusIcon = s.icon;
                const date = new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <Link key={job._id} href={`/reports/${job._id}`} style={{ display: "block", height: "100%" }}>
                    <motion.div
                      className="bg-card rounded-xl border border-border p-6 relative overflow-hidden cursor-pointer group h-full"
                      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.45, delay: i * 0.08, ease }}
                      whileHover={{ y: -4, boxShadow: "0 8px 28px -8px rgba(26,26,26,0.1)" }}
                      style={{ boxShadow: "0 1px 3px 0 rgba(26,26,26,0.04)" }}
                    >
                      <div className="absolute top-0 right-0 w-10 h-10 overflow-hidden">
                        <div className="absolute -top-5 -right-5 w-10 h-10 rotate-45 origin-bottom-left" style={{ backgroundColor: "var(--secondary)" }} />
                      </div>
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="min-w-0">
                          <h3 style={{ fontSize: "1.1rem", fontFamily: "'Playfair Display', serif" }}>{job.company}</h3>
                          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>{job.title}</p>
                        </div>
                        <div className="shrink-0 px-2 py-1 rounded-full text-xs font-medium" style={{
                          backgroundColor: trust >= 70 ? "#dcfce7" : trust >= 40 ? "#fef9c3" : "#fee2e2",
                          color: trust >= 70 ? "#166534" : trust >= 40 ? "#854d0e" : "#991b1b"
                        }}>{trust}%</div>
                      </div>
                      <div className="flex flex-wrap gap-3 mb-4" style={{ fontSize: "0.8rem" }}>
                        <span className="flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}><MapPin size={13} /> {job.location}</span>
                        <span className="flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}><Clock size={13} /> {date}</span>
                      </div>
                      <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--muted-foreground)", marginBottom: "1rem" }}>
                        &ldquo;{job.description.slice(0, 120)}{job.description.length > 120 ? '...' : ''}&rdquo;
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.color}`} style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                          <StatusIcon size={12} /> {s.label}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--accent)" }}>Read full report &rarr;</span>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>No reports yet. Be the first to submit one!</p>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link href="/reports" className="inline-flex items-center gap-2 transition-colors duration-200 hover:opacity-80" style={{ fontSize: "0.9rem", color: "var(--accent)" }}>
              View all reports <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Companies (from API) ─── */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal className="text-center mb-14">
            <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>Company Records</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 600 }}>Open Company Files</h2>
            <p className="mt-3 max-w-md mx-auto" style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--muted-foreground)" }}>
              Archived hiring records reviewed and scored by the community.
            </p>
          </ScrollReveal>

          {companies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {companies.map((company, i) => {
                const trustPct = Math.round((company.averageRating / 5) * 100);
                return (
                  <ScrollReveal key={company._id} delay={i * 0.08}>
                    <Link href={`/companies/${company._id}`}>
                      <div className="bg-card rounded-xl border border-border shadow-sm relative overflow-hidden cursor-pointer transition-shadow duration-200 hover:shadow-md p-6">
                        <div className="absolute top-0 left-6 px-3 py-1 rounded-b-md border-x border-b border-border" style={{ fontSize: "0.65rem", fontWeight: 500, backgroundColor: "var(--secondary)" }}>COMPANY FILE</div>
                        <div className="mt-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--muted)" }}>
                            <Building2 size={24} style={{ color: "var(--muted-foreground)" }} />
                          </div>
                          <div className="min-w-0">
                            <h3 style={{ fontSize: "1.1rem", fontFamily: "'Playfair Display', serif" }}>{company.name}</h3>
                            <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>{company.industry ?? 'Unknown'}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--background)" }}>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600 }}>{company.totalReports}</p>
                            <p style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>Reports</p>
                          </div>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--background)" }}>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600 }}>{company.averageRating.toFixed(1)}</p>
                            <p style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>Rating</p>
                          </div>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--background)" }}>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600 }}>{trustPct}%</p>
                            <p style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>Trust</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </ScrollReveal>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>No companies on file yet.</p>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link href="/companies" className="inline-flex items-center gap-2 transition-colors duration-200 hover:opacity-80" style={{ fontSize: "0.9rem", color: "var(--accent)" }}>
              View all companies <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-24 md:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <ScrollReveal>
            <div className="bg-card rounded-2xl border border-border p-12 md:p-16 shadow-sm relative overflow-hidden">
              <div className="absolute top-6 left-6 pointer-events-none select-none" style={{ fontFamily: "'Playfair Display', serif", fontSize: "4rem", fontWeight: 700, transform: "rotate(-12deg)", opacity: 0.04 }}>VERIFIED</div>
              <div className="absolute bottom-6 right-6 pointer-events-none select-none" style={{ fontFamily: "'Playfair Display', serif", fontSize: "3rem", fontWeight: 700, transform: "rotate(8deg)", opacity: 0.04 }}>FILED</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 600 }}>
                Every Report Makes Hiring More Honest
              </h2>
              <p className="mt-4 max-w-lg mx-auto" style={{ fontSize: "1rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>
                Join the community building the most transparent archive of hiring practices. Your experience matters.
              </p>
              <div className="mt-8">
                <Link href="/submit-report">
                  <TactileButton variant="primary" className="px-8 py-3">Submit Your First Report</TactileButton>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
