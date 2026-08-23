"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { Job } from "../types/user";
import RecordCard from "../components/registry/RecordCard";
import { Mono, PrimaryButton, SecondaryButton } from "../components/ui/primitives";

const QUESTIONS = [
  { n: "01", label: "Is this role real?" },
  { n: "05", label: "How long has it been up?" },
  { n: "02", label: "Can I actually apply?" },
  { n: "06", label: "What is the company like?" },
  { n: "03", label: "Has anyone had a reply?" },
  { n: "07", label: "What should I check myself?" },
  { n: "04", label: "Is the pay honest?" },
];

const RECORD_CONTAINS = [
  {
    glyph: <span className="w-2 h-2 rounded-full bg-ink mt-1.5 shrink-0" />,
    title: "Someone's own experience",
    body: "A first-hand account of applying, interviewing, or being told something. Attributed to a handle with a visible contribution history.",
  },
  {
    glyph: <span className="w-2 h-2 bg-ink mt-1.5 shrink-0" />,
    title: "An automated check",
    body: "Whether the application URL still responds, whether the same text is posted elsewhere, when it last changed. Machine output, never a judgement.",
  },
  {
    glyph: <span className="w-[9px] h-[7px] bg-accent rotate-45 mt-1.5 shrink-0" />,
    title: "A moderator decision",
    body: "Confirming a document is what it claims to be. Moderators never rule on whether a job is real.",
  },
  {
    glyph: <span className="w-3 h-1 bg-ink mt-2 shrink-0" />,
    title: "What contributors voted",
    body: "The cheapest signal on the platform. Shown raw, with the sample size, and weighted least.",
  },
  {
    glyph: <span className="w-2 h-2 rounded-full border-[1.5px] border-faint mt-1.5 shrink-0" />,
    title: "Nothing on record",
    body: "Marked as a blank rather than filled with a guess. Usually the most useful thing on the page.",
    muted: true,
  },
];

interface PublicStats {
  listingsTracked: number;
  recordsWithAccount: number;
  evidencePublished: number;
  employerResponses: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [recent, setRecent] = useState<Job[]>([]);

