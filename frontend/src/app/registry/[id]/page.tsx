"use client";
import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../../lib/api";
import { useAuth } from "../../../components/AuthContext";
import { useToast } from "../../../components/ui/Toast";
import { JobRecord } from "../../../types/user";
import {
  computeQuestionStates, stateCounts, classifyActivity, activityCopy, formatDateMono,
  timeAgo, recordCode, initials, OUTCOME_LABEL, STAGE_LABEL,
} from "../../../lib/record";
import { Mono, Glyph, StateDot, StatRow, Panel, Chip, PrimaryButton, SecondaryButton } from "../../../components/ui/primitives";
import QuestionSection from "../../../components/registry/QuestionSection";
import AccountCard from "../../../components/registry/AccountCard";
import EvidenceCard from "../../../components/registry/EvidenceCard";
import Discussion from "../../../components/registry/Discussion";

type LogFilter = "all" | "people" | "auto" | "mod";

export default function JobRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isAuthenticated, isAdmin } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [record, setRecord] = useState<JobRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [openQ, setOpenQ] = useState<Record<number, boolean>>({});
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [scoreOpen, setScoreOpen] = useState(false);
  const [watching, setWatching] = useState(false);
  const [userVote, setUserVote] = useState<"upvote" | "downvote" | null>(null);
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.jobs.getRecord(id);
      setRecord(res.data);
    } catch {
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.jobs.watchStatus(id).then((r) => setWatching(r.data.watching)).catch(() => {});
    api.jobs.getUserVote(id).then((r) => setUserVote(r.data.userVote)).catch(() => {});
  }, [id, isAuthenticated]);

  function toggle(n: number) {
    setOpenQ((s) => ({ ...s, [n]: !s[n] }));
  }

  async function toggleWatch() {
    if (!isAuthenticated) { router.push("/login"); return; }
    try {
      if (watching) { await api.jobs.unwatch(id); setWatching(false); }
      else { await api.jobs.watch(id); setWatching(true); }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update watch status");
    }
  }

  async function vote(type: "upvote" | "downvote") {
    if (!isAuthenticated) { router.push("/login"); return; }
    try {
      await api.jobs.vote(id, type);
      setUserVote((prev) => (prev === type ? null : type));
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not record vote");
    }
  }

  async function runUrlCheck() {
    setCheckingUrl(true);
    try {
      await api.jobs.checkUrl(id);
      await load();
      toast.success("URL check complete");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not check the URL");
    } finally {
      setCheckingUrl(false);
    }
  }

  async function deleteRecord() {
    if (!confirm("Delete this record? This removes the listing and everything filed under it.")) return;
    try {
      await api.jobs.delete(id);
      toast.success("Record deleted");
      router.push("/registry");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete this record");
    }
  }

  if (loading) return <div className="px-8 py-16 text-muted">Loading…</div>;
  if (!record) return <div className="px-8 py-16 text-muted">This record could not be found.</div>;

  const { job, reports, log, contributorsCount, trustScore, repostCount, repostSiblings, duplicateSiblings, companyStats } = record;
  const questions = computeQuestionStates(record);
  const counts = stateCounts(questions);
  const openReports = reports.filter((r) => r.status === "pending");
  const evidenceVerifiedCount = (job.evidence ?? []).filter((e) => e.status === "verified").length;
  const modDecisions = (job.evidence ?? []).filter((e) => e.verifiedBy).length + reports.filter((r) => r.status !== "pending").length;
  const employerReplies = reports.filter((r) => r.employerReply);
  const outcomes = job.reviews.filter((r) => r.outcome);
  const submittedByUid = typeof job.submittedBy === "object" ? job.submittedBy?.uid : undefined;
  const canManage = isAuthenticated && (isAdmin || (submittedByUid && submittedByUid === user?.uid));

  const filteredLog = log.filter((e) => logFilter === "all" || classifyActivity(e.action) === logFilter);
  const gapsCount = questions.filter((q) => q.state !== "answered").length;

  const salaryQuotes = job.reviews.filter((r) => r.salaryQuoted);
  const withOutcome = job.reviews.filter((r) => r.outcome);
  const doubters = job.downvotes;
  const totalVotes = job.upvotes + job.downvotes;

  return (
    <div>
      {/* breadcrumb */}
      <div className="flex items-center gap-2 px-4 md:px-8 py-2.5 border-b border-border font-mono text-[10px] tracking-[0.06em] text-muted-foreground overflow-x-auto whitespace-nowrap">
        <Link href="/registry" className="text-accent">REGISTRY</Link>
        <span className="text-faintest">›</span>
        <Link href={`/companies/resolve?name=${encodeURIComponent(job.company)}`} className="text-accent">{job.company.toUpperCase()}</Link>
        <span className="text-faintest">›</span>
        <span className="text-ink">{job.title.toUpperCase()}</span>
        <span className="ml-auto hidden sm:inline">{recordCode(job._id)} · OPENED {formatDateMono(job.createdAt)} · LAST ACTIVITY {timeAgo(job.updatedAt).toUpperCase()}</span>
      </div>

      {/* masthead */}
      <div id="rec" className="px-4 md:px-8 pt-9 md:pt-11">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_316px] gap-8 md:gap-14 items-start">
          <div>
            {openReports.length > 0 ? (
              <div className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-accent bg-panel-teal px-2.5 py-1.5">
                <span className="w-[5px] h-[5px] bg-accent" /> UNDER INVESTIGATION · {openReports.length} OPEN CHALLENGE{openReports.length === 1 ? "" : "S"}
              </div>
            ) : (
              <Mono>RECORD {recordCode(job._id)}</Mono>
            )}
            <h1 className="mt-4 text-[34px] md:text-[48px] leading-[1.03] tracking-[-0.035em] font-bold max-w-[18ch] text-pretty">
              {job.title}
            </h1>
            <div className="mt-3.5 flex items-center gap-2.5 text-[15px] text-ink-soft flex-wrap">
              <span className="w-[22px] h-[22px] bg-ink text-background font-mono text-[9px] flex items-center justify-center">
                {initials(job.company)}
              </span>
              <span className="font-semibold text-ink">{job.company}</span>
              <span className="text-faintest">·</span><span>{job.location}</span>
              <span className="font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground border border-border-mid px-1.5 py-0.5">
                {job.verificationStatus === "verified" ? "VERIFIED" : "AS CLAIMED · UNVERIFIED"}
              </span>
            </div>
            <p className="mt-6 font-serif text-[20px] md:text-[24px] leading-[1.45] tracking-[-0.01em] max-w-[44ch] text-pretty">
              {job.jobDescription || job.description}
            </p>
            <p className="mt-4 font-serif text-[15px] md:text-[16px] leading-[1.6] text-muted max-w-[58ch]">
              {contributorsCount} {contributorsCount === 1 ? "person" : "people"} built this record.{" "}
              {counts.open > 0
                ? `That is thin, so ${counts.open} of the seven questions below have nothing on record at all — they are marked open rather than filled in with a guess.`
                : "It has an account or evidence attached to every question below."}
            </p>
            <div className="mt-5 flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => vote("upvote")}
                className={`font-mono text-[10px] tracking-[0.08em] px-3 py-2 border ${userVote === "upvote" ? "bg-ink text-background border-ink" : "border-border-mid text-ink-soft hover:border-ink"}`}
              >
                {userVote === "upvote" ? "✓ SEEMS LEGIT" : "SEEMS LEGIT"}
              </button>
              <button
                onClick={() => vote("downvote")}
                className={`font-mono text-[10px] tracking-[0.08em] px-3 py-2 border ${userVote === "downvote" ? "bg-ink text-background border-ink" : "border-border-mid text-ink-soft hover:border-ink"}`}
              >
                {userVote === "downvote" ? "✓ I DOUBT IT" : "I DOUBT IT"}
              </button>
              {totalVotes > 0 && <span className="text-[12.5px] text-muted">{doubters} of {totalVotes} doubt this listing</span>}
              <button onClick={toggleWatch} className="ml-auto sm:ml-0 font-mono text-[10px] tracking-[0.08em] px-3 py-2 border border-border-mid text-ink-soft hover:border-ink">
                {watching ? "✓ WATCHING" : "WATCH THIS RECORD"}
              </button>
            </div>
          </div>

          <Panel header="WHAT THIS RECORD CONTAINS">
            <StatRow label="Contributors" value={contributorsCount} />
            <StatRow label="First-hand accounts" value={job.reviews.length} />
            <StatRow label="Evidence items" value={job.evidence?.length ?? 0} />
            <StatRow label="Automated checks" value={job.urlCheck ? 1 : 0} />
            <StatRow label="Moderator decisions" value={modDecisions} />
            <StatRow label="Employer responses" value={employerReplies.length || "none"} valueClassName={employerReplies.length ? "text-accent" : "text-muted-foreground !font-normal"} />
            <StatRow label="Reported outcomes" value={outcomes.length || "none"} valueClassName={!outcomes.length ? "text-muted-foreground !font-normal" : ""} last />
          </Panel>
        </div>

        {/* certainty strip */}
        <div className="mt-10 pt-4 border-t border-border-strong">
          <div className="flex items-baseline gap-4 flex-wrap">
            <Mono>SEVEN QUESTIONS · STATE OF THE RECORD</Mono>
            <div className="flex items-center gap-3.5 text-[13px] flex-wrap">
              <span className="flex items-center gap-1.5"><StateDot state="answered" /> <b className="text-ink">{counts.answered} answered</b></span>
              <span className="flex items-center gap-1.5 text-muted"><StateDot state="partly" /> {counts.partly} partly</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><StateDot state="open" /> {counts.open} open</span>
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-4 sm:grid-cols-7 gap-2.5">
            {questions.map((q) => (
              <a key={q.id} href={`#q${q.id}`} className="!no-underline text-inherit">
                <span className={`block h-[3px] ${q.state === "open" ? "border-t-[3px] border-dotted border-faint" : q.state === "answered" ? "bg-accent" : "bg-amber"}`} />
                <span className="block mt-2 font-mono text-[9.5px] text-faint">Q{q.id}</span>
                <span className="block mt-0.5 text-[12px] leading-[1.35]">{q.title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* main grid: index rail + questions */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] border-t border-border-strong">
        <div className="hidden lg:block border-r border-border-strong">
          <div className="sticky top-[95px] px-5 py-6">
            <Mono>INDEX</Mono>
            <div className="mt-3.5 flex flex-col">
              {questions.map((q) => (
                <a key={q.id} href={`#q${q.id}`} className="!no-underline text-inherit px-1 py-2.5 flex gap-2.5 items-baseline">
                  <span className="font-mono text-[10px] text-faint w-4">{String(q.id).padStart(2, "0")}</span>
                  <span className="text-[13px] font-medium text-ink-soft">{q.title}</span>
                </a>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2.5">
              <a href="#log" className="!no-underline font-mono text-[10px] tracking-[0.08em] flex justify-between text-ink-soft">
                <span>THE LOG</span><span className="text-faint">{log.length}</span>
              </a>
              <Link href={`/contribute?job=${job._id}`} className="!no-underline font-mono text-[10px] tracking-[0.08em] flex justify-between text-ink-soft">
                <span>CONTRIBUTE</span><span className="text-faint">{gapsCount} GAPS</span>
              </Link>
            </div>
            <div className="mt-4 p-3.5 border border-border-mid bg-card">
              <Mono>IF YOU WANT ONE NUMBER</Mono>
              {scoreOpen && (
                <div className="mt-2.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[24px] font-semibold">{trustScore}</span>
                    <span className="font-mono text-[10.5px] text-faint">/100</span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-[1.6] text-muted">
                    Weighted from {totalVotes} vote{totalVotes === 1 ? "" : "s"}, {job.evidence?.length ?? 0} evidence item{(job.evidence?.length ?? 0) === 1 ? "" : "s"} and {job.reviews.length} account{job.reviews.length === 1 ? "" : "s"}. It summarises the seven answers; it does not measure the job.
                  </p>
                </div>
              )}
              <button onClick={() => setScoreOpen((s) => !s)} className="mt-2.5 font-mono text-[10px] tracking-[0.08em] text-accent border-b border-border-mid pb-0.5">
                {scoreOpen ? "HIDE IT" : "SHOW THE SCORE"}
              </button>
            </div>
          </div>
        </div>

        <div>
          {/* Q1 */}
          <QuestionSection
            id="q1" n={1} title="Is this role real?" state={questions[0].state} open={!!openQ[1]} onToggle={() => toggle(1)}
            summary={<Q1Summary job={job} state={questions[0].state} />}
          >
            <div className="flex flex-col gap-5">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Mono tone="muted">
                    {(job.evidence?.length ?? 0) > 0
                      ? `EVIDENCE · ${evidenceVerifiedCount} OF ${job.evidence!.length} VERIFIED`
                      : "EVIDENCE · NONE ATTACHED"}
                  </Mono>
                  <Link
                    href={`/contribute?job=${job._id}&kind=evidence`}
                    className="!no-underline font-mono text-[10px] tracking-[0.08em] text-accent hover:text-ink"
                  >
                    + ATTACH EVIDENCE
                  </Link>
                </div>
                {(job.evidence?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {job.evidence!.map((e, i) => (
                      <EvidenceCard key={e._id ?? i} evidence={e} index={i} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-muted">
                    Nothing is attached yet — a screenshot, a link, or a copy of the correspondence all count.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-4">
                {job.reviews.filter((r) => r.stage).length > 0 ? (
                  job.reviews.filter((r) => r.stage).map((r) => <AccountCard key={r._id} review={r} />)
                ) : (
                  <p className="text-[14px] text-muted">No account describes reaching an interview or offer yet.</p>
                )}
              </div>
            </div>
          </QuestionSection>

          {/* Q2 */}
          <QuestionSection
            id="q2" n={2} title="Can I actually apply?" state={questions[1].state} open={!!openQ[2]} onToggle={() => toggle(2)}
            toggleLabel={openQ[2] ? "Hide the check" : "See the check"}
            summary={<Q2Summary job={job} />}
          >
            <div className="border border-border-mid">
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border-mid bg-panel-teal-soft flex-wrap">
                <span className="w-[7px] h-[7px] bg-ink" />
                <span className="font-mono text-[10px] tracking-[0.1em]">AUTOMATED CHECK · NOT A HUMAN JUDGEMENT</span>
                <button onClick={runUrlCheck} disabled={checkingUrl} className="ml-auto font-mono text-[10px] tracking-[0.08em] text-accent disabled:opacity-50">
                  {checkingUrl ? "CHECKING…" : "CHECK NOW"}
                </button>
              </div>
              <div className="px-4 sm:px-5 py-4">
                {job.urlCheck ? (
                  <p className="m-0 font-mono text-[13px] leading-[1.9] text-ink-soft break-all">
                    GET {job.jobUrl} → <span className={`font-semibold ${job.urlCheck.ok ? "text-accent" : "text-ink"}`}>{job.urlCheck.statusCode ?? (job.urlCheck.ok ? "OK" : "FAILED")}</span>
                    <br />LAST CHECKED {formatDateMono(job.urlCheck.checkedAt)}
                    {job.urlCheck.consecutiveFailures > 0 && <><br />{job.urlCheck.consecutiveFailures} CONSECUTIVE FAILURE{job.urlCheck.consecutiveFailures === 1 ? "" : "S"}</>}
                  </p>
                ) : (
                  <p className="text-[14px] text-muted">Nobody has run a check on this URL yet.</p>
                )}
                <p className="mt-4 font-serif text-[16px] leading-[1.65] text-ink-soft max-w-[64ch]">
                  This tells you whether the door is open right now. It does not tell you the job never existed — filled
                  roles get taken down too, and aggregator copies can outlive them.
                </p>
              </div>
            </div>
          </QuestionSection>

          {/* Q3 */}
          <QuestionSection
            id="q3" n={3} title="Has anyone had a reply?" state={questions[2].state} open={!!openQ[3]} onToggle={() => toggle(3)}
            toggleLabel={openQ[3] ? "Hide the accounts" : "See the accounts"}
            summary={<Q3Summary reviews={withOutcome} />}
          >
            {withOutcome.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {withOutcome.map((r) => (
                  <div key={r._id} className="border border-border-mid p-4">
                    <Mono>{r.stage ? STAGE_LABEL[r.stage] : "APPLIED"} · {r.outcome && OUTCOME_LABEL[r.outcome].toUpperCase()}</Mono>
                    <div className="mt-2.5 text-[15px] font-semibold">{r.author}</div>
                    <p className="mt-2 text-[13.5px] leading-[1.6] text-muted">{r.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-muted">Nobody has reported an outcome yet.</p>
            )}
          </QuestionSection>

          {/* Q4 */}
          <QuestionSection
            id="q4" n={4} title="Is the pay honest?" state={questions[3].state} open={false}
            summary={<Q4Summary reviews={salaryQuotes} />}
          />

          {/* Q5 */}
          <QuestionSection
            id="q5" n={5} title="How long has it been up?" state={questions[4].state} open={!!openQ[5]} onToggle={() => toggle(5)}
            toggleLabel={openQ[5] ? "Hide the pattern" : "See the pattern"}
            summary={<Q5Summary job={job} repostCount={repostCount} />}
          >
            <div>
              <div className="flex items-center gap-2.5 font-mono text-[9.5px] tracking-[0.12em] text-muted mb-4">
                <span className="w-[7px] h-[7px] bg-ink" /> REPOST SIBLINGS · SAME COMPANY, SAME TITLE
              </div>
              {repostSiblings.length > 0 ? (
                <div className="flex flex-col gap-0">
                  {repostSiblings.map((s) => (
                    <Link key={s._id} href={`/registry/${s._id}`} className="flex justify-between py-2.5 border-b border-border-soft !no-underline text-inherit hover:text-accent">
                      <span className="text-[14px]">{s.title}</span>
                      <span className="font-mono text-[11px] text-faint">{formatDateMono(s.createdAt)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-muted">No other listing shares this exact title and company yet.</p>
              )}
              {duplicateSiblings.length > 0 && (
                <div className="mt-5 pt-4 border-t border-border-soft">
                  <Mono tone="amber">EXACT TEXT MATCH AT ANOTHER COMPANY</Mono>
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {duplicateSiblings.map((s) => (
                      <Link key={s._id} href={`/registry/${s._id}`} className="text-[14px] text-accent !no-underline">
                        {s.title} · {s.company}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </QuestionSection>

          {/* Q6 */}
          <QuestionSection
            id="q6" n={6} title="What is the company like?" state={questions[5].state} open={!!openQ[6]} onToggle={() => toggle(6)}
            toggleLabel={openQ[6] ? "Hide the company" : "See the company"}
            summary={<Q6Summary job={job} companyStats={companyStats} />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-6">
              <div>
                <p className="font-serif text-[16px] leading-[1.65] text-ink-soft max-w-[62ch]">
                  {companyStats.confirmedHires} confirmed hire{companyStats.confirmedHires === 1 ? "" : "s"} in {companyStats.listingsTracked} tracked
                  listing{companyStats.listingsTracked === 1 ? "" : "s"} is not evidence of bad faith on its own — most people never come back to
                  report an outcome. Both readings stay available here.
                </p>
                <Link href={`/companies/resolve?name=${encodeURIComponent(job.company)}`} className="inline-block mt-3 font-mono text-[10px] tracking-[0.08em] text-accent">
                  OPEN THE {job.company.toUpperCase()} RECORD →
                </Link>
              </div>
              <Panel header={job.company.toUpperCase()}>
                <StatRow label="Listings tracked" value={companyStats.listingsTracked} />
                <StatRow label="Open reports" value={companyStats.openReports} valueClassName={companyStats.openReports ? "text-amber-ink" : ""} />
                <StatRow label="Confirmed hires" value={companyStats.confirmedHires} valueClassName={companyStats.confirmedHires ? "text-accent" : ""} />
                <StatRow label="Employer replies" value={companyStats.employerReplies || "none"} valueClassName={!companyStats.employerReplies ? "text-muted-foreground !font-normal" : ""} last />
              </Panel>
            </div>
          </QuestionSection>

          {/* Q7 */}
          <div id="q7" className="bg-ink text-background">
            <div className="grid grid-cols-[64px_1fr] sm:grid-cols-[96px_1fr]">
              <div className="pt-7 pl-4 sm:pl-8">
                <Mono className="!text-faint">Q7</Mono>
                <div className="mt-2.5 w-[38px] border-t-[3px] border-dotted border-ink-soft" />
              </div>
              <div className="pt-7 pr-4 sm:pr-10 pb-9">
                <div className="flex items-start gap-4 flex-wrap">
                  <h2 className="m-0 text-[24px] sm:text-[32px] leading-[1.12] tracking-[-0.03em] font-bold max-w-[22ch]">What should I check myself?</h2>
                  <span className="ml-auto font-mono text-[10px] tracking-[0.12em] text-faint pt-1.5">ONLY YOU CAN</span>
                </div>
                <p className="mt-4 font-serif text-[19px] sm:text-[22px] leading-[1.5] max-w-[52ch] text-border-mid">
                  Three things nobody here can do for you.
                </p>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 border-t border-ink-soft">
                  {[
                    "Whether the recruiter named on the post still lists this role anywhere.",
                    "Whether the team has shipped or hired anything recently.",
                    "Whether a direct email to the hiring manager gets an answer.",
                  ].map((t, i) => (
                    <div key={i} className="pt-4 pr-0 sm:pr-5 pb-0 sm:border-r border-ink-soft last:border-r-0">
                      <Mono className="!text-faint">{String(i + 1).padStart(2, "0")}</Mono>
                      <p className="mt-2 text-[15px] leading-[1.6] text-border-soft">{t}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-3 flex-wrap">
                  <Link href={`/contribute?job=${job._id}`}>
                    <PrimaryButton className="!bg-background !text-ink hover:!bg-border-mid">Add what you find</PrimaryButton>
                  </Link>
                  <SecondaryButton onClick={toggleWatch} className="!border-ink-soft !text-border-mid hover:!border-background hover:!text-background">
                    {watching ? "Watching this record" : "Watch this record"}
                  </SecondaryButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Log */}
      <div id="log" className="border-t border-border-strong">
        <div className="flex items-center gap-4 px-4 md:px-8 pt-5 pb-4 flex-wrap">
          <span className="text-xl font-bold tracking-[-0.02em]">The log</span>
          <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">EVERY CHANGE TO THIS RECORD, NEWEST FIRST · {log.length}</span>
          <div className="ml-auto flex gap-2">
            <Chip active={logFilter === "all"} onClick={() => setLogFilter("all")}>ALL</Chip>
            <Chip active={logFilter === "people"} onClick={() => setLogFilter("people")}>● PEOPLE</Chip>
            <Chip active={logFilter === "auto"} onClick={() => setLogFilter("auto")}>■ AUTOMATED</Chip>
            <Chip active={logFilter === "mod"} onClick={() => setLogFilter("mod")}>◆ MODERATION</Chip>
          </div>
        </div>
        <div className="border-t border-border">
          {filteredLog.length === 0 ? (
            <div className="px-4 md:px-8 py-6 text-muted text-sm">Nothing in this lane yet.</div>
          ) : (
            filteredLog.map((entry) => {
              const kind = classifyActivity(entry.action);
              return (
                <div key={entry._id} className="grid grid-cols-1 sm:grid-cols-[150px_150px_1fr_180px] gap-1.5 px-4 md:px-8 py-3 border-b border-border-soft items-baseline">
                  <span className="font-mono text-[11px] text-muted-foreground">{formatDateMono(entry.createdAt)}</span>
                  <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-muted">
                    <Glyph kind={kind === "auto" ? "automated" : kind === "mod" ? "moderation" : "account"} />
                    {kind === "auto" ? "AUTOMATED" : kind === "mod" ? "MODERATION" : "PEOPLE"}
                  </span>
                  <span className="text-[14px]">{activityCopy(entry)}</span>
                  <span className="font-mono text-[11px] text-faint text-left sm:text-right">{entry.actorUsername}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Contribute rail */}
      <div className="border-t border-border-strong px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.025em]">{gapsCount} gap{gapsCount === 1 ? "" : "s"} anyone could close</h2>
            <p className="mt-2 font-serif text-[15.5px] leading-[1.6] text-muted max-w-[64ch]">
              Contributions are attributed to your handle and stay editable. Evidence is checked before it counts as
              verified; accounts are not — they are labelled by what supports them.
            </p>
          </div>
          <Link href={`/contribute?job=${job._id}`}>
            <PrimaryButton>Add what you know</PrimaryButton>
          </Link>
        </div>
      </div>

      {canManage && (
        <div className="border-t border-border-strong px-4 md:px-8 py-5">
          <button onClick={() => setManageOpen((s) => !s)} className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground hover:text-ink">
            {manageOpen ? "HIDE RECORD MANAGEMENT" : "MANAGE THIS RECORD (OWNER / ADMIN)"}
          </button>
          {manageOpen && (
            <div className="mt-4 flex items-center gap-3">
              <Link href={`/registry/${job._id}/edit`}><SecondaryButton>Edit details</SecondaryButton></Link>
              <button onClick={deleteRecord} className="text-[13.5px] font-semibold border border-destructive text-destructive px-4 py-3 hover:bg-destructive hover:text-destructive-foreground transition-colors">
                Delete this record
              </button>
            </div>
          )}
        </div>
      )}

      <Discussion jobId={job._id} />
    </div>
  );
}

function Q1Summary({ job, state }: { job: JobRecord["job"]; state: string }) {
  const interviewed = job.reviews.filter((r) => r.stage === "interviewed" || r.stage === "offered").length;
  if (interviewed > 0) {
    return <>It was real to at least <b className="font-semibold">{interviewed}</b> {interviewed === 1 ? "person" : "people"} who reached an interview. Whether it is still open, only the checks below can say.</>;
  }
  if (job.reviews.length > 0) {
    return <>{job.reviews.length} {job.reviews.length === 1 ? "account describes" : "accounts describe"} applying, but nobody has reported reaching an interview yet.</>;
  }
  return <span className="text-muted">Nobody has filed an account about this listing yet.</span>;
}

function Q2Summary({ job }: { job: JobRecord["job"] }) {
  if (!job.urlCheck) return <span className="text-muted">The application URL has not been checked yet.</span>;
  if (job.urlCheck.ok) return <><b className="font-semibold">Yes, as of the last check.</b> The application page responded normally.</>;
  return <><b className="font-semibold">Not at the source.</b> The company&apos;s application page has failed {job.urlCheck.consecutiveFailures} consecutive check{job.urlCheck.consecutiveFailures === 1 ? "" : "s"}.</>;
}

function Q3Summary({ reviews }: { reviews: JobRecord["job"]["reviews"] }) {
  if (reviews.length === 0) return <span className="text-muted">Nobody has reported what happened after applying.</span>;
  const hired = reviews.filter((r) => r.outcome === "hired").length;
  const rejected = reviews.filter((r) => r.outcome === "rejected").length;
  const silence = reviews.filter((r) => r.outcome === "no_response").length;
  const parts: string[] = [];
  if (hired) parts.push(`${hired} hired`);
  if (rejected) parts.push(`${rejected} rejected`);
  if (silence) parts.push(`${silence} heard nothing`);
  return <>{parts.join(", ")}, from {reviews.length} reported outcome{reviews.length === 1 ? "" : "s"}.</>;
}

function Q4Summary({ reviews }: { reviews: JobRecord["job"]["reviews"] }) {
  if (reviews.length === 0) {
    return <span className="text-muted">Nobody has reported an offer or a quoted band. There is nothing to compare the listing against.</span>;
  }
  return <>{reviews.length} contributor{reviews.length === 1 ? "" : "s"} reported a band: {reviews.map((r) => r.salaryQuoted).join(", ")}.</>;
}

function Q5Summary({ job, repostCount }: { job: JobRecord["job"]; repostCount: number }) {
  const days = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86400000);
  if (repostCount === 0 && !job.urlCheck) return <span className="text-muted">Not enough is known yet to say how long this has really been open.</span>;
  return <><b className="font-semibold">{days} day{days === 1 ? "" : "s"} on record</b>{repostCount > 0 ? <>, reposted {repostCount} time{repostCount === 1 ? "" : "s"} under the same title</> : ", with no reposts detected"}.</>;
}

function Q6Summary({ job, companyStats }: { job: JobRecord["job"]; companyStats: JobRecord["companyStats"] }) {
  if (companyStats.listingsTracked <= 1) {
    return <span className="text-muted">This is the only listing WorkWyse has tracked for {job.company} so far.</span>;
  }
  return (
    <>
      {companyStats.listingsTracked} listings tracked, {companyStats.openReports} with open reports,{" "}
      <b className="font-semibold">{companyStats.confirmedHires} confirmed hire{companyStats.confirmedHires === 1 ? "" : "s"}</b>.{" "}
      {companyStats.employerReplies > 0 ? "They have replied to at least one report." : "They have never replied to a report."}
    </>
  );
}
