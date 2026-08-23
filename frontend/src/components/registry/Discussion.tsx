"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../AuthContext";
import { useToast } from "../ui/Toast";
import { Comment } from "../../types/user";
import { initials, timeAgo } from "../../lib/record";
import { Mono, PrimaryButton } from "../ui/primitives";

/**
 * General discussion thread on a record — distinct from first-hand accounts
 * (Q1/Q3) and evidence. Preserves the original app's comment feature.
 */
export default function Discussion({ jobId }: { jobId: string }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api.comments.list(jobId).then((r) => setComments(r.data)).catch(() => {});
  }, [jobId]);

  async function submit() {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const res = await api.comments.create(jobId, body.trim());
      setComments((prev) => [res.data, ...prev]);
      setBody("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not post comment");
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.comments.delete(jobId, id);
      setComments((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove comment");
    }
  }

  return (
    <div className="border-t border-border-strong px-4 md:px-8 py-8">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-xl font-bold tracking-[-0.02em]">Discussion</h2>
        <Mono>{comments.length} COMMENT{comments.length === 1 ? "" : "S"}</Mono>
      </div>
      <p className="text-[13px] text-muted mb-5 max-w-[64ch]">
        General discussion about this record — separate from first-hand accounts, which carry more weight because
        they describe something that happened to the person filing them.
      </p>

      {isAuthenticated && (
        <div className="mb-6 border border-border-mid bg-card">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            maxLength={2000}
            className="w-full p-3.5 text-[14.5px] outline-none resize-none bg-transparent"
          />
          <div className="flex items-center justify-end gap-3 px-3.5 py-2.5 border-t border-border-soft">
            <PrimaryButton onClick={submit} disabled={posting || !body.trim()} className="!px-4 !py-2 !text-[12.5px]">
              {posting ? "Posting…" : "Post comment"}
            </PrimaryButton>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {comments.map((c) => (
          <div key={c._id} className="flex gap-3">
            <span className="w-7 h-7 rounded-full bg-panel font-mono text-[10px] flex items-center justify-center text-muted shrink-0">
              {initials(c.authorUsername)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13.5px] font-semibold">{c.authorUsername}</span>
                <span className="font-mono text-[10px] text-faint">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="mt-1 text-[14px] leading-[1.6] text-ink-soft break-words">{c.body}</p>
              <button onClick={() => remove(c._id)} className="mt-1 text-[11.5px] text-faint hover:text-destructive">
                Remove
              </button>
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-[13px] text-muted">No comments yet.</p>}
      </div>
    </div>
  );
}
