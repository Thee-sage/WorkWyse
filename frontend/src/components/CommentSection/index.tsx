"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { MessageSquare, Send, Trash2, ChevronDown } from "lucide-react";
import { useAuth } from "../AuthContext";
import { api } from "../../lib/api";

interface Comment {
  _id: string;
  authorUsername: string;
  body: string;
  createdAt: string;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ username }: { username: string }) {
  const initial = username?.[0]?.toUpperCase() ?? "?";
  const hue = (username.charCodeAt(0) * 37) % 360;
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: `hsl(${hue}, 60%, 45%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

interface CommentSectionProps {
  jobId: string;
}

export default function CommentSection({ jobId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async (p: number) => {
    try {
      setLoading(true);
      const res = await api.get<any>(`/jobs/${jobId}/comments?page=${p}&limit=10`);
      if (p === 1) {
        setComments((res as any).data ?? []);
      } else {
        setComments((prev) => [...prev, ...((res as any).data ?? [])]);
      }
      setTotalPages((res as any).pagination?.totalPages ?? 1);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchComments(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<Comment>(`/jobs/${jobId}/comments`, { body: draft.trim() });
      const newComment = (res as any).data as Comment;
      setComments((prev) => [newComment, ...prev]);
      setDraft("");
    } catch (e: any) {
      setError(e.message ?? "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await api.delete(`/jobs/${jobId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (e: any) {
      setError(e.message ?? "Failed to delete comment");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <MessageSquare size={18} color="#7c3aed" />
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#fff" }}>
          Discussion
        </h3>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>({comments.length})</span>
      </div>

      {/* Compose */}
      {user ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: 28 }}>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              padding: 16,
              transition: "border-color 0.2s",
            }}
            onFocus={() => {}}
          >
            <div style={{ display: "flex", gap: 12 }}>
              <Avatar username={user.username} />
              <textarea
                ref={textareaRef}
                id="comment-compose"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                placeholder="Share your thoughts or experience with this job report…"
                maxLength={2000}
                rows={3}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: 14,
                  resize: "none",
                  lineHeight: 1.6,
                  fontFamily: "inherit",
                  minHeight: 72,
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                {draft.length}/2000
              </span>
              <button
                type="submit"
                disabled={!draft.trim() || submitting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: draft.trim() ? "#7c3aed" : "rgba(124,58,237,0.25)",
                  border: "none",
                  borderRadius: 9,
                  padding: "8px 18px",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: draft.trim() ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                }}
              >
                <Send size={14} />
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
          {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{error}</p>}
        </form>
      ) : (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>
          <a href="/login" style={{ color: "#7c3aed" }}>Log in</a> to join the discussion.
        </p>
      )}

      {/* Comments List */}
      {loading && comments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
        </div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.3)" }}>
          <MessageSquare size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Be the first to comment</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {comments.map((c, i) => (
            <div
              key={c._id}
              style={{
                display: "flex",
                gap: 12,
                animation: "fadeUp 0.3s ease",
                animationDelay: `${i * 0.05}s`,
                animationFillMode: "both",
              }}
            >
              <Avatar username={c.authorUsername} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>{c.authorUsername}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{timeAgo(c.createdAt)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, wordBreak: "break-word" }}>
                  {c.body}
                </p>
              </div>
              {user && (user.username === c.authorUsername || user.role === "admin") && (
                <button
                  onClick={() => handleDelete(c._id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", flexShrink: 0, padding: "2px 4px", marginTop: 2 }}
                  title="Delete comment"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {page < totalPages && (
        <button
          onClick={loadMore}
          disabled={loading}
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "8px 16px",
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <ChevronDown size={14} />
          Load more comments
        </button>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
