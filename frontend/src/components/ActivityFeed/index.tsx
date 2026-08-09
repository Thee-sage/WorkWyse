"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Briefcase, Trash2, ThumbsUp, Star, Flag,
  MessageSquare, Shield, UserCheck, ChevronDown
} from "lucide-react";

interface ActivityEntry {
  _id: string;
  actorUsername: string;
  action: string;
  targetType: string;
  meta?: Record<string, unknown>;
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

const ACTION_META: Record<string, { label: string; icon: any; color: string }> = {
  job_created:      { label: "submitted a job report",    icon: Briefcase,    color: "#7c3aed" },
  job_updated:      { label: "updated a job report",      icon: Briefcase,    color: "#6366f1" },
  job_deleted:      { label: "deleted a job report",      icon: Trash2,       color: "#f87171" },
  review_added:     { label: "left a review",             icon: Star,         color: "#f59e0b" },
  review_deleted:   { label: "deleted a review",          icon: Trash2,       color: "#f87171" },
  vote_cast:        { label: "voted",                     icon: ThumbsUp,     color: "#10b981" },
  vote_removed:     { label: "removed a vote",            icon: ThumbsUp,     color: "#6b7280" },
  report_submitted: { label: "submitted a report",        icon: Flag,         color: "#ef4444" },
  report_reviewed:  { label: "reviewed a report",         icon: Shield,       color: "#10b981" },
  report_dismissed: { label: "dismissed a report",        icon: Shield,       color: "#6b7280" },
  comment_added:    { label: "left a comment",            icon: MessageSquare,color: "#ec4899" },
  comment_deleted:  { label: "deleted a comment",         icon: Trash2,       color: "#f87171" },
  role_changed:     { label: "changed a user role",       icon: UserCheck,    color: "#06b6d4" },
};

interface ActivityFeedProps {
  targetType: "job" | "company" | "report" | "user";
  targetId: string;
}

export default function ActivityFeed({ targetType, targetId }: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchActivity = useCallback(async (p: number) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/activity/${targetType}/${targetId}?page=${p}&limit=10`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const json = await res.json();
      if (p === 1) {
        setEntries(json.data ?? []);
      } else {
        setEntries((prev) => [...prev, ...(json.data ?? [])]);
      }
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    setPage(1);
    setEntries([]);
    fetchActivity(1);
  }, [fetchActivity]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchActivity(next);
  };

  if (loading && entries.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
      </div>
    );
  }

  if (!loading && entries.length === 0) {
    return (
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "16px 0" }}>
        No activity recorded yet.
      </p>
    );
  }

  return (
    <div>
      <div style={{ position: "relative", paddingLeft: 24 }}>
        {/* Vertical line */}
        <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.06)", borderRadius: 99 }} />

        {entries.map((e, i) => {
          const meta = ACTION_META[e.action] ?? { label: e.action, icon: Briefcase, color: "#6b7280" };
          const Icon = meta.icon;
          return (
            <div
              key={e._id}
              style={{
                display: "flex",
                gap: 14,
                marginBottom: i < entries.length - 1 ? 20 : 0,
                animation: "fadeUp 0.3s ease",
                animationDelay: `${i * 0.04}s`,
                animationFillMode: "both",
              }}
            >
              {/* Icon dot */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: `${meta.color}22`,
                  border: `2px solid ${meta.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Icon size={11} color={meta.color} />
              </div>

              <div>
                <p style={{ margin: 0, fontSize: 13.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                  <strong style={{ color: "#fff", fontWeight: 600 }}>{e.actorUsername}</strong>{" "}
                  {meta.label}
                  {e.action === "vote_cast" && e.meta?.voteType != null && (
                    <span style={{ color: "rgba(255,255,255,0.4)" }}> ({String(e.meta.voteType as string)})</span>
                  )}
                  {e.action === "review_added" && e.meta?.rating != null && (
                    <span style={{ color: "#f59e0b" }}> ★{String(e.meta.rating as number)}</span>
                  )}
                </p>
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)" }}>{timeAgo(e.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

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
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "8px 16px",
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <ChevronDown size={14} />
          Load more
        </button>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
