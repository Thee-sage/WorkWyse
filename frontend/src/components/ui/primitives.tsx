"use client";
import React from "react";

/** Small uppercase mono label — used everywhere as a section eyebrow / meta tag. */
export function Mono({
  children,
  className = "",
  tone = "muted",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "muted" | "faint" | "ink" | "accent" | "amber";
}) {
  const toneClass = {
    muted: "text-muted",
    faint: "text-faint",
    ink: "text-ink",
    accent: "text-accent",
    amber: "text-amber-ink",
  }[tone];
  return (
    <span className={`font-mono text-[10px] tracking-[0.14em] uppercase ${toneClass} ${className}`}>
      {children}
    </span>
  );
}

type RecordState = "answered" | "partly" | "open";

/** The dot/square/diamond/dash legend used throughout to mark what kind of thing something is. */
export function Glyph({
  kind,
  className = "",
}: {
  kind: "account" | "evidence" | "moderation" | "vote" | "open" | "automated";
  className?: string;
}) {
  switch (kind) {
    case "account":
      return <span className={`inline-block w-[7px] h-[7px] rounded-full bg-ink ${className}`} />;
    case "automated":
      return <span className={`inline-block w-[7px] h-[7px] bg-ink ${className}`} />;
    case "evidence":
      return <span className={`inline-block w-[8px] h-[6px] bg-accent rotate-45 ${className}`} />;
    case "vote":
      return <span className={`inline-block w-[11px] h-[4px] bg-ink ${className}`} />;
    case "moderation":
      return <span className={`inline-block w-[8px] h-[6px] bg-accent rotate-45 ${className}`} />;
    case "open":
      return <span className={`inline-block w-[7px] h-[7px] rounded-full border-[1.5px] border-faint ${className}`} />;
  }
}

/** State dot for the three record states: answered (teal) / partly (amber) / open (hollow). */
export function StateDot({ state, className = "" }: { state: RecordState; className?: string }) {
  if (state === "answered") return <span className={`inline-block w-[9px] h-[9px] rounded-full bg-accent ${className}`} />;
  if (state === "partly") return <span className={`inline-block w-[9px] h-[9px] rounded-full bg-amber ${className}`} />;
  return <span className={`inline-block w-[9px] h-[9px] rounded-full border-[1.5px] border-faint ${className}`} />;
}

export function stateLabel(state: RecordState): string {
  if (state === "answered") return "Answered from evidence";
  if (state === "partly") return "Partly answered";
  return "Nothing on record";
}

export function stateInk(state: RecordState): string {
  if (state === "answered") return "text-accent";
  if (state === "partly") return "text-amber-ink";
  return "text-muted-foreground";
}

/** Bordered panel — the workhorse container used across every screen. */
export function Panel({
  children,
  className = "",
  header,
}: {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
}) {
  return (
    <div className={`border border-border-strong bg-card ${className}`}>
      {header && (
        <div className="px-3.5 py-2.5 border-b border-border-strong">
          <Mono tone="ink" className="tracking-[0.14em]">{header}</Mono>
        </div>
      )}
      {children}
    </div>
  );
}

/** A label/value row inside a Panel — used for every "accumulated record" stat list. */
export function StatRow({
  label,
  value,
  valueClassName = "",
  last = false,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-3.5 py-2.5 text-[13.5px] ${last ? "" : "border-b border-border-soft"}`}>
      <span className="text-muted">{label}</span>
      <span className={`font-mono font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

/** Chip-style filter/toggle button, active = filled ink. */
export function Chip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[10px] tracking-[0.08em] px-3 py-2 border transition-colors ${
        active ? "border-ink bg-ink text-background" : "border-border-mid bg-transparent text-ink-soft hover:border-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Underline tab strip — Company / Profile / About all use this shape. */
export function Tab({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-semibold px-0 mr-5 py-3.5 border-b-2 transition-colors ${
        active ? "text-ink border-accent" : "text-muted-foreground border-transparent hover:text-ink"
      }`}
    >
      {children} {count !== undefined && <span className="font-mono text-[11px] text-faint">{count}</span>}
    </button>
  );
}

/** Primary black CTA button used across the whole site. */
export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`text-[13.5px] font-semibold bg-ink text-background px-[18px] py-3 hover:bg-ink-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

/** Secondary outline button. */
export function SecondaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`text-[13.5px] font-semibold border border-border-mid text-ink-soft px-[18px] py-3 hover:border-ink hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
