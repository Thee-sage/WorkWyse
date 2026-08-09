'use client';
import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Filter, X, AlertTriangle, CheckCircle, Flag, MapPin, Clock, ArrowRight, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { PageHeader } from "../../components/ui/PageHeader";
import { api, ApiError } from "../../lib/api";
import { Job } from "../../types/user";
import { useToast } from "../../components/ui/Toast";

type SortOption = "newest" | "most-upvoted" | "most-reviewed";

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

export default function ReportsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ghost" | "legitimate" | "suspicious" | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const toast = useToast();

  const fetchJobs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.jobs.list({ page: p, limit: 20 });
      const raw = res as unknown as { data: Job[]; pagination: { totalPages: number } };
      setJobs(raw.data ?? (res.data as unknown as Job[]));
      setTotalPages(raw.pagination?.totalPages ?? 1);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load reports';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchJobs(page);
  }, [fetchJobs, page]);

  const filteredJobs = useMemo(() => {
    let results = [...jobs];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(j =>
        j.company.toLowerCase().includes(q) ||
        j.title.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      results = results.filter(j => statusFromJob(j) === statusFilter);
    }
    switch (sortBy) {
      case "most-upvoted": results.sort((a, b) => b.upvotes - a.upvotes); break;
      case "most-reviewed": results.sort((a, b) => b.reviews.length - a.reviews.length); break;
      default: results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return results;
  }, [jobs, searchQuery, statusFilter, sortBy]);

  const inputClass = "w-full px-4 py-2.5 border border-border rounded-lg focus:border-accent focus:outline-none focus:ring-0 transition-all duration-200";

  const statusOptions = [
    { value: "all" as const, label: "All Reports" },
    { value: "ghost" as const, label: "Ghost Jobs" },
    { value: "suspicious" as const, label: "Suspicious" },
    { value: "legitimate" as const, label: "Legitimate" },
  ];

  return (
    <>
      <PageHeader
        label="Community Archive"
        title="Browse Reports"
        description="Search and filter job listings reported by the community."
      />
      <section className="pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`${inputClass} pl-11`}
                  placeholder="Search by company, role, or keyword..."
                  style={{ fontSize: "0.875rem", backgroundColor: "var(--card)" }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200"
                style={{
                  fontSize: "0.875rem",
                  backgroundColor: showFilters ? "var(--accent)" : "var(--card)",
                  color: showFilters ? "white" : "var(--foreground)",
                  borderColor: showFilters ? "var(--accent)" : "var(--border)",
                }}
              >
                <Filter size={16} />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-5 rounded-xl border border-border" style={{ backgroundColor: "var(--card)" }}>
                    <div className="flex flex-col sm:flex-row gap-5">
                      <div className="flex-1">
                        <label className="block mb-2" style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                          Status
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {statusOptions.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setStatusFilter(opt.value)}
                              className="px-3 py-1.5 rounded-full border transition-all duration-200"
                              style={{
                                fontSize: "0.8rem",
                                backgroundColor: statusFilter === opt.value ? "var(--accent)" : "var(--background)",
                                color: statusFilter === opt.value ? "white" : "var(--muted-foreground)",
                                borderColor: statusFilter === opt.value ? "var(--accent)" : "var(--border)",
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="sm:w-48">
                        <label className="block mb-2" style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                          Sort By
                        </label>
                        <select
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value as SortOption)}
                          className={inputClass}
                          style={{ fontSize: "0.85rem", backgroundColor: "var(--background)" }}
                        >
                          <option value="newest">Newest First</option>
                          <option value="most-upvoted">Most Upvoted</option>
                          <option value="most-reviewed">Most Reviewed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
              {loading ? 'Loading...' : `${filteredJobs.length} report${filteredJobs.length !== 1 ? "s" : ""} found`}
            </p>
            {(searchQuery || statusFilter !== "all") && (
              <button onClick={() => { setSearchQuery(""); setStatusFilter("all"); }} style={{ fontSize: "0.8rem", color: "var(--accent)" }}>
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-56 rounded-xl border border-border animate-pulse" style={{ backgroundColor: "var(--card)" }} />
              ))}
            </div>
          ) : filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job, i) => {
                const status = statusFromJob(job);
                const trust = trustScoreFromJob(job);
                const s = statusConfig[status];
                const StatusIcon = s.icon;
                const date = new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <Link key={job._id} href={`/reports/${job._id}`} style={{ display: "block", height: "100%" }}>
                    <motion.div
                      className="bg-card rounded-xl border border-border p-6 relative overflow-hidden cursor-pointer group h-full"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.45, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                      whileHover={{ y: -4, boxShadow: "0 8px 28px -8px rgba(26,26,26,0.1)" }}
                      style={{ boxShadow: "0 1px 3px 0 rgba(26,26,26,0.04)" }}
                    >
                      {/* Corner fold */}
                      <div className="absolute top-0 right-0 w-10 h-10 overflow-hidden">
                        <div className="absolute -top-5 -right-5 w-10 h-10 rotate-45 origin-bottom-left" style={{ backgroundColor: "var(--secondary)" }} />
                      </div>
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="min-w-0">
                          <h3 style={{ fontSize: "1.05rem", fontFamily: "'Playfair Display', serif" }}>{job.company}</h3>
                          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>{job.title}</p>
                        </div>
                        <div className="shrink-0 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: trust >= 70 ? "#dcfce7" : trust >= 40 ? "#fef9c3" : "#fee2e2", color: trust >= 70 ? "#166534" : trust >= 40 ? "#854d0e" : "#991b1b" }}>
                          {trust}%
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 mb-4" style={{ fontSize: "0.8rem" }}>
                        <span className="flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                          <MapPin size={13} /> {job.location}
                        </span>
                        <span className="flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                          <Clock size={13} /> {date}
                        </span>
                        {job.hasEvidence && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600" style={{ fontSize: '0.7rem', fontWeight: 500 }}>
                            <Shield size={10} /> Evidence
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--muted-foreground)", marginBottom: "1rem" }}>
                        &ldquo;{job.description.slice(0, 120)}{job.description.length > 120 ? '...' : ''}&rdquo;
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.color}`} style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                          <StatusIcon size={12} /> {s.label}
                        </span>
                        <span className="flex items-center gap-1" style={{ fontSize: "0.8rem", color: "var(--accent)" }}>
                          View <ArrowRight size={12} />
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="inline-block p-6 rounded-xl border border-border" style={{ backgroundColor: "var(--card)" }}>
                <p style={{ fontSize: "1.1rem", fontFamily: "'Playfair Display', serif", color: "var(--muted-foreground)" }}>
                  {jobs.length === 0 ? "No job reports yet" : "No reports match your criteria"}
                </p>
                <p className="mt-2 opacity-60" style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                  {jobs.length === 0 ? "Be the first to submit a report." : "Try adjusting your search or filters"}
                </p>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-40" style={{ backgroundColor: "var(--card)" }}>
                Previous
              </button>
              <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-40" style={{ backgroundColor: "var(--card)" }}>
                Next
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
