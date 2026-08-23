import { Evidence } from "../../types/user";
import { formatDateMono } from "../../lib/record";

const STATUS_META: Record<string, { label: string; tone: string }> = {
  verified: { label: "SENDER/SOURCE VERIFIED", tone: "text-accent" },
  pending: { label: "NOT YET CHECKED", tone: "text-muted-foreground" },
  unverifiable: { label: "COULD NOT BE VERIFIED", tone: "text-amber-ink" },
  redacted: { label: "REDACTED BY A MODERATOR", tone: "text-muted-foreground" },
};

export default function EvidenceCard({ evidence, index }: { evidence: Evidence; index: number }) {
  const meta = STATUS_META[evidence.status ?? "pending"];
  return (
    <div className="border border-border-mid">
      <div
        className="h-[140px] border-b border-border-mid flex items-end justify-between p-3"
        style={{
          background: "repeating-linear-gradient(135deg,#e6ede8 0 7px,#f2f6f3 7px 14px)",
        }}
      >
        <span className="font-mono text-[9.5px] tracking-[0.08em] text-[#8b978f] uppercase">
          {evidence.type === "image" ? "Screenshot" : evidence.type === "url" ? "Linked page" : "Text submission"}
        </span>
        <span className="font-mono text-[9px] bg-ink text-background px-1.5 py-0.5">E{index + 1}</span>
      </div>
      <div className="px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-1.5 bg-accent rotate-45 ${evidence.status === "verified" ? "" : "opacity-40"}`} />
          <span className={`font-mono text-[9.5px] tracking-[0.1em] ${meta.tone}`}>{meta.label}</span>
        </div>
        {evidence.type === "url" ? (
          <a href={evidence.value} target="_blank" rel="noopener noreferrer" className="mt-2 block text-[12.5px] text-accent break-all">
            {evidence.value}
          </a>
        ) : evidence.type === "text" ? (
          <p className="mt-2 font-mono text-[12px] leading-[1.6] text-ink-soft whitespace-pre-wrap break-words">{evidence.value}</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <a href={evidence.value} target="_blank" rel="noopener noreferrer" className="mt-2 block">
            <img src={evidence.value} alt="Submitted evidence" className="max-h-40 w-full object-cover border border-border-soft" />
          </a>
        )}
        {evidence.note && <p className="mt-2.5 text-[12.5px] leading-[1.6] text-muted">{evidence.note}</p>}
        <div className="mt-2.5 font-mono text-[9.5px] text-faint">
          {evidence.addedBy ? `Added by ${evidence.addedBy}` : "Submitter withheld"}
          {evidence.addedAt ? ` · ${formatDateMono(evidence.addedAt)}` : ""}
        </div>
      </div>
    </div>
  );
}
