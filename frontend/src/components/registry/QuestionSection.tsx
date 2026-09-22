"use client";
import { ReactNode } from "react";
import { RecordState } from "../../lib/record";
import { Mono, stateInk, stateLabel } from "../ui/primitives";

export default function QuestionSection({
  id,
  n,
  title,
  state,
  summary,
  open,
  onToggle,
  invert = false,
  children,
  toggleLabel,
}: {
  id: string;
  n: number;
  title: string;
  state: RecordState;
  summary: ReactNode;
  open: boolean;
  onToggle?: () => void;
  invert?: boolean;
  children?: ReactNode;
  toggleLabel?: string;
}) {
  const barColor = state === "answered" ? "bg-accent" : state === "partly" ? "bg-amber" : "";
  const clickable = !!onToggle && !!children;
  const panelId = `${id}-detail`;

  return (
    <div id={id} className={`border-b border-border-strong ${invert ? "bg-ink text-background" : ""}`}>
      {/*
        The row keeps its plain-div onClick as a convenience for mouse users;
        the real control is the button at the bottom of the row, which is what
        keyboard and screen-reader users reach. Deliberately not wrapping the
        whole row in a <button>: the <h2> has to stay outside it, because the
        seven questions are how a screen-reader user navigates this page and
        headings nested inside a button drop out of that outline.
      */}
      <div
        onClick={onToggle}
        className={`group grid grid-cols-[64px_1fr] sm:grid-cols-[96px_1fr] transition-colors ${
          clickable ? (invert ? "cursor-pointer hover:bg-ink-soft" : "cursor-pointer hover:bg-panel") : ""
        }`}
      >
        <div className="pt-7 pl-4 sm:pl-8">
          <div className="font-mono text-[11px] tracking-[0.1em] text-faint">Q{n}</div>
          <div className={`mt-2.5 w-[38px] ${state === "open" ? "border-t-[3px] border-dotted border-faint h-0" : `h-[3px] ${barColor}`}`} />
        </div>
        <div className="pt-7 pr-4 sm:pr-10 pb-7">
          <div className="flex items-start gap-3 sm:gap-5 flex-wrap">
            <h2 className="m-0 text-[24px] sm:text-[32px] leading-[1.12] tracking-[-0.03em] font-bold max-w-[20ch]">
              {title}
            </h2>
            <span className={`ml-auto font-mono text-[10px] tracking-[0.12em] whitespace-nowrap pt-1.5 sm:pt-2 ${invert ? "text-faint" : stateInk(state)}`}>
              {stateLabel(state).toUpperCase()}
            </span>
          </div>
          <div className={`mt-4 font-serif text-[18px] sm:text-[22px] leading-[1.5] max-w-[50ch] ${invert ? "text-border-mid" : ""}`}>
            {summary}
          </div>
          {clickable ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
              aria-expanded={open}
              aria-controls={panelId}
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-accent border-b border-border-mid pb-0.5 group-hover:border-accent transition-colors"
            >
              {toggleLabel ?? (open ? "Hide the detail" : "See the detail")}
              {/* The chevron is the affordance the row was missing: the text
                  link alone did not read as "this section opens", and it sits
                  far below the heading that people actually click. */}
              <svg
                width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true"
                className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
              >
                <path d="M1.5 3.5 5 7l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            /* Q4 has no detail to open. Without this it looked identical to a
               collapsed section that simply refused to respond when clicked;
               saying so is one line and removes the dead-control feeling. */
            <Mono className="mt-4 block" tone="faint">
              NOTHING FILED TO SHOW HERE YET
            </Mono>
          )}
        </div>
      </div>
      {open && children && (
        <div id={panelId} className="grid grid-cols-[64px_1fr] sm:grid-cols-[96px_1fr] border-t border-border-soft bg-card text-ink">
          <div className="hidden sm:block border-r border-border-soft" />
          <div className="pl-4 sm:pl-7 pr-4 sm:pr-10 py-6">{children}</div>
        </div>
      )}
    </div>
  );
}
