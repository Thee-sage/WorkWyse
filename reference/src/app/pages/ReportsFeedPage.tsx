import { useState, useMemo } from "react";
import { Search, Filter, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ReportCard } from "../components/ReportCard";
import { PageHeader } from "../components/PageHeader";
import { mockReports, type ReportStatus } from "../data/mockData";

type SortOption = "newest" | "most-confirmed" | "lowest-trust";

export function ReportsFeedPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const filteredReports = useMemo(() => {
    let results = [...mockReports];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (r) =>
          r.company.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.excerpt.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      results = results.filter((r) => r.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case "most-confirmed":
        results.sort((a, b) => b.confirmations - a.confirmations);
        break;
      case "lowest-trust":
        results.sort((a, b) => a.trustScore - b.trustScore);
        break;
      default:
        // newest first — already in order
        break;
    }

    return results;
  }, [searchQuery, statusFilter, sortBy]);

  const statusOptions: { value: ReportStatus | "all"; label: string; count: number }[] = [
    { value: "all", label: "All Reports", count: mockReports.length },
    { value: "ghost", label: "Ghost Jobs", count: mockReports.filter((r) => r.status === "ghost").length },
    { value: "suspicious", label: "Suspicious", count: mockReports.filter((r) => r.status === "suspicious").length },
    { value: "legitimate", label: "Legitimate", count: mockReports.filter((r) => r.status === "legitimate").length },
  ];

  const inputClass =
    "w-full px-4 py-2.5 bg-card border border-border rounded-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all duration-200";

  return (
    <>
      <PageHeader
        label="Community Archive"
        title="Browse Reports"
        description="Search and filter community-submitted reports on job listings, hiring practices, and employer transparency."
      />

      <section className="pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          {/* Search + Filter Bar */}
          <div className="mb-8">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${inputClass} pl-11`}
                  placeholder="Search by company, role, or keyword..."
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
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                  showFilters
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card border-border text-foreground hover:border-accent/30"
                }`}
                style={{ fontSize: "0.875rem" }}
              >
                <Filter size={16} />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-5 bg-card rounded-xl border border-border">
                    <div className="flex flex-col sm:flex-row gap-5">
                      {/* Status Filter */}
                      <div className="flex-1">
                        <label
                          className="block mb-2 text-muted-foreground"
                          style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}
                        >
                          Report Status
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {statusOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setStatusFilter(opt.value)}
                              className={`px-3 py-1.5 rounded-full border transition-all duration-200 ${
                                statusFilter === opt.value
                                  ? "bg-accent text-accent-foreground border-accent"
                                  : "bg-background border-border text-muted-foreground hover:border-accent/30"
                              }`}
                              style={{ fontSize: "0.8rem" }}
                            >
                              {opt.label}
                              <span className="ml-1.5 opacity-60">({opt.count})</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sort */}
                      <div className="sm:w-48">
                        <label
                          className="block mb-2 text-muted-foreground"
                          style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}
                        >
                          Sort By
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          className={inputClass}
                          style={{ fontSize: "0.85rem" }}
                        >
                          <option value="newest">Newest First</option>
                          <option value="most-confirmed">Most Confirmed</option>
                          <option value="lowest-trust">Lowest Trust</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results count */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
              {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""} found
            </p>
            {(searchQuery || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="text-accent hover:text-accent/80 transition-colors duration-200"
                style={{ fontSize: "0.8rem" }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Results Grid */}
          {filteredReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map((report, i) => (
                <ReportCard key={report.id} {...report} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div
                className="inline-block p-6 rounded-xl bg-card border border-border"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                <p className="text-muted-foreground" style={{ fontSize: "1.1rem" }}>
                  No reports match your criteria
                </p>
                <p className="text-muted-foreground mt-2 opacity-60" style={{ fontSize: "0.85rem", fontFamily: "Inter, sans-serif" }}>
                  Try adjusting your search or filters
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