  useEffect(() => {
    api.analytics.publicStats().then((r) => setStats(r.data)).catch(() => {});
    api.jobs.list({ limit: 3 }).then((r) => setRecent(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] border-b border-border-strong">
        <div className="px-4 md:px-8 pt-12 md:pt-[72px] pb-[52px] md:pb-[60px] lg:border-r border-border">
          <Mono tone="accent">BEFORE YOU APPLY</Mono>
          <h1 className="mt-5 text-[38px] md:text-[52px] lg:text-[62px] leading-[1.02] tracking-[-0.04em] font-bold max-w-[19ch] text-pretty">
            Find out what is actually known about a job.
          </h1>
          <p className="mt-6 font-serif text-[19px] md:text-[22px] leading-[1.5] text-ink-soft max-w-[52ch]">
            Job listings go stale, get reposted for months, and sometimes were never really open. WorkWyse collects what
            people can show — accounts, screenshots, automated checks — and keeps it attached to the claim it supports.
          </p>
          <p className="mt-4 font-serif text-[16px] md:text-[17px] leading-[1.65] text-muted max-w-[56ch]">
            We do not decide whether a job is real. We show you the record and who checked it, and let you judge what it
            is worth.
          </p>

          <SearchBox />

          <div className="mt-10 pt-5 border-t border-border">
            <Mono>EVERY RECORD ANSWERS THE SAME SEVEN QUESTIONS</Mono>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              {QUESTIONS.map((q) => (
                <div key={q.n} className="flex gap-3 py-2.5 border-b border-border-soft">
                  <span className="font-mono text-[10px] text-faint w-4">{q.n}</span>
                  <span className="text-[15px]">{q.label}</span>
                </div>
              ))}
              <div className="flex items-center py-2.5 border-b border-border-soft">
                <Link href="/registry" className="font-mono text-[10px] tracking-[0.1em] text-accent">
                  SEE A FULL RECORD →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* what goes into a record */}
        <div className="px-4 md:px-8 pt-10 md:pt-[72px] pb-[60px]">
          <Mono>WHAT GOES INTO A RECORD</Mono>
          <div className="mt-[18px] flex flex-col">
            {RECORD_CONTAINS.map((item) => (
              <div key={item.title} className="flex gap-3.5 py-3.5 border-b border-border-soft last:border-b-0">
                {item.glyph}
                <div>
                  <div className={`text-[15px] font-semibold ${item.muted ? "text-muted" : ""}`}>{item.title}</div>
                  <div className="mt-1 text-[13px] leading-[1.6] text-muted">{item.body}</div>
                </div>
              </div>
            ))}
          </div>

          {stats && (
            <div className="mt-8 p-5 bg-panel">
              <Mono tone="muted">THE PLATFORM SO FAR</Mono>
              <div className="mt-3.5 flex flex-col gap-2.5">
                <StatLine label="Listings tracked" value={stats.listingsTracked} />
                <StatLine label="Records with a first-hand account" value={stats.recordsWithAccount} />
                <StatLine label="Evidence items published" value={stats.evidencePublished} />
                <StatLine label="Employer responses on record" value={stats.employerResponses} />
              </div>
              <p className="mt-3.5 text-[12.5px] leading-[1.6] text-muted">
                Most records are thin. We show the thinness rather than hiding it — a record built by three people is
                labelled as one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent records */}
      {recent.length > 0 && (
        <>
          <div className="px-4 md:px-8 py-8 flex items-baseline gap-4">
            <h2 className="text-2xl font-bold tracking-[-0.025em]">Records people are looking at today</h2>
            <Link href="/activity" className="ml-auto font-mono text-[10px] tracking-[0.1em] text-accent whitespace-nowrap">
              SEE ALL RECENT ACTIVITY →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-b border-border-strong">
            {recent.map((job) => (
              <RecordCard key={job._id} job={job} />
            ))}
          </div>
        </>
      )}

      {/* what we don't claim */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-border-strong">
        <div className="px-4 md:px-8 py-10 md:py-11 md:border-r border-border">
          <Mono>WHAT WORKWYSE DOES NOT CLAIM</Mono>
          <div className="mt-5 flex flex-col gap-4">
            <p className="font-serif text-[18px] md:text-[19px] leading-[1.55] max-w-[48ch]">
              That a listing is fake. We have no way to know, and neither does anyone who has not worked there.
            </p>
            <p className="font-serif text-[18px] md:text-[19px] leading-[1.55] max-w-[48ch]">
              That a company is dishonest. A dead application page and six reposts are facts about a listing, not a
              verdict on an employer.
            </p>
            <p className="font-serif text-[18px] md:text-[19px] leading-[1.55] max-w-[48ch]">
              That our score is objective. It is a summary of the record, it moves when the record moves, and it is
              always optional to look at.
            </p>
          </div>
          <Link href="/about" className="inline-block mt-6 font-mono text-[10px] tracking-[0.1em] text-accent border-b border-border-mid pb-0.5">
            READ HOW THIS WORKS IN FULL →
          </Link>
        </div>
        <div className="px-4 md:px-8 py-10 md:py-11 bg-ink text-background">
          <Mono className="!text-faint">IF YOU HAVE APPLIED TO SOMETHING</Mono>
          <h2 className="mt-[18px] text-[26px] md:text-[32px] leading-[1.12] tracking-[-0.03em] font-bold max-w-[20ch]">
            The record only exists because people file what happened to them.
          </h2>
          <p className="mt-4 font-serif text-[17px] md:text-[18px] leading-[1.6] text-border-mid max-w-[48ch]">
            An interview that went nowhere, a rejection, an offer, a recruiter who vanished. Attach a screenshot if you
            have one; say so if you do not. Both are useful, and they are labelled differently.
          </p>
          <div className="mt-6 flex gap-3 flex-wrap">
            <Link href="/contribute">
              <PrimaryButton className="!bg-background !text-ink hover:!bg-border-mid">Add what you know</PrimaryButton>
            </Link>
            <Link href="/about">
              <SecondaryButton className="!border-ink-soft !text-border-mid hover:!border-background hover:!text-background">
                How contributions are handled
              </SecondaryButton>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-[13.5px]">
      <span className="text-muted">{label}</span>
      <span className="font-mono font-semibold">{value.toLocaleString()}</span>
    </div>
  );
}

function SearchBox() {
  return (
    <form
      action="/registry"
      className="mt-9 border border-border-strong bg-card"
    >
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border-soft">
        <span className="w-[11px] h-[11px] rounded-full border-[1.5px] border-faint shrink-0" />
        <input
          name="search"
          placeholder="Paste a job URL, or search a title or company"
          className="flex-1 min-w-0 text-[16px] md:text-[17px] placeholder:text-faint outline-none bg-transparent"
        />
        <button type="submit" className="text-[13.5px] font-semibold bg-ink text-background px-[18px] py-[11px] whitespace-nowrap">
          Look it up
        </button>
      </div>
      <div className="flex items-center gap-3.5 px-4 py-2.5 flex-wrap">
        <Mono>TRY</Mono>
        <Link href="/registry" className="text-[12.5px] text-accent border-b border-border-mid">
          Listings reposted 3+ times
        </Link>
        <Link href="/registry?signal=accounts" className="text-[12.5px] text-accent border-b border-border-mid">
          Listings with a first-hand account
        </Link>
        <Link href="/registry?signal=dead" className="text-[12.5px] text-accent border-b border-border-mid">
          Application pages that are dead
        </Link>
      </div>
    </form>
  );
}
