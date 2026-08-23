"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useAuth } from "../../components/AuthContext";
import { AppNotification } from "../../types/user";
import { timeAgo } from "../../lib/record";
import { Mono } from "../../components/ui/primitives";

const TYPE_LABEL: Record<string, string> = {
  job_created: "YOUR RECORD WAS OPENED",
  report_reviewed: "A CHALLENGE WAS DECIDED",
  evidence_uploaded: "EVIDENCE ACTIVITY",
  vote_received: "A VOTE WAS RECORDED",
  comment_added: "NEW COMMENT",
  role_changed: "YOUR ROLE CHANGED",
  employer_replied: "AN EMPLOYER REPLIED",
};

export default function NotificationsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login?next=/notifications");
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) api.notifications.list({ limit: 50 }).then((r) => setItems(r.data)).catch(() => {});
  }, [isAuthenticated]);

  async function markRead(id: string) {
    await api.notifications.markRead(id);
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  }

  async function markAllRead() {
    await api.notifications.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function remove(id: string) {
    await api.notifications.delete(id);
    setItems((prev) => prev.filter((n) => n._id !== id));
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
      <div className="lg:border-r border-border-strong">
        <div className="px-4 md:px-8 py-8 border-b border-border-strong">
          <h1 className="text-[26px] md:text-[32px] tracking-[-0.035em] font-bold">What changed for you</h1>
          <p className="mt-3 font-serif text-[16px] leading-[1.6] text-muted max-w-[58ch]">
            We notify you when something happens to what you filed — never to tell you a new job appeared.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Mono>{items.length} TOTAL · {unread} UNREAD</Mono>
            {unread > 0 && (
              <button onClick={markAllRead} className="ml-auto font-mono text-[10px] tracking-[0.08em] text-accent">
                MARK ALL READ
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-4 md:px-8 py-10 text-muted text-sm">Nothing yet.</div>
        ) : (
          items.map((n) => (
            <div key={n._id} className={`px-4 md:px-8 py-5 border-b border-border-soft ${!n.read ? "bg-panel-amber" : ""}`}>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`w-2 h-2 rounded-full ${!n.read ? "bg-amber" : "bg-border-mid"}`} />
                <Mono tone={!n.read ? "amber" : "muted"}>{TYPE_LABEL[n.type] ?? n.type.toUpperCase()}</Mono>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
              </div>
              <div className="mt-2 text-[15px] leading-[1.5]">{n.message}</div>
              <div className="mt-2.5 flex items-center gap-3">
                {n.link && <Link href={n.link.startsWith("/") ? n.link : `/${n.link}`} className="text-[12.5px] text-accent">View</Link>}
                {!n.read && <button onClick={() => markRead(n._id)} className="text-[12.5px] text-muted">Mark read</button>}
                <button onClick={() => remove(n._id)} className="text-[12.5px] text-faint hover:text-destructive">Remove</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-4 md:px-8 py-8">
        <Mono>WHAT WE WILL TELL YOU ABOUT</Mono>
        <div className="mt-4 flex flex-col gap-3">
          {[
            "Someone disputes what you filed",
            "A moderator acts on your contribution",
            "An employer replies on a record you're involved in",
            "Something changes on a record you watch",
          ].map((t) => (
            <div key={t} className="flex items-center gap-2.5 py-2.5 border-b border-border-soft text-[13.5px]">
              {t}
            </div>
          ))}
        </div>
        <div className="mt-5 p-3.5 bg-panel">
          <p className="text-[12.5px] leading-[1.65] text-muted">
            We never notify you about new job listings, and we never share your identity with an employer. There is no
            digest designed to bring you back — only things that actually happened to your contributions.
          </p>
        </div>
      </div>
    </div>
  );
}
