'use client';
import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, X, Building2, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { api, ApiError } from "../../lib/api";
import { Company } from "../../types/user";
import { TrustScoreBadge } from "../../components/ui/TrustScoreBadge";
import { PageHeader } from "../../components/ui/PageHeader";
import { ScrollReveal } from "../../components/ui/ScrollReveal";
import { useToast } from "../../components/ui/Toast";

type SortOption = "most-reports" | "highest-rating" | "lowest-rating" | "a-z";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("most-reports");
  const toast = useToast();

  const fetchCompanies = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.companies.list({ page: p, limit: 20 });
      // The backend returns paginated data in data.data + data.pagination
      const raw = res as unknown as { data: Company[]; pagination: { totalPages: number } };
      setCompanies(raw.data ?? (res.data as unknown as Company[]));
      setTotalPages(raw.pagination?.totalPages ?? 1);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load companies';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCompanies(page);
  }, [fetchCompanies, page]);

  const filteredCompanies = useMemo(() => {
    let results = [...companies];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.industry ?? '').toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "highest-rating": results.sort((a, b) => b.averageRating - a.averageRating); break;
      case "lowest-rating": results.sort((a, b) => a.averageRating - b.averageRating); break;
      case "a-z": results.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: results.sort((a, b) => b.totalReports - a.totalReports);
    }
    return results;
  }, [companies, searchQuery, sortBy]);

  const inputClass = "w-full px-4 py-2.5 border border-border rounded-lg focus:border-accent focus:outline-none focus:ring-0 transition-all duration-200";

  return (
    <>
      <PageHeader
        label="Company Archive"
        title="Company Records"
        description="Browse companies tracked in the WorkWyse community. See report counts and community ratings."
      />
      <section className="pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`${inputClass} pl-11`}
                placeholder="Search companies..."
                style={{ fontSize: "0.875rem", backgroundColor: "var(--card)" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className={`${inputClass} sm:w-52`}
              style={{ fontSize: "0.85rem", backgroundColor: "var(--card)" }}
            >
              <option value="most-reports">Most Reports</option>
              <option value="highest-rating">Highest Rating</option>
              <option value="lowest-rating">Lowest Rating</option>
              <option value="a-z">A–Z</option>
            </select>
          </div>

          <p className="mb-6" style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
            {loading ? 'Loading...' : `${filteredCompanies.length} compan${filteredCompanies.length !== 1 ? "ies" : "y"} on file`}
          </p>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl border border-border animate-pulse" style={{ backgroundColor: "var(--card)" }} />
              ))}
            </div>
          ) : filteredCompanies.length > 0 ? (
            <div className="space-y-4">
              {filteredCompanies.map((company, i) => {
                // Derive a trust percentage from averageRating (0-5 → 0-100)
                const trustPct = Math.round((company.averageRating / 5) * 100);
                return (
                  <ScrollReveal key={company._id} delay={i * 0.04}>
                    <Link href={`/companies/${company._id}`}>
                      <motion.div
                        className="bg-card rounded-xl border border-border p-6 relative overflow-hidden cursor-pointer group"
                        whileHover={{ y: -2, boxShadow: "0 8px 28px -8px rgba(26,26,26,0.08)" }}
                        style={{ boxShadow: "0 1px 3px 0 rgba(26,26,26,0.04)" }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        <div className="absolute top-0 left-6 px-3 py-1 rounded-b-md border-x border-b border-border" style={{ fontSize: "0.6rem", fontWeight: 500, backgroundColor: "var(--secondary)" }}>
                          COMPANY FILE
                        </div>
                        <div className="mt-2 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--muted)" }}>
                              <Building2 size={24} style={{ color: "var(--muted-foreground)" }} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 style={{ fontSize: "1.1rem", fontFamily: "'Playfair Display', serif" }}>{company.name}</h3>
                                <TrustScoreBadge score={trustPct} size="sm" />
                              </div>
                              <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                                {company.industry ?? 'Unknown Industry'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 md:gap-8">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-0.5">
                                <FileText size={12} style={{ color: "var(--muted-foreground)" }} />
                              </div>
                              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600 }}>{company.totalReports}</p>
                              <p style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>Reports</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-0.5">
                                <TrendingUp size={12} style={{ color: "var(--muted-foreground)" }} />
                              </div>
                              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600 }}>{company.averageRating.toFixed(1)}</p>
                              <p style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>Avg Rating</p>
                            </div>
                            <div className="hidden sm:flex items-center group-hover:translate-x-1 transition-transform duration-200" style={{ color: "var(--accent)" }}>
                              <ArrowRight size={18} />
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-dashed border-border">
                          <div className="flex justify-between mb-1.5" style={{ fontSize: "0.7rem" }}>
                            <span style={{ color: "var(--muted-foreground)" }}>Rating</span>
                            <span style={{ fontWeight: 500 }}>{company.averageRating.toFixed(1)} / 5</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: trustPct >= 70 ? "#2F6F5E" : trustPct >= 40 ? "#D4A84A" : "#E5484D" }}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(company.averageRating / 5) * 100}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </ScrollReveal>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="inline-block p-6 rounded-xl border border-border" style={{ backgroundColor: "var(--card)" }}>
                <p style={{ fontSize: "1.1rem", fontFamily: "'Playfair Display', serif", color: "var(--muted-foreground)" }}>No companies found yet</p>
                <p className="mt-2" style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", opacity: 0.7 }}>Companies are added by admins. Check back soon.</p>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-40"
                style={{ backgroundColor: "var(--card)" }}
              >
                Previous
              </button>
              <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-40"
                style={{ backgroundColor: "var(--card)" }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
