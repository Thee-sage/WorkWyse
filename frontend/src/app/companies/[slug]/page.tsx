"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "../../../lib/api";
import { useAuth } from "../../../components/AuthContext";
import { useToast } from "../../../components/ui/Toast";
import { Company, CompanyPatternMonth, CompanyReview, CompanyStats, Job } from "../../../types/user";
import { formatDateMono, initials, quickRecordLabel } from "../../../lib/record";
import { Mono, Panel, StatRow, Tab, PrimaryButton, SecondaryButton, stateInk } from "../../../components/ui/primitives";

type CompanyTab = "listings" | "reviews" | "patterns";

export default function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [patterns, setPatterns] = useState<CompanyPatternMonth[]>([]);
  const [tab, setTab] = useState<CompanyTab>("listings");
  const [notFound, setNotFound] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api.companies.get(slug).then((r) => setCompany(r.data)).catch(() => setNotFound(true));
    api.companies.stats(slug).then((r) => setStats(r.data)).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!company) return;
    if (tab === "listings") api.jobs.list({ limit: 50 }).then((r) => setJobs(r.data.filter((j) => j.company.toLowerCase() === company.name.toLowerCase())));
    if (tab === "reviews") api.companies.reviews(slug, { limit: 50 }).then((r) => setReviews(r.data));
    if (tab === "patterns") api.companies.patterns(slug).then((r) => setPatterns(r.data));
  }, [tab, company, slug]);

  async function submitReview() {
    if (!reviewText.trim()) return;
    setPosting(true);
    try {
      const res = await api.companies.addReview(slug, { comment: reviewText.trim() });
      setReviews((prev) => [res.data, ...prev]);
      setReviewText("");
      toast.success("Account published");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not publish your account");
    } finally {
      setPosting(false);
    }
  }

  if (notFound) return <div className="px-8 py-16 text-muted">This company could not be found.</div>;
  if (!company) return <div className="px-8 py-16 text-muted">Loading…</div>;

  return (
    <div>
      <div className="flex items-center gap-2 px-4 md:px-8 py-2.5 border-b border-border font-mono text-[10px] tracking-[0.06em] text-muted-foreground overflow-x-auto whitespace-nowrap">
        <Link href="/companies" className="text-accent">COMPANIES</Link>
        <span className="text-faintest">›</span>
        <span className="text-ink">{company.name.toUpperCase()}</span>
        <span className="ml-auto hidden sm:inline">COMPANY RECORD · TRACKED SINCE {formatDateMono(company.createdAt)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] border-b border-border-strong">
        <div className="px-4 md:px-8 py-9 md:py-10 lg:border-r border-border">
          <div className="flex items-center gap-3">
            <span className="w-[34px] h-[34px] bg-ink text-background font-mono text-[12px] flex items-center justify-center shrink-0">
              {initials(company.name)}
            </span>
            <h1 className="text-[30px] md:text-[40px] leading-none tracking-[-0.035em] font-bold">{company.name}</h1>
          </div>
          <div className="mt-3.5 flex items-center gap-2.5 text-[14.5px] text-ink-soft flex-wrap">
            {company.industry && <span>{company.industry}</span>}
            {company.website && (
              <>
                <span className="text-faintest">·</span>
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-accent">{company.website}</a>
              </>
            )}
            <span className="font-mono text-[10px] tracking-[0.08em] border border-border-mid text-muted-foreground px-1.5 py-0.5">
              NOT A VERIFIED PROFILE
            </span>
          </div>

          {company.description && (
            <p className="mt-6 font-serif text-[18px] md:text-[20px] leading-[1.5] max-w-[52ch] text-pretty">{company.description}</p>
          )}

          {stats && (
            <p className="mt-4 font-serif text-[15px] md:text-[16.5px] leading-[1.65] text-muted max-w-[58ch]">
              {stats.listingsTracked} listing{stats.listingsTracked === 1 ? "" : "s"} tracked, {stats.openReports} with open
              reports, {stats.confirmedHires} confirmed hire{stats.confirmedHires === 1 ? "" : "s"}. That pattern is worth
              knowing before you apply — it is not proof of bad faith either way.
            </p>
          )}

          <div className="mt-6 p-4 border border-dashed border-faint flex items-center gap-4 flex-wrap">
            <Mono>RIGHT OF REPLY</Mono>
            <span className="flex-1 text-[13.5px] text-ink-soft min-w-[200px]">
              {stats && stats.employerReplies > 0
                ? `${company.name} has replied to at least one report on record.`
                : `${company.name} has a standing invitation to respond to any report filed against their listings.`}
            </span>
            <Link href="/about?section=moderation" className="font-mono text-[10px] tracking-[0.08em] text-accent whitespace-nowrap">
              HOW REPLIES WORK →
            </Link>
          </div>
        </div>

        {stats && (
          <div className="px-4 md:px-8 py-9 md:py-10">
            <Mono>THE ACCUMULATED RECORD</Mono>
            <div className="mt-4 flex flex-col">
              <StatRow label="Listings tracked" value={stats.listingsTracked} />
              <StatRow label="Still posted somewhere" value={stats.stillPosted} />
              <StatRow label="Open reports" value={stats.openReports} valueClassName={stats.openReports ? "text-amber-ink" : ""} />
              <StatRow label="First-hand accounts" value={stats.firstHandAccounts} />
              <StatRow label="Evidence items published" value={stats.evidenceItems} />
              <StatRow label="Confirmed hires" value={stats.confirmedHires} valueClassName={stats.confirmedHires ? "text-accent" : ""} />
              <StatRow label="Employer responses" value={stats.employerReplies || "none"} valueClassName={!stats.employerReplies ? "text-muted-foreground !font-normal" : ""} last />
            </div>
            <div className="mt-4 p-3.5 bg-panel">
              <p className="text-[12px] leading-[1.6] text-muted">
                Treat these numbers as a description of our record, not a measure of the company.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center px-4 md:px-8 border-b border-border-strong overflow-x-auto">
        <Tab active={tab === "listings"} onClick={() => setTab("listings")} count={stats?.listingsTracked}>Listings</Tab>
        <Tab active={tab === "reviews"} onClick={() => setTab("reviews")} count={stats?.companyReviews}>What people said</Tab>
        <Tab active={tab === "patterns"} onClick={() => setTab("patterns")}>Patterns over time</Tab>
      </div>

      {tab === "listings" && (
        <div>
          {jobs.length === 0 ? (
            <div className="px-4 md:px-8 py-8 text-muted text-sm">No listings tracked for this company yet.</div>
          ) : (
            jobs.map((job) => {
              const { label, tone } = quickRecordLabel(job);
              return (
                <Link key={job._id} href={`/registry/${job._id}`} className="flex flex-col sm:flex-row gap-2 sm:gap-6 px-4 md:px-8 py-4 border-b border-border-soft hover:bg-panel !no-underline text-inherit">
                  <div className="flex-1">
                    <div className="text-[16px] font-semibold">{job.title}</div>
                    <div className="mt-1 text-[12.5px] text-muted">Posted {formatDateMono(job.createdAt)} · {job.location}</div>
                  </div>
                  <span className={`font-mono text-[9.5px] tracking-[0.08em] ${stateInk(tone)}`}>{label.toUpperCase()}</span>
                </Link>
              );
            })
          )}
        </div>
      )}

      {tab === "reviews" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
          <div className="lg:border-r border-border">
            {reviews.length === 0 ? (
              <div className="px-4 md:px-8 py-8 text-muted text-sm">No company accounts filed yet.</div>
            ) : (
              reviews.map((r) => (
                <div key={r._id} className="px-4 md:px-8 py-5 border-b border-border-soft">
                  <div className="flex items-center gap-2.5">
                    <span className="w-[7px] h-[7px] rounded-full bg-ink" />
                    <span className="font-mono text-[10px] tracking-[0.1em]">{r.stage ? r.stage.replace("_", " ").toUpperCase() : "COMPANY ACCOUNT"}</span>
                    <span className="ml-auto font-mono text-[10px] text-faint">{formatDateMono(r.createdAt)}</span>
                  </div>
                  <p className="mt-2.5 font-serif text-[17px] leading-[1.6] max-w-[58ch]">&ldquo;{r.comment}&rdquo;</p>
                  <div className="mt-2.5 text-[13px] font-semibold">{r.author}</div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 md:px-8 py-6">
            <Mono>ADD YOURS</Mono>
            {isAuthenticated ? (
              <div className="mt-3.5 border border-border-mid bg-card">
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="What was this company like to interview with or work for?"
                  rows={4}
                  className="w-full p-3 text-[13.5px] outline-none resize-none bg-transparent"
                />
                <div className="px-3 py-2.5 border-t border-border-soft">
                  <PrimaryButton onClick={submitReview} disabled={posting || !reviewText.trim()} className="!text-[12.5px] !px-4 !py-2">
                    {posting ? "Posting…" : "Publish account"}
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              <div className="mt-3.5 flex flex-col gap-2">
                <Link href="/login"><SecondaryButton className="w-full">Worked or interviewed here</SecondaryButton></Link>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "patterns" && (
        <div className="px-4 md:px-8 py-8">
          {patterns.length === 0 ? (
            <div className="text-muted text-sm">Not enough tracked history yet to show a pattern.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 items-end">
              {patterns.map((p) => {
                const max = Math.max(...patterns.map((x) => x.postings), 1);
                return (
                  <div key={p.month}>
                    <div className="h-14 flex items-end">
                      <div className="w-full bg-ink" style={{ height: `${Math.max(8, (p.postings / max) * 56)}px` }} />
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-muted-foreground">{p.month}</div>
                    <div className="mt-0.5 text-[12px] text-ink-soft">
                      {p.postings} posted{p.reports ? `, ${p.reports} reported` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
