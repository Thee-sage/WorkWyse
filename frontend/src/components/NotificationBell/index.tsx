"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { useAuth } from "../AuthContext";
import { api } from "../../lib/api";

interface Notification {
  _id: string;
  type: string;
  message: string;
  link?: string;
  read: boolean;
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

const TYPE_COLORS: Record<string, string> = {
  job_created: "#7c3aed",
  report_reviewed: "#10b981",
  evidence_uploaded: "#3b82f6",
  vote_received: "#f59e0b",
  comment_added: "#ec4899",
  role_changed: "#06b6d4",
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<{ data: Notification[]; unreadCount: number }>("/notifications?limit=10");
      const data = res as any;
      setNotifications(data.data ?? []);
      setUnread(data.pagination ? data.data.filter((n: Notification) => !n.read).length : 0);
      // Fetch unread count separately
      const countRes = await api.get<{ unreadCount: number }>("/notifications/unread-count");
      setUnread(countRes.data.unreadCount);
    } catch {
      /* silent */
    }
  }, [user]);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = async () => {
    setOpen((v) => !v);
    if (!open) {
      // Fetch fresh data
      try {
        const res = await api.get<any>("/notifications?limit=20");
        setNotifications((res as any).data ?? []);
      } catch { /* silent */ }
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((ns) => ns.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnread((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  const deleteNotif = async (id: string, wasRead: boolean) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((ns) => ns.filter((n) => n._id !== id));
      if (!wasRead) setUnread((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  if (!user) return null;

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={handleOpen}
        style={{
          position: "relative",
          background: open ? "rgba(124,58,237,0.15)" : "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "rgba(255,255,255,0.7)",
          transition: "all 0.2s",
        }}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#7c3aed",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              width: 18,
              height: 18,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          id="notification-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            background: "#0f0f1a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            zIndex: 1000,
            overflow: "hidden",
            animation: "slideDown 0.2s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <span style={{ fontWeight: 600, color: "#fff", fontSize: 15 }}>Notifications</span>
              {unread > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, color: "#7c3aed" }}>
                  {unread} unread
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                  title="Mark all read"
                >
                  <CheckCheck size={14} />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                <Bell size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: n.read ? "transparent" : "rgba(124,58,237,0.05)",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    transition: "background 0.2s",
                  }}
                >
                  {/* Type dot */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: TYPE_COLORS[n.type] ?? "#7c3aed",
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: n.read ? "rgba(255,255,255,0.5)" : "#fff", margin: 0, lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{timeAgo(n.createdAt)}</span>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {!n.read && (
                      <button
                        onClick={() => markRead(n._id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 2 }}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(n._id, n.read)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: 2 }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
