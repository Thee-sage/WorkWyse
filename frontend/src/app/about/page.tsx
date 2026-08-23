"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mono } from "../../components/ui/primitives";

type Section = "what" | "states" | "moderation" | "not";

const SECTIONS: Array<{ key: Section; label: string }> = [
  { key: "what", label: "What a record is" },
  { key: "states", label: "What the states mean" },
  { key: "moderation", label: "How moderation works" },
  { key: "not", label: "What we do not know" },
];

export default function AboutPage() {
  return (
    <Suspense fallback={null}>
      <AboutContent />
    </Suspense>
  );
}

function AboutContent() {
  const params = useSearchParams();
  const [section, setSection] = useState<Section>("what");

  useEffect(() => {
    const s = params.get("section") as Section | null;
    if (s && SECTIONS.some((x) => x.key === s)) setSection(s);
  }, [params]);

  return (
    <div>
      <div className="px-4 md:px-8 py-12 md:py-14 border-b border-border-strong">
        <div className="max-w-[74ch]">
          <Mono>HOW THIS WORKS</Mono>
          <h1 className="mt-5 text-[32px] md:text-[48px] leading-[1.04] tracking-[-0.04em] font-bold max-w-[24ch] text-pretty">
            A record of what people can show, and who checked it.
          </h1>
          <p className="mt-6 font-serif text-[18px] md:text-[22px] leading-[1.5] text-ink-soft max-w-[56ch]">
            WorkWyse is not a verification service and not a review site. It is a public record. Anyone can add to it,
            everything is attributed, and the gaps are marked as gaps.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr]">
        <div className="hidden lg:block border-r border-border-strong">
          <div className="sticky top-[95px] px-5 py-6 flex flex-col">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`text-left py-2.5 pl-3 text-[14px] font-semibold border-l-2 ${
                  section === s.key ? "text-ink border-accent" : "text-muted border-transparent hover:text-ink-soft"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex lg:hidden items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`font-mono text-[10px] tracking-[0.08em] px-3 py-2 border whitespace-nowrap ${section === s.key ? "bg-ink text-background border-ink" : "border-border-mid text-ink-soft"}`}
            >
              {s.label.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="px-4 md:px-8 py-9 md:py-11">
          {section === "what" && <WhatSection />}
          {section === "states" && <StatesSection />}
          {section === "moderation" && <ModerationSection />}
          {section === "not" && <NotSection />}
        </div>
      </div>
    </div>
  );
}

function WhatSection() {
  const items = [
    { label: "A CLAIM", body: "Something a person says happened, or something the listing asserts. Published as stated, attributed, never presented as fact." },
    { label: "EVIDENCE", body: "A document or link that supports or contradicts a claim. Stays attached to the claim it concerns, with its check status visible." },
    { label: "AN AUTOMATED CHECK", body: "Machine output about the page itself — whether it responds, whether the text appears elsewhere, when it changed. Never a judgement." },
    { label: "CONSENSUS", body: "What contributors voted, shown raw with its sample size. The cheapest signal here, and weighted accordingly." },
    { label: "A MODERATOR DECISION", body: "A judgement about a document, never about a job. Published with its reasoning and appealable by anyone it affects." },
    { label: "AN EMPLOYER RESPONSE", body: "Published unedited, above the reports it answers. Employers are invited whenever evidence is accepted against a listing of theirs." },
  ];
  return (
    <div className="max-w-[76ch]">
      <h2 className="text-[28px] font-bold tracking-[-0.03em]">What a record is</h2>
      <p className="mt-4 font-serif text-[19px] leading-[1.7] text-ink-soft">
        A record starts when someone pastes a job URL. From that moment two things happen: we begin checking the page
        automatically, and anyone who has dealt with that listing can file what happened to them.
      </p>
      <p className="mt-4 font-serif text-[19px] leading-[1.7] text-ink-soft">
        Everything filed is sorted under the seven questions a job seeker actually asks. A record is not a verdict
        page — it is those seven questions with whatever answers exist, and the honest blanks where none do.
      </p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 border-t border-border-strong">
        {items.map((it, i) => (
          <div key={it.label} className={`py-5 ${i % 2 === 0 ? "sm:pr-7 sm:border-r border-border" : "sm:pl-7"} ${i >= 2 ? "border-t border-border-soft" : ""}`}>
            <Mono>{it.label}</Mono>
            <p className="mt-2.5 text-[15px] leading-[1.65]">{it.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatesSection() {
  const rows = [
    { dot: "bg-accent", label: "ANSWERED", ink: "text-accent", title: "Answered from evidence", body: "At least one checked document, or an automated check that settles it. You still need to decide what the answer means for you — but the answer itself is not in dispute." },
    { dot: "bg-amber", label: "PARTLY", ink: "text-amber-ink", title: "Partly answered", body: "Something is known and something is missing. Usually one account without corroboration, or a fact that answers half the question." },
    { dot: "border-[1.5px] border-faint", label: "OPEN", ink: "text-muted-foreground", title: "Nothing on record", body: "Nobody has answered it. We do not estimate, infer, or fill it with a similar record's data. A page with three of these is telling you something real about how little is known." },
  ];
  return (
    <div className="max-w-[76ch]">
      <h2 className="text-[28px] font-bold tracking-[-0.03em]">What the states mean</h2>
      <p className="mt-4 font-serif text-[19px] leading-[1.7] text-ink-soft">
        Each of the seven questions carries one of three states. They describe how much is on record — not how good
        or bad the job is.
      </p>
      <div className="mt-7 flex flex-col border-t border-border-strong">
        {rows.map((r, i) => (
          <div key={r.label} className={`grid grid-cols-1 sm:grid-cols-[200px_1fr] py-5 ${i > 0 ? "border-t border-border-soft" : ""}`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${r.dot}`} />
              <span className={`font-mono text-[10px] tracking-[0.14em] uppercase ${r.ink}`}>{r.label}</span>
            </div>
            <div className="mt-2 sm:mt-0">
              <div className="text-[16px] font-semibold">{r.title}</div>
              <p className="mt-1.5 text-[14.5px] leading-[1.65]">{r.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 max-w-[66ch]">
        <h3 className="text-[19px] font-bold tracking-[-0.02em]">And the number?</h3>
        <p className="mt-3 font-serif text-[18px] leading-[1.7] text-ink-soft">
          There is one, and it is deliberately hard to find. It is a weighted summary of the seven answers, it moves
          several points when one person contributes to a thin record, and it is never shown as a headline. If a
          score is doing more work in your decision than the accounts on the page, we have designed the page badly.
        </p>
      </div>
    </div>
  );
}

