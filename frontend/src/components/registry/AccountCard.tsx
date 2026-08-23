import { Review } from "../../types/user";
import { formatDateMono, initials, OUTCOME_LABEL, STAGE_LABEL } from "../../lib/record";

export default function AccountCard({
  review,
  onDelete,
  canDelete,
}: {
  review: Review;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  return (
    <div className="border border-border-mid">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border-soft bg-panel-teal-soft flex-wrap">
        <span className="w-[7px] h-[7px] rounded-full bg-ink shrink-0" />
        <span className="font-mono text-[10px] tracking-[0.1em]">FIRST-HAND ACCOUNT</span>
        {review.stage && <span className="font-mono text-[9.5px] text-muted">{STAGE_LABEL[review.stage]}</span>}
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{formatDateMono(review.createdAt)}</span>
      </div>
      <div className="px-4 sm:px-5 py-4 sm:py-5">
        <p className="m-0 font-serif text-[17px] sm:text-[19px] leading-[1.58] max-w-[52ch]">&ldquo;{review.comment}&rdquo;</p>
        <div className="mt-4 flex items-center gap-2.5 flex-wrap">
          <span className="w-6 h-6 rounded-full bg-panel font-mono text-[10px] flex items-center justify-center text-muted">
            {initials(review.author)}
          </span>
          <span className="text-[13.5px] font-semibold">{review.author}</span>
          {review.outcome && (
            <span className="font-mono text-[9.5px] tracking-[0.08em] bg-panel-teal text-accent px-1.5 py-0.5">
              {OUTCOME_LABEL[review.outcome].toUpperCase()}
            </span>
          )}
          {review.salaryQuoted && (
            <span className="font-mono text-[9.5px] tracking-[0.08em] border border-border-mid text-muted px-1.5 py-0.5">
              QUOTED {review.salaryQuoted}
            </span>
          )}
          {canDelete && (
            <button onClick={onDelete} className="ml-auto text-[12px] text-muted-foreground hover:text-destructive">
              Withdraw
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
