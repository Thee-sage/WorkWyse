"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { api, ApiError } from "../../lib/api";
import { Company } from "../../types/user";
import { useToast } from "../../components/ui/Toast";
import { initials } from "../../lib/record";
import { Mono } from "../../components/ui/primitives";

type SortOption = "most-reports" | "highest-rating" | "a-z";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("a-z");
  const toast = useToast();

  const fetchCompanies = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.companies.list({ page: p, limit: 40 });
      const raw = res as unknown as { data: Company[]; pagination: { totalPages: number } };
      setCompanies(raw.data);
      setTotalPages(raw.pagination?.totalPages ?? 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCompanies(page); }, [fetchCompanies, page]);

  const filtered = useMemo(() => {
    let results = [...companies];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter((c) => c.name.toLowerCase().includes(q) || (c.industry ?? "").toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "highest-rating": results.sort((a, b) => b.averageRating - a.averageRating); break;
      case "a-z": results.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: results.sort((a, b) => b.totalReports - a.totalReports);
    }
    return results;
  }, [companies, searchQuery, sortBy]);

  return (
    <div>
      <div className="px-4 md:px-8 pt-9 pb-6 border-b border-border-strong">
        <Mono>EVERY EMPLOYER WE TRACK</Mono>
        <h1 className="mt-3 text-[30px] md:text-[38px] leading-[1.06] tracking-[-0.035em] font-bold max-w-[26ch]">
          Companies accumulate a record the same way listings do
        </h1>
        <p className="mt-3 font-serif text-[16px] leading-[1.6] text-muted max-w-[60ch]">
          A company record aggregates every listing beneath it, plus any account filed directly about working there.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company or industry"
            className="flex-1 h-11 px-3.5 border border-border-strong bg-card text-[14px] outline-none"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-11 px-3 border border-border-mid bg-card text-[13px] font-mono"
          >
            <option value="a-z">A–Z</option>
            <option value="most-reports">Most reports</option>
            <option value="highest-rating">Highest rated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="px-8 py-10 text-muted">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="px-8 py-10 text-muted">No companies match yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c._id}
              href={`/companies/${c._id}`}
              className="px-6 py-6 border-b border-r border-border-soft hover:bg-panel !no-underline text-inherit"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 bg-ink text-background font-mono text-[9px] flex items-center justify-center shrink-0">
                  {initials(c.name)}
                </span>
                <span className="text-[16px] font-semibold text-ink">{c.name}</span>
              </div>
              <div className="mt-2.5 text-[12.5px] leading-[1.6] text-muted">
                {c.industry || "Industry not listed"} · {c.totalReports} report{c.totalReports === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="px-8 py-6 flex items-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="font-mono text-[10px] tracking-[0.08em] border border-border-mid px-3 py-2 disabled:opacity-40">
            ← PREV
          </button>
          <span className="font-mono text-[11px] text-muted">PAGE {page} OF {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="font-mono text-[10px] tracking-[0.08em] border border-border-mid px-3 py-2 disabled:opacity-40">
            NEXT →
          </button>
        </div>
      )}
    </div>
  );
}