function ModerationSection() {
  return (
    <div className="max-w-[76ch]">
      <h2 className="text-[28px] font-bold tracking-[-0.03em]">How moderation works</h2>
      <p className="mt-4 font-serif text-[19px] leading-[1.7] text-ink-soft">
        Moderators check documents. That is the whole job. They confirm a file is what it claims to be, they redact
        people who did not choose to be here, and they publish their reasoning. They are explicitly forbidden from
        stating whether a listing is genuine.
      </p>
      <div className="mt-7 flex flex-col border-t border-border-strong">
        <Row label="THEY DO" body="Verify sender domains and archive timestamps · redact third parties · withhold files that endanger someone · rule on disputes about evidence · publish every decision with a note" />
        <Row label="THEY DO NOT" body="Decide whether a job is real · rank employers · remove accounts for being unflattering · edit anyone's words · delete a record because a company asked" />
        <Row label="IF THEY GET IT WRONG" body="Anyone affected can appeal, including the employer. Appeals are heard by a different moderator, and both the original decision and the outcome stay in the public activity log." />
      </div>
      <div className="mt-7 p-5 bg-panel max-w-[76ch]">
        <Mono>WHY THE MODERATION WORKSPACE LOOKS LIKE THIS SITE</Mono>
        <p className="mt-2.5 font-serif text-[17px] leading-[1.65]">
          Moderators see the same record you do, with the same states and the same wording. Nothing is hidden behind
          an internal view with different language — the only difference is the queue and the decision controls.
        </p>
      </div>
    </div>
  );
}

function Row({ label, body }: { label: string; body: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] py-[18px] border-t border-border-soft first:border-t-0">
      <Mono>{label}</Mono>
      <span className="mt-1.5 sm:mt-0 text-[15px] leading-[1.7]">{body}</span>
    </div>
  );
}

function NotSection() {
  const items = [
    { title: "We cannot tell you a listing is fake.", body: "A dead page, six reposts, and two people who heard nothing are facts. They are consistent with a ghost job and equally consistent with a hiring freeze nobody cleaned up after. We publish the facts and refuse the inference." },
    { title: "We cannot tell you an employer is dishonest.", body: "Most companies never engage with us, and silence is not an admission. A company profile here describes our record, which is a description of who chose to file — not of the organisation." },
    { title: "Our sample is not representative.", body: "People who are hired rarely come back to say so. People who are ghosted sometimes do. Every count on this platform tilts that way, which is why we show sample sizes everywhere and label thin records as thin." },
    { title: "Verified does not mean true.", body: "It means a document came from where it says it came from. A real email can still contain a misleading statement, and we have no way to know which." },
  ];
  return (
    <div className="max-w-[70ch]">
      <h2 className="text-[28px] font-bold tracking-[-0.03em]">What we do not know</h2>
      <p className="mt-4 font-serif text-[19px] leading-[1.7] text-ink-soft">
        This is the most important page on the site, and it is the one we get asked to soften most often.
      </p>
      <div className="mt-7 flex flex-col gap-6">
        {items.map((it) => (
          <div key={it.title} className="pl-4 border-l-[3px] border-ink">
            <div className="text-[17px] font-semibold">{it.title}</div>
            <p className="mt-2 font-serif text-[17.5px] leading-[1.65] text-ink-soft">{it.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-9 p-6 bg-ink text-background">
        <p className="font-serif text-[20px] leading-[1.55]">
          If you want a platform that tells you which jobs are fake, we are not it, and we would be lying if we
          tried. What we can do is make sure that by the time you decide, you know what everyone else has found.
        </p>
      </div>
    </div>
  );
}
