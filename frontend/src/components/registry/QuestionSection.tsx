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

  return (
    <div id={id} className={`border-b border-border-strong ${invert ? "bg-ink text-background" : ""}`}>
      <div
        onClick={onToggle}
        className={`grid grid-cols-[64px_1fr] sm:grid-cols-[96px_1fr] ${clickable ? "cursor-pointer hover:bg-panel" : ""} ${invert && clickable ? "hover:bg-ink-soft" : ""}`}
      >
        <div className="pt-7 pl-4 sm:pl-8">
          <div className={`font-mono text-[11px] tracking-[0.1em] ${invert ? "text-faint" : "text-faint"}`}>Q{n}</div>
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
          {clickable && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
              className="mt-4 font-mono text-[10px] tracking-[0.08em] text-accent border-b border-border-mid pb-0.5"
            >
              {toggleLabel ?? (open ? "Hide the detail" : "See the detail")}
            </button>
          )}
        </div>
      </div>
      {open && children && (
        <div className="grid grid-cols-[64px_1fr] sm:grid-cols-[96px_1fr] border-t border-border-soft bg-card text-ink">
          <div className="hidden sm:block border-r border-border-soft" />
          <div className="pl-4 sm:pl-7 pr-4 sm:pr-10 py-6">{children}</div>
        </div>
      )}
    </div>
  );
}
