import Link from "next/link";
import { Job } from "../../types/user";
import { quickRecordLabel, recordCode } from "../../lib/record";
import { Glyph, stateInk } from "../ui/primitives";

export default function RecordCard({ job }: { job: Job }) {
  const { label, tone } = quickRecordLabel(job);
  const doubts = job.downvotes;
  const totalVotes = job.upvotes + job.downvotes;
  const contributorsCount = job.reviews.length + (job.evidence?.length ?? 0);

  return (
    <Link
      href={`/registry/${job._id}`}
      className="block px-6 py-6 border-r border-border last:border-r-0 hover:bg-panel transition-colors !no-underline"
    >
      <div className="flex items-center gap-2.5">
        <span className={`font-mono text-[9.5px] tracking-[0.12em] ${stateInk(tone)}`}>{label.toUpperCase()}</span>
        <span className="ml-auto font-mono text-[9.5px] text-faint">{recordCode(job._id)}</span>
      </div>
      <div className="mt-3 text-[19px] font-semibold leading-[1.25] tracking-[-0.015em] text-ink">{job.title}</div>
      <div className="mt-1.5 text-[13px] text-muted">
        {job.company} · {job.location}
      </div>
      <p className="mt-3.5 font-serif text-[16px] leading-[1.55] text-ink-soft line-clamp-3">
        {job.description}
      </p>
      <div className="mt-4 flex items-center gap-3.5 font-mono text-[9.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Glyph kind="account" /> {job.reviews.length}
        </span>
        <span className="flex items-center gap-1.5">
          <Glyph kind="evidence" /> {job.evidence?.length ?? 0}
        </span>
        {totalVotes > 0 && (
          <span className="flex items-center gap-1.5">
            <Glyph kind="vote" /> {doubts} of {totalVotes} doubt it
          </span>
        )}
        <span className="ml-auto">{contributorsCount || 1} CONTRIBUTOR{contributorsCount === 1 ? "" : "S"}</span>
      </div>
    </Link>
  );
}
