'use client';
import { use, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Globe, FileText, ThumbsUp, ThumbsDown, MapPin, Clock, AlertTriangle, CheckCircle, Flag, ArrowRight, Star } from "lucide-react";
import { api, ApiError } from "../../../lib/api";
import { Company, Job } from "../../../types/user";
import { ScrollReveal } from "../../../components/ui/ScrollReveal";
import { TrustScoreBadge } from "../../../components/ui/TrustScoreBadge";
import { useToast } from "../../../components/ui/Toast";

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

export default function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const toast = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.companies.get(slug);
        setCompany(res.data);

        // Get jobs for this company
        const jobRes = await api.jobs.list({ page: 1, limit: 20, search: res.data.name });
        const jobRaw = jobRes as unknown as { data: Job[] };
        const allJobs = jobRaw.data ?? (jobRes.data as unknown as Job[]);
        // Filter by exact company name match
        setJobs(allJobs.filter(j => j.company.toLowerCase() === res.data.name.toLowerCase()));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          toast.error('Failed to load company');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug, toast]);

  if (loading) {
    return (
      <div className="pt-36 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-64 rounded-xl border border-border animate-pulse" style={{ backgroundColor: "var(--card)" }} />
        </div>
      </div>
    );
  }

  if (notFound || !company) {
    return (
      <div className="pt-36 pb-24 text-center">
        <div className="max-w-md mx-auto px-6">
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 600 }}>Company Not Found</h1>
          <p className="mt-3" style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>This company file does not exist in our archive.</p>
          <Link href="/companies" className="inline-flex items-center gap-2 mt-6" style={{ fontSize: "0.9rem", color: "var(--accent)" }}>
            <ArrowLeft size={16} /> Back to companies
          </Link>
        </div>
      </div>
    );
  }

  const trustPct = Math.round((company.averageRating / 5) * 100);
  const ghostCount = jobs.filter(j => j.isFake).length;
  const legitimateCount = jobs.filter(j => !j.isFake).length;
  const suspiciousCount = jobs.filter(j => {
    if (j.isFake) return false;
    const ratio = j.upvotes / (j.upvotes + j.downvotes + 1);
    return ratio <= 0.6;
  }).length;

  return (
    <>
      <div className="pt-28 md:pt-32">
        <div className="max-w-6xl mx-auto px-6">
          <Link href="/companies" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
            <ArrowLeft size={14} /> Back to companies
          </Link>
        </div>
      </div>

      {/* Company Header */}
      <section className="pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="bg-card rounded-xl border border-border p-8 md:p-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-8 px-4 py-1.5 rounded-b-md border-x border-b border-border" style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.05em", backgroundColor: "var(--secondary)" }}>
                COMPANY FILE
              </div>
              <div className="mt-4 flex flex-col md:flex-row items-start gap-6 md:gap-10">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--muted)" }}>
                  <Building2 size={32} style={{ color: "var(--muted-foreground)" }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>{company.name}</h1>
                    <TrustScoreBadge score={trustPct} size="md" />
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3" style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                    {company.industry && <span className="flex items-center gap-1.5"><Building2 size={14} /> {company.industry}</span>}
                    {company.website && (
                      <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:opacity-80">
                        <Globe size={14} /> {company.website}
                      </a>
                    )}
                  </div>
                  {company.description && (
                    <p className="mt-3" style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--muted-foreground)" }}>{company.description}</p>
                  )}
                </div>
              </div>

              <div className="my-6 border-t border-dashed border-border" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Reports", value: company.totalReports, icon: <FileText size={16} style={{ color: "var(--muted-foreground)" }} /> },
                  { label: "Avg Rating", value: `${company.averageRating.toFixed(1)}/5`, icon: <Star size={16} className="text-amber-500" /> },
                  { label: "Trust Score", value: `${trustPct}%`, icon: trustPct >= 70 ? <CheckCircle size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-amber-500" /> },
                  { label: "Job Listings", value: jobs.length, icon: <FileText size={16} style={{ color: "var(--accent)" }} /> },
                ].map(metric => (
                  <div key={metric.label} className="p-4 rounded-lg text-center" style={{ backgroundColor: "var(--background)" }}>
                    <div className="flex items-center justify-center mb-2">{metric.icon}</div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600 }}>{metric.value}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{metric.label}</p>
                  </div>
                ))}
              </div>

              {trustPct < 30 && (
                <div className="absolute bottom-6 right-8 pointer-events-none select-none" style={{ fontFamily: "'Playfair Display', serif", fontSize: "4rem", fontWeight: 700, transform: "rotate(-10deg)", opacity: 0.03 }}>FLAGGED</div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Report Breakdown */}
      {jobs.length > 0 && (
        <section className="pb-12">
          <div className="max-w-6xl mx-auto px-6">
            <ScrollReveal>
              <div className="bg-card rounded-xl border border-border p-6 md:p-8">
                <h3 className="mb-5" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600 }}>Report Breakdown</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Ghost Jobs", count: ghostCount, color: "bg-red-50 text-red-700 border-red-200" },
                    { label: "Suspicious", count: suspiciousCount, color: "bg-amber-50 text-amber-700 border-amber-200" },
                    { label: "Legitimate", count: legitimateCount, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                  ].map(cat => (
                    <div key={cat.label} className={`p-4 rounded-lg border text-center ${cat.color}`}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600 }}>{cat.count}</p>
                      <p style={{ fontSize: "0.8rem" }}>{cat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Recent Reports */}
      <section className="pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <h3 className="mb-6" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600 }}>Job Reports for {company.name}</h3>
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
                      transition={{ duration: 0.45, delay: i * 0.08 }}
                      whileHover={{ y: -4, boxShadow: "0 8px 28px -8px rgba(26,26,26,0.1)" }}
                      style={{ boxShadow: "0 1px 3px 0 rgba(26,26,26,0.04)" }}
                    >
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="min-w-0">
                          <h3 style={{ fontSize: "1.05rem", fontFamily: "'Playfair Display', serif" }}>{job.title}</h3>
                        </div>
                        <div className="shrink-0 px-2 py-1 rounded-full text-xs font-medium" style={{
                          backgroundColor: trust >= 70 ? "#dcfce7" : trust >= 40 ? "#fef9c3" : "#fee2e2",
                          color: trust >= 70 ? "#166534" : trust >= 40 ? "#854d0e" : "#991b1b"
                        }}>{trust}%</div>
                      </div>
                      <div className="flex flex-wrap gap-3 mb-4" style={{ fontSize: "0.8rem" }}>
                        <span className="flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}><MapPin size={13} /> {job.location}</span>
                        <span className="flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}><Clock size={13} /> {date}</span>
                        <span className="flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}><ThumbsUp size={13} /> {job.upvotes}</span>
                      </div>
                      <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--muted-foreground)", marginBottom: "1rem" }}>
                        &ldquo;{job.description.slice(0, 100)}{job.description.length > 100 ? '...' : ''}&rdquo;
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.color}`} style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                          <StatusIcon size={12} /> {s.label}
                        </span>
                        <span className="flex items-center gap-1" style={{ fontSize: "0.8rem", color: "var(--accent)" }}>View <ArrowRight size={12} /></span>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>No reports found for this company yet.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
