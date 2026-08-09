import { useState, useMemo } from "react";
import { Link } from "react-router";
import { Search, X, Building2, TrendingUp, TrendingDown, FileText, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { mockCompanies } from "../data/mockData";
import { TrustScoreBadge } from "../components/TrustScoreBadge";
import { PageHeader } from "../components/PageHeader";
import { ScrollReveal } from "../components/ScrollReveal";

type SortOption = "lowest-trust" | "highest-trust" | "most-reports" | "highest-ghost-rate";

export function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("most-reports");

  const filteredCompanies = useMemo(() => {
    let results = [...mockCompanies];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "lowest-trust":
        results.sort((a, b) => a.trustScore - b.trustScore);
        break;
      case "highest-trust":
        results.sort((a, b) => b.trustScore - a.trustScore);
        break;
      case "highest-ghost-rate":
        results.sort((a, b) => b.ghostJobRate - a.ghostJobRate);
        break;
      default:
        results.sort((a, b) => b.totalReports - a.totalReports);
        break;
    }

    return results;
  }, [searchQuery, sortBy]);

  const inputClass =
    "w-full px-4 py-2.5 bg-card border border-border rounded-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all duration-200";

  return (
    <>
      <PageHeader
        label="Company Archive"
        title="Company Records"
        description="Browse open company files with hiring transparency metrics, ghost job rates, and community trust scores."
      />

      <section className="pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          {/* Search + Sort */}
          <div className="mb-8 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputClass} pl-11`}
                placeholder="Search companies..."
                style={{ fontSize: "0.875rem" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`${inputClass} sm:w-52`}
              style={{ fontSize: "0.85rem" }}
            >
              <option value="most-reports">Most Reports</option>
              <option value="lowest-trust">Lowest Trust</option>
              <option value="highest-trust">Highest Trust</option>
              <option value="highest-ghost-rate">Highest Ghost Rate</option>
            </select>
          </div>

          {/* Results count */}
          <p className="text-muted-foreground mb-6" style={{ fontSize: "0.85rem" }}>
            {filteredCompanies.length} compan{filteredCompanies.length !== 1 ? "ies" : "y"} on file
          </p>

          {/* Company cards */}
          {filteredCompanies.length > 0 ? (
            <div className="space-y-4">
              {filteredCompanies.map((company, i) => (
                <ScrollReveal key={company.slug} delay={i * 0.05}>
                  <Link to={`/companies/${company.slug}`}>
                    <motion.div
                      className="bg-card rounded-xl border border-border p-6 relative overflow-hidden cursor-pointer group"
                      whileHover={{
                        y: -2,
                        boxShadow: "0 8px 28px -8px rgba(26, 26, 26, 0.08)",
                      }}
                      style={{ boxShadow: "0 1px 3px 0 rgba(26, 26, 26, 0.04)" }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {/* Archive tab */}
                      <div
                        className="absolute top-0 left-6 bg-secondary px-3 py-1 rounded-b-md border-x border-b border-border"
                        style={{ fontSize: "0.6rem", fontWeight: 500 }}
                      >
                        COMPANY FILE
                      </div>

                      <div className="mt-2 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        {/* Company info */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Building2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 style={{ fontSize: "1.1rem" }}>{company.name}</h3>
                              <TrustScoreBadge score={company.trustScore} size="sm" />
                            </div>
                            <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                              {company.industry} &middot; {company.location}
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 md:gap-8">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <FileText size={12} className="text-muted-foreground" />
                            </div>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600 }}>
                              {company.totalReports}
                            </p>
                            <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Reports</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              {company.trend === "down" ? (
                                <TrendingDown size={12} className="text-emerald-600" />
                              ) : (
                                <TrendingUp size={12} className="text-red-500" />
                              )}
                            </div>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600 }}>
                              {company.ghostJobRate}%
                            </p>
                            <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Ghost Rate</p>
                          </div>
                          <div className="hidden sm:flex items-center text-accent group-hover:translate-x-1 transition-transform duration-200">
                            <ArrowRight size={18} />
                          </div>
                        </div>
                      </div>

                      {/* Trust bar */}
                      <div className="mt-4 pt-4 border-t border-dashed border-border">
                        <div className="flex justify-between mb-1.5" style={{ fontSize: "0.7rem" }}>
                          <span className="text-muted-foreground">Trust Score</span>
                          <span style={{ fontWeight: 500 }}>{company.trustScore}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor:
                                company.trustScore >= 70 ? "#2F6F5E" : company.trustScore >= 40 ? "#D4A84A" : "#E5484D",
                            }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${company.trustScore}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="inline-block p-6 rounded-xl bg-card border border-border">
                <p className="text-muted-foreground" style={{ fontSize: "1.1rem", fontFamily: "'Playfair Display', serif" }}>
                  No companies match your search
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
