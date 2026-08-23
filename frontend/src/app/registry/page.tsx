"use client";
import { Suspense, useEffect, useState, useCallback, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import { Company, Job } from "../../types/user";
import { quickRecordLabel, recordCode, timeAgo, initials } from "../../lib/record";
import { Mono, Glyph } from "../../components/ui/primitives";

type Signal = "all" | "dead" | "repost" | "accounts" | "thin" | "fake";

interface RegistryItem {
  job: Job;
  repostCount: number;
  contributorsCount: number;
}

const SIGNALS: Array<{ key: Signal; label: string; note: string }> = [
  { key: "all", label: "EVERYTHING", note: "All tracked listings, most recently active first." },
  { key: "dead", label: "■ URL IS DEAD", note: "Listings whose application URL failed the last check." },
  { key: "repost", label: "■ REPOSTED 2×+", note: "Same title and company posted more than once." },
  { key: "accounts", label: "● HAS AN ACCOUNT", note: "Listings with at least one first-hand account filed." },
  { key: "thin", label: "○ THIN RECORD", note: "Built by fewer than three contributors. Thin by our own measure." },
  { key: "fake", label: "▲ FLAGGED LIKELY FAKE", note: "Flagged by the person who filed the record." },
];

export default function RegistryPage() {
  return (
    <Suspense fallback={null}>
      <RegistryContent />
    </Suspense>
  );
}

function RegistryContent() {
  const router = useRouter();
  const params = useSearchParams();
  const signal = (params.get("signal") as Signal) || "all";
  const initialSearch = params.get("search") || "";

  const [search, setSearch] = useState(initialSearch);
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<Signal, number>>({ all: 0, dead: 0, repost: 0, accounts: 0, thin: 0, fake: 0 });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [filtered, all] = await Promise.all([
        api.jobs.registry({ limit: 50, signal: signal === "all" ? undefined : signal, search: initialSearch || undefined }),
        api.jobs.registry({ limit: 100 }),
      ]);
      const filteredRaw = filtered as unknown as { data: RegistryItem[]; pagination: { total: number } };
      const allRaw = all as unknown as { data: RegistryItem[]; pagination: { total: number } };
      setItems(filteredRaw.data);
      setTotal(filteredRaw.pagination.total);
      setCounts({
        all: allRaw.pagination.total,
        dead: allRaw.data.filter((d) => d.job.urlCheck && !d.job.urlCheck.ok).length,
        repost: allRaw.data.filter((d) => d.repostCount >= 1).length,
        accounts: allRaw.data.filter((d) => d.job.reviews.length > 0).length,
        thin: allRaw.data.filter((d) => d.contributorsCount > 0 && d.contributorsCount < 3).length,
        fake: allRaw.data.filter((d) => d.job.isFake).length,
      });
    } catch {
      /* leave empty */
    } finally {
      setLoading(false);
    }
  }, [signal, initialSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.companies.list({ limit: 3 }).then((r) => setCompanies(r.data)).catch(() => {});
  }, []);

  function setSignal(next: Signal) {
    const qs = new URLSearchParams(params.toString());
    if (next === "all") qs.delete("signal");
    else qs.set("signal", next);
    router.push(`/registry?${qs.toString()}`);
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams(params.toString());
    if (search.trim()) qs.set("search", search.trim());
    else qs.delete("search");
    router.push(`/registry?${qs.toString()}`);
  }

  const activeMeta = SIGNALS.find((s) => s.key === signal)!;

  return (
    <div>
      <div className="px-4 md:px-8 pt-8 pb-6 border-b border-border-strong">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-12 items-end">
          <div>
            <Mono>THE REGISTRY</Mono>
            <h1 className="mt-3.5 text-[28px] md:text-[38px] leading-[1.06] tracking-[-0.035em] font-bold max-w-[26ch]">
              Every listing we track, and how much is known about it
            </h1>
            <form onSubmit={submitSearch} className="mt-5 flex items-center gap-3 h-12 px-4 bg-card border border-border-strong">
              <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-faint shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Job title, company, or a job URL"
                className="flex-1 min-w-0 text-[15.5px] placeholder:text-faint outline-none bg-transparent"
              />
              <span className="hidden sm:inline font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground border-l border-border-soft pl-3.5">
                SEARCHING {counts.all.toLocaleString()} LISTINGS
              </span>
            </form>
          </div>
          <div className="border border-border-mid bg-card">
            <div className="px-3.5 py-2.5 border-b border-border-soft">
              <Mono>HOW COMPLETE ARE THESE RECORDS</Mono>
            </div>
            <CompletenessRow tone="answered" label="Has an account" value={counts.accounts} />
            <CompletenessRow tone="partly" label="Reposted 2×+" value={counts.repost} />
            <CompletenessRow tone="open" label="Thin record" value={counts.thin} last />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr]">
        {/* filters */}
        <div className="lg:border-r border-border-strong">
          <div className="lg:sticky lg:top-[95px] px-4 md:px-5 py-5">
            <Mono>SIGNALS</Mono>
            <div className="mt-3.5 flex flex-col gap-1.5">
              {SIGNALS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSignal(s.key)}
                  className={`font-mono text-[10.5px] tracking-[0.06em] px-2.5 py-2 border flex justify-between text-left ${
                    signal === s.key ? "border-ink bg-ink text-background" : "border-border-mid text-ink-soft hover:border-ink"
                  }`}
                >
                  <span>{s.label}</span>
                  <span>{counts[s.key]}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 p-3.5 bg-panel">
              <p className="text-[12px] leading-[1.6] text-muted">
                Filters describe listings, not employers. "URL is dead" is a fact about a page, not an accusation.
              </p>
            </div>
          </div>
        </div>

        {/* results */}
        <div>
          <div className="flex items-center gap-3.5 px-4 md:px-8 py-3.5 border-b border-border bg-panel lg:sticky lg:top-[95px]">
            <span className="font-mono text-[11px] tracking-[0.08em]">{total.toLocaleString()} LISTINGS</span>
            <span className="text-[12.5px] text-muted hidden sm:inline">{activeMeta.note}</span>
          </div>

          {loading ? (
            <div className="px-8 py-10 text-muted text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-8 py-10 text-muted text-sm">Nothing matches this view yet.</div>
          ) : (
            items.map(({ job, repostCount, contributorsCount }) => (
              <Link
                key={job._id}
                href={`/registry/${job._id}`}
                className="grid grid-cols-1 sm:grid-cols-[1fr_150px_130px] gap-3 px-4 md:px-8 py-[18px] border-b border-border-soft hover:bg-panel transition-colors !no-underline items-start"
              >
                <div className="pr-0 sm:pr-6">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <RowDot job={job} />
                    <span className="text-[17px] font-semibold tracking-[-0.015em] text-ink">{job.title}</span>
                    <span className="font-mono text-[9.5px] text-faint">{recordCode(job._id)}</span>
                  </div>
                  <div className="mt-1 text-[13px] text-muted">
                    {job.company} · {job.location}
                  </div>
                  <p className="mt-2.5 font-serif text-[15.5px] leading-[1.55] text-ink-soft max-w-[56ch] line-clamp-2">
                    {job.description}
                  </p>
                </div>
                <div className="font-mono text-[11px] text-muted flex flex-col gap-1.5">
                  <span>{job.urlCheck ? (job.urlCheck.ok ? "■ URL OK" : "■ URL DEAD") : "○ URL NOT CHECKED"}</span>
                  <span>{repostCount > 0 ? `■ ${repostCount} REPOST${repostCount === 1 ? "" : "S"}` : "■ NO REPOSTS"}</span>
                </div>
                <div className="text-left sm:text-right font-mono text-[11px] text-muted-foreground">
                  {timeAgo(job.updatedAt)}
                  <div className="mt-1 text-faint">{contributorsCount || 1} CONTRIBUTOR{contributorsCount === 1 ? "" : "S"}</div>
                </div>
              </Link>
            ))
          )}

          {companies.length > 0 && (
            <div className="px-4 md:px-8 py-6 bg-panel border-b border-border">
              <Mono>COMPANIES MATCHING THIS VIEW</Mono>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {companies.map((c) => (
                  <Link
                    key={c._id}
                    href={`/companies/${c._id}`}
                    className="p-3.5 bg-card border border-border-mid hover:border-ink transition-colors !no-underline"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 bg-ink text-background font-mono text-[8.5px] flex items-center justify-center shrink-0">
                        {initials(c.name)}
                      </span>
                      <span className="text-[15px] font-semibold text-ink">{c.name}</span>
                    </div>
                    <div className="mt-2.5 text-[12.5px] leading-[1.6] text-muted">
                      {c.industry || "Industry not listed"}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 md:px-8 py-6 flex flex-wrap items-center gap-4">
            <span className="text-[13px] text-muted">
              Cannot find a listing?{" "}
              <Link href="/contribute" className="text-accent border-b border-border-mid">
                Open a record for it
              </Link>{" "}
              — pasting the URL is enough to start one.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowDot({ job }: { job: Job }) {
  const { tone } = quickRecordLabel(job);
  const color = tone === "answered" ? "bg-accent" : tone === "partly" ? "bg-amber" : "border-[1.5px] border-faint";
  return <span className={`w-2 h-2 rounded-full ${color}`} />;
}

function CompletenessRow({ tone, label, value, last }: { tone: "answered" | "partly" | "open"; label: string; value: number; last?: boolean }) {
  return (
    <div className={`flex justify-between items-center px-3.5 py-2.5 text-[13px] ${last ? "" : "border-b border-border-soft"}`}>
      <span className={`flex items-center gap-2 ${tone === "open" ? "text-muted" : ""}`}>
        <Glyph kind={tone === "answered" ? "account" : tone === "partly" ? "evidence" : "open"} />
        {label}
      </span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}
