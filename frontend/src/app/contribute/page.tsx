"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { Job, ReviewOutcome, ReviewStage } from "../../types/user";
import { recordCode, computeQuestionStates } from "../../lib/record";
import { Mono, PrimaryButton, SecondaryButton } from "../../components/ui/primitives";

type Kind = "account" | "evidence" | "review" | "challenge";

const KIND_META: Record<Kind, { title: string; glyph: string; blurb: string }> = {
  account: { title: "Something that happened to me", glyph: "●", blurb: "You applied, interviewed, were rejected, hired, or ghosted. The most useful thing on the platform." },
  evidence: { title: "A document or a link", glyph: "◆", blurb: "An email, a screenshot, a cached page. Checked by a moderator before it counts as verified." },
  review: { title: "What this employer is like", glyph: "●", blurb: "You worked there or went through their process. Attached to the company, not one listing." },
  challenge: { title: "Something here is wrong", glyph: "○", blurb: "Dispute an account, evidence, or a moderator decision. Goes to the moderation queue." },
};

export default function ContributePage() {
  return (
    <Suspense fallback={<div className="px-8 py-16 text-muted">Loading…</div>}>
      <ContributeFlow />
    </Suspense>
  );
}

function ContributeFlow() {
  const params = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const jobParam = params.get("job");

  // Deep links carry the lane they mean: /contribute?job=<id>&kind=evidence
  // drops the contributor straight into attaching evidence instead of
  // making them re-pick it. Unknown values fall back to the default rather
  // than rendering an empty flow.
  const KINDS: Kind[] = ["account", "evidence", "review", "challenge"];
  const kindParam = params.get("kind");
  const initialKind: Kind = KINDS.includes(kindParam as Kind) ? (kindParam as Kind) : "account";

  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<Kind>(initialKind);
  const [job, setJob] = useState<Job | null>(null);
  const [jobId, setJobId] = useState<string | null>(jobParam);

  // target finder (when no job context yet)
  const [urlQuery, setUrlQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingRecord, setStartingRecord] = useState(false);

  // account fields
  const [comment, setComment] = useState("");
  const [stage, setStage] = useState<ReviewStage | undefined>();
  const [outcome, setOutcome] = useState<ReviewOutcome | undefined>();
  const [salary, setSalary] = useState("");

  // evidence fields
  const [evType, setEvType] = useState<"image" | "url" | "text">("url");
  const [evValue, setEvValue] = useState("");
  const [evFile, setEvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // company review fields
  const [companyName, setCompanyName] = useState("");

  // challenge fields
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (jobId) api.jobs.get(jobId).then((r) => { setJob(r.data); setCompanyName(r.data.company); }).catch(() => setJob(null));
  }, [jobId]);

  useEffect(() => {
    if (!isAuthenticated) router.push(`/login?next=/contribute${jobParam ? `?job=${jobParam}` : ""}`);
  }, [isAuthenticated, router, jobParam]);

  const needsJobTarget = kind !== "review" && !jobId;

  async function findRecord() {
    if (!urlQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.jobs.registry({ search: urlQuery.trim(), limit: 5 });
      const raw = res as unknown as { data: Array<{ job: Job }> };
      setSearchResults(raw.data.map((d) => d.job));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function startNewRecord() {
    const isUrl = /^https?:\/\//i.test(urlQuery.trim());
    if (!isUrl) { toast.error("Paste a full job URL (starting with http:// or https://) to start a new record"); return; }
    setStartingRecord(true);
    try {
      const extraction = await api.jobs.extractUrl(urlQuery.trim());
      const created = await api.jobs.create({
        title: extraction.data.data.title || "Untitled listing",
        company: extraction.data.data.company || "Unknown company",
        location: extraction.data.data.location || "Not specified",
        jobUrl: urlQuery.trim(),
        description: extraction.data.data.description || "No description captured.",
        isFake: false,
      });
      setJobId(created.data._id);
      toast.success("Record opened");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not open a record for that URL");
    } finally {
      setStartingRecord(false);
    }
  }

  async function handleFile(file: File | null) {
    setEvFile(file);
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.upload.image(file);
      setEvValue(res.url);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      if (kind === "account") {
        if (!jobId) throw new Error("missing job");
        await api.jobs.addReview(jobId, { comment, stage, outcome, salaryQuoted: salary || undefined });
      } else if (kind === "evidence") {
        if (!jobId) throw new Error("missing job");
        if (!evValue.trim()) throw new Error("Add a link, text, or file first");
        await api.jobs.addEvidence(jobId, { type: evType, value: evValue.trim() });
      } else if (kind === "review") {
        if (!companyName.trim()) throw new Error("Name the company first");
        const company = await api.companies.resolveByName(companyName.trim());
        await api.companies.addReview(company.data._id, { comment });
      } else if (kind === "challenge") {
        if (!jobId) throw new Error("missing job");
        await api.reports.create({ targetType: "job", targetId: jobId, reason, description });
      }
      setDone(true);
      setStep(4);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  const questions = job ? computeQuestionStates({
    job, reports: [], log: [], contributorsCount: 0, trustScore: 0, repostCount: 0,
    repostSiblings: [], duplicateSiblings: [], companyStats: { listingsTracked: 0, openReports: 0, confirmedHires: 0, employerReplies: 0 },
  }) : [];

  const stepLabels = ["WHAT KIND", "WHAT HAPPENED", "REVIEW", "WHAT HAPPENS NEXT"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
      <div className="lg:border-r border-border-strong">
        <div className="flex items-center gap-3 px-4 md:px-8 py-3.5 border-b border-border bg-panel overflow-x-auto whitespace-nowrap">
          <Mono>{jobId ? `ADDING TO ${recordCode(jobId)}` : "NEW CONTRIBUTION"}</Mono>
          <span className="flex-1 flex items-center gap-2.5">
            {stepLabels.map((label, i) => (
              <span key={label} className={`flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] ${step >= i + 1 ? "text-ink" : "text-muted-foreground"}`}>
                <span className={`w-4 h-0.5 ${step >= i + 1 ? "bg-ink" : "bg-border-mid"}`} /> {i + 1} {label}
              </span>
            ))}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">STEP {step} OF 4</span>
        </div>

        {step === 1 && (
          <div className="px-4 md:px-8 py-8">
            <h1 className="text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.035em] font-bold max-w-[24ch]">What do you want to add?</h1>
            <p className="mt-3.5 font-serif text-[17px] leading-[1.6] text-muted max-w-[56ch]">
              These are handled differently and displayed differently. Pick the one that describes what you actually have.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(Object.keys(KIND_META) as Kind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`text-left p-4 border ${kind === k ? "border-ink bg-panel" : "border-border-mid bg-card hover:border-ink"}`}
                >
                  <div className="flex items-center gap-2"><span className="text-ink">{KIND_META[k].glyph}</span><Mono>{k === "review" ? "COMPANY ACCOUNT" : k.toUpperCase()}</Mono></div>
                  <div className="mt-2.5 text-[16px] font-semibold">{KIND_META[k].title}</div>
                  <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">{KIND_META[k].blurb}</p>
                </button>
              ))}
            </div>
            <div className="mt-6">
              <PrimaryButton onClick={() => setStep(2)}>Continue</PrimaryButton>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="px-4 md:px-8 py-8">
            {needsJobTarget ? (
              <>
                <h1 className="text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.035em] font-bold">Which listing is this about?</h1>
                <p className="mt-3 font-serif text-[16px] leading-[1.6] text-muted max-w-[56ch]">
                  Search for it, or paste the job URL to open a new record.
                </p>
                <div className="mt-5 flex gap-2">
                  <input
                    value={urlQuery}
                    onChange={(e) => setUrlQuery(e.target.value)}
                    placeholder="Job title, company, or a job URL"
                    className="flex-1 h-11 px-3.5 border border-border-strong bg-card text-[14px] outline-none"
                  />
                  <SecondaryButton onClick={findRecord} disabled={searching}>{searching ? "…" : "Search"}</SecondaryButton>
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-3.5 border border-border-mid">
                    {searchResults.map((j) => (
                      <button key={j._id} onClick={() => setJobId(j._id)} className="w-full text-left px-4 py-3 border-b border-border-soft last:border-b-0 hover:bg-panel">
                        <div className="text-[14.5px] font-semibold">{j.title}</div>
                        <div className="text-[12.5px] text-muted">{j.company} · {j.location}</div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-5 pt-5 border-t border-border-soft">
                  <p className="text-[13px] text-muted mb-2.5">Can&apos;t find it? Start a new record from the URL above.</p>
                  <SecondaryButton onClick={startNewRecord} disabled={startingRecord}>{startingRecord ? "Opening record…" : "Start this record"}</SecondaryButton>
                </div>
              </>
            ) : kind === "account" ? (
              <AccountStep {...{ comment, setComment, stage, setStage, outcome, setOutcome, salary, setSalary }} />
            ) : kind === "evidence" ? (
              <EvidenceStep {...{ evType, setEvType, evValue, setEvValue, uploading, onFile: handleFile }} />
            ) : kind === "review" ? (
              <ReviewStep {...{ companyName, setCompanyName, comment, setComment }} />
            ) : (
              <ChallengeStep {...{ reason, setReason, description, setDescription }} />
            )}
          </div>
        )}

        {step === 3 && (
          <div className="px-4 md:px-8 py-8">
            <h1 className="text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.035em] font-bold">Ready to publish?</h1>
            <p className="mt-3 font-serif text-[16px] leading-[1.6] text-muted max-w-[56ch]">
              Your contribution is attributed to your handle and stays editable. Nothing is published until you submit here.
            </p>
            <div className="mt-5 p-4 border border-border-mid bg-panel text-[13.5px] leading-[1.7]">
              <b>{KIND_META[kind].title}</b>
              {kind === "account" && comment && <p className="mt-1.5">&ldquo;{comment.slice(0, 200)}{comment.length > 200 ? "…" : ""}&rdquo;</p>}
              {kind === "evidence" && <p className="mt-1.5">{evType.toUpperCase()}: {evValue.slice(0, 120)}</p>}
              {kind === "review" && <p className="mt-1.5">On {companyName}: &ldquo;{comment.slice(0, 200)}&rdquo;</p>}
              {kind === "challenge" && <p className="mt-1.5">{reason}</p>}
            </div>
          </div>
        )}

        {step === 4 && done && (
          <div className="px-4 md:px-8 py-8">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-accent bg-panel-teal px-2.5 py-1.5">
              <span className="w-[5px] h-[5px] bg-accent" /> FILED
            </div>
            <h1 className="mt-4 text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.035em] font-bold max-w-[24ch]">Thank you — it&apos;s on the record.</h1>
            <p className="mt-3 font-serif text-[16px] leading-[1.6] text-muted max-w-[56ch]">
              {kind === "evidence"
                ? "A moderator will check it before it counts as verified. It is visible on the record either way, labelled as pending."
                : "It is published now, attributed to your handle. You can edit or withdraw it at any time."}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {jobId && <Link href={`/registry/${jobId}`}><PrimaryButton>See it on the record</PrimaryButton></Link>}
              <Link href="/profile"><SecondaryButton>Your contributions</SecondaryButton></Link>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="flex items-center gap-3.5 px-4 md:px-8 py-4 border-t border-border bg-panel">
            <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="text-[13.5px] text-ink-soft disabled:text-faintest">
              ← Back
            </button>
            <span className="ml-auto text-[12.5px] text-muted hidden sm:inline">Nothing is published until the review step is submitted.</span>
            {step === 2 ? (
              <PrimaryButton onClick={() => setStep(3)} disabled={needsJobTarget}>Continue</PrimaryButton>
            ) : (
              <PrimaryButton onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit to the record"}</PrimaryButton>
            )}
          </div>
        )}
      </div>

      {/* context rail */}
      <div className="px-4 md:px-8 py-7">
        <Mono>YOU ARE ADDING TO</Mono>
        {job ? (
          <Link href={`/registry/${job._id}`} className="mt-3.5 block p-4 border border-border-mid bg-card hover:border-ink !no-underline text-inherit">
            <div className="text-[15.5px] font-semibold">{job.title}</div>
            <div className="mt-1 text-[12.5px] text-muted">{job.company} · {recordCode(job._id)}</div>
            {questions.length > 0 && (
              <div className="mt-3 flex gap-1">
                {questions.map((q) => (
                  <span key={q.id} className={`flex-1 h-[3px] ${q.state === "open" ? "border-t-[3px] border-dotted border-faint" : q.state === "answered" ? "bg-accent" : "bg-amber"}`} />
                ))}
              </div>
            )}
          </Link>
        ) : (
          <p className="mt-3.5 text-[13.5px] text-muted">
            {kind === "review" ? "Company accounts don't need a specific listing." : "Search or start a record to attach this to."}
          </p>
        )}

        <div className="mt-6 pt-5 border-t border-border-soft">
          <Mono>HOW YOUR CONTRIBUTION IS TREATED</Mono>
          <div className="mt-3.5 flex flex-col gap-3.5">
            <TreatedItem title="Attributed, not anonymous" body="Published under your handle. Your real identity is never shown or shared." />
            <TreatedItem title="Labelled by what supports it" body="Accounts with checked documents are marked differently from accounts without." />
            <TreatedItem title="Editable and withdrawable" body="Edits and withdrawals are logged publicly, not silently erased." />
            <TreatedItem title="Disputable by anyone" body="Including the employer. A disputed account stays visible with the dispute attached." />
          </div>
        </div>
      </div>
    </div>
  );
}

function TreatedItem({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="text-[13.5px] font-semibold">{title}</div>
      <div className="mt-1 text-[12.5px] leading-[1.6] text-muted">{body}</div>
    </div>
  );
}

function AccountStep({ comment, setComment, stage, setStage, outcome, setOutcome, salary, setSalary }: {
  comment: string; setComment: (v: string) => void;
  stage?: ReviewStage; setStage: (v: ReviewStage | undefined) => void;
  outcome?: ReviewOutcome; setOutcome: (v: ReviewOutcome | undefined) => void;
  salary: string; setSalary: (v: string) => void;
}) {
  return (
    <>
      <h1 className="text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.035em] font-bold">What happened?</h1>
      <p className="mt-3 font-serif text-[16px] leading-[1.6] text-muted max-w-[56ch]">Dates matter more than adjectives. Write what you would tell a friend who was about to apply.</p>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={6}
        placeholder="Applied 12 May. Two rounds, second with the hiring manager on 19 May. Then nothing until…"
        className="mt-5 w-full border border-border-strong bg-card p-4 font-serif text-[16px] leading-[1.6] outline-none resize-none"
      />
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Picker label="WHAT STAGE DID YOU REACH" value={stage} onChange={setStage} options={[["applied", "Applied only"], ["interviewed", "Interviewed"], ["offered", "Offered"]]} />
        <Picker label="HOW DID IT END" value={outcome} onChange={setOutcome} options={[["no_response", "No answer at all"], ["on_hold", "Told it was on hold"], ["rejected", "Rejected"], ["hired", "Hired"]]} />
        <div>
          <Mono>QUOTED SALARY (OPTIONAL)</Mono>
          <input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. $150k–$170k" className="mt-2.5 w-full h-10 px-3 border border-border-mid text-[13.5px] outline-none" />
        </div>
      </div>
    </>
  );
}

function Picker<T extends string>({ label, value, onChange, options }: { label: string; value?: T; onChange: (v: T | undefined) => void; options: [T, string][] }) {
  return (
    <div>
      <Mono>{label}</Mono>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {options.map(([v, l]) => (
          <button
            key={v}
            onClick={() => onChange(value === v ? undefined : v)}
            className={`text-left text-[13.5px] px-2.5 py-2 border ${value === v ? "border-ink bg-panel" : "border-border-mid text-muted"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function EvidenceStep({ evType, setEvType, evValue, setEvValue, uploading, onFile }: {
  evType: "image" | "url" | "text"; setEvType: (v: "image" | "url" | "text") => void;
  evValue: string; setEvValue: (v: string) => void;
  uploading: boolean; onFile: (f: File | null) => void;
}) {
  return (
    <>
      <h1 className="text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.035em] font-bold max-w-[26ch]">Can you show any of it?</h1>
      <p className="mt-3 font-serif text-[16px] leading-[1.6] text-muted max-w-[56ch]">
        Redact your own details first — we do not do it for you. Evidence is checked before it counts as verified.
      </p>
      <div className="mt-5 flex gap-2">
        {(["url", "text", "image"] as const).map((t) => (
          <button key={t} onClick={() => setEvType(t)} className={`font-mono text-[10px] tracking-[0.08em] px-3 py-2 border ${evType === t ? "bg-ink text-background border-ink" : "border-border-mid text-ink-soft"}`}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      {evType === "image" ? (
        <div className="mt-4">
          <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="text-[13.5px]" />
          {uploading && <p className="mt-2 text-[12.5px] text-muted">Uploading…</p>}
          {evValue && !uploading && <p className="mt-2 text-[12.5px] text-accent">Uploaded.</p>}
        </div>
      ) : evType === "url" ? (
        <input value={evValue} onChange={(e) => setEvValue(e.target.value)} placeholder="https://…" className="mt-4 w-full h-11 px-3.5 border border-border-strong bg-card text-[14px] outline-none" />
      ) : (
        <textarea value={evValue} onChange={(e) => setEvValue(e.target.value)} rows={5} placeholder="Paste the text as submitted" className="mt-4 w-full border border-border-strong bg-card p-3.5 font-mono text-[13px] leading-[1.7] outline-none resize-none" />
      )}
    </>
  );
}

function ReviewStep({ companyName, setCompanyName, comment, setComment }: {
  companyName: string; setCompanyName: (v: string) => void; comment: string; setComment: (v: string) => void;
}) {
  return (
    <>
      <h1 className="text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.035em] font-bold">What is this employer like?</h1>
      <p className="mt-3 font-serif text-[16px] leading-[1.6] text-muted max-w-[56ch]">Attached to the company as a whole, not one listing.</p>
      <div className="mt-5">
        <Mono>COMPANY</Mono>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" className="mt-2.5 w-full h-11 px-3.5 border border-border-strong bg-card text-[14px] outline-none" />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={6}
        maxLength={2000}
        placeholder="Small, genuinely senior team… hiring stopped abruptly in April…"
        className="mt-4 w-full border border-border-strong bg-card p-4 font-serif text-[16px] leading-[1.6] outline-none resize-none"
      />
    </>
  );
}

function ChallengeStep({ reason, setReason, description, setDescription }: {
  reason: string; setReason: (v: string) => void; description: string; setDescription: (v: string) => void;
}) {
  return (
    <>
      <h1 className="text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.035em] font-bold">What is wrong here?</h1>
      <p className="mt-3 font-serif text-[16px] leading-[1.6] text-muted max-w-[56ch]">
        Goes to the moderation queue. A disputed item stays visible with the dispute attached — nothing is silently removed.
      </p>
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Short reason (e.g. duplicate text, wrong company)" className="mt-5 w-full h-11 px-3.5 border border-border-strong bg-card text-[14px] outline-none" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000} placeholder="Explain what you think is wrong and why" className="mt-3.5 w-full border border-border-strong bg-card p-3.5 text-[14px] leading-[1.6] outline-none resize-none" />
    </>
  );
}
