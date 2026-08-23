"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { ActivityLogEntry } from "../../types/user";
import { activityCopy, classifyActivity, formatDateMono } from "../../lib/record";
import { Chip, Glyph, Mono } from "../../components/ui/primitives";

type Filter = "all" | "people" | "auto" | "mod" | "employer";

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.activity.feed({ limit: 60 }).then((r) => setEntries(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter((e) => filter === "all" || classifyActivity(e.action) === filter);

  const groups = new Map<string, ActivityLogEntry[]>();
  for (const e of filtered) {
    const key = formatDateMono(e.createdAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const counts = {
    people: entries.filter((e) => classifyActivity(e.action) === "people").length,
    auto: entries.filter((e) => classifyActivity(e.action) === "auto").length,
    mod: entries.filter((e) => classifyActivity(e.action) === "mod").length,
    employer: entries.filter((e) => classifyActivity(e.action) === "employer").length,
  };

  return (
    <div>
      <div className="px-4 md:px-8 pt-9 pb-6 border-b border-border-strong">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-12 items-end">
          <div>
            <Mono>THE PUBLIC RECORD</Mono>
            <h1 className="mt-3.5 text-[28px] md:text-[38px] leading-[1.06] tracking-[-0.035em] font-bold max-w-[26ch]">
              Everything that changed across WorkWyse
            </h1>
            <p className="mt-3.5 font-serif text-[16px] leading-[1.6] text-muted max-w-[60ch]">
              Every entry says who did it and what kind of thing it was. Nothing on this platform changes silently —
              including our own moderation.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <StatLine label="Accounts & evidence" value={counts.people} />
            <StatLine label="Automated checks" value={counts.auto} />
            <StatLine label="Moderator decisions" value={counts.mod} />
            <StatLine label="Employer replies" value={counts.employer} accent />
          </div>
        </div>
        <div className="mt-5 flex gap-2 flex-wrap">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>EVERYTHING</Chip>
          <Chip active={filter === "people"} onClick={() => setFilter("people")}>● ACCOUNTS & EVIDENCE</Chip>
          <Chip active={filter === "auto"} onClick={() => setFilter("auto")}>■ AUTOMATED CHECKS</Chip>
          <Chip active={filter === "mod"} onClick={() => setFilter("mod")}>◆ MODERATION</Chip>
          <Chip active={filter === "employer"} onClick={() => setFilter("employer")}>EMPLOYER REPLIES</Chip>
        </div>
      </div>

      {loading ? (
        <div className="px-8 py-10 text-muted">Loading…</div>
      ) : groups.size === 0 ? (
        <div className="px-8 py-10 text-muted">Nothing in this lane yet.</div>
      ) : (
        Array.from(groups.entries()).map(([day, items]) => (
          <div key={day} className="grid grid-cols-1 sm:grid-cols-[110px_1fr]">
            <div className="hidden sm:block px-4 md:px-8 pt-5">
              <Mono>{day}</Mono>
            </div>
            <div>
              {items.map((e) => {
                const kind = classifyActivity(e.action);
                return (
                  <div key={e._id} className={`px-4 md:px-8 py-4 border-b border-border-soft ${kind === "employer" ? "bg-panel-teal-soft" : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <Glyph kind={kind === "auto" ? "automated" : kind === "mod" || kind === "employer" ? "moderation" : "account"} />
                      <span className={`font-mono text-[10px] tracking-[0.1em] ${kind === "employer" ? "text-accent" : "text-muted"}`}>
                        {kind === "auto" ? "AUTOMATED CHECK" : kind === "mod" ? "MODERATION" : kind === "employer" ? "EMPLOYER RESPONSE" : "ACCOUNT"}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="mt-2 text-[15px]">
                      {activityCopy(e)}
                      {e.targetType === "job" && (
                        <>
                          {" "}on <Link href={`/registry/${e.targetId}`} className="text-accent">this record</Link>
                        </>
                      )}
                    </div>
                    <div className="mt-1 text-[12.5px] text-muted">{e.actorUsername}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function StatLine({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex justify-between text-[13px] pb-2 border-b border-border-soft">
      <span className="text-muted">{label}</span>
      <span className={`font-mono font-semibold ${accent ? "text-accent" : ""}`}>{value}</span>
    </div>
  );
}
