"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../components/AuthContext";
import { ContributorStats, FlagReport, Job } from "../../types/user";
import { formatDateMono, initials, quickRecordLabel, tierLabel, tierDescription, timeAgo } from "../../lib/record";
import { Mono, StatRow, Tab, stateInk, SecondaryButton } from "../../components/ui/primitives";
import { useToast } from "../../components/ui/Toast";

type ProfileTab = "contributions" | "watching" | "challenges";

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>("contributions");
  const [stats, setStats] = useState<ContributorStats | null>(null);
  const [contributions, setContributions] = useState<Job[]>([]);
  const [watching, setWatching] = useState<Job[]>([]);
  const [challenges, setChallenges] = useState<FlagReport[]>([]);
  const toast = useToast();
  const [linkedinLoading, setLinkedinLoading] = useState(false);

  // Starts the LinkedIn OAuth handshake. The backend builds the authorize
  // URL (it holds the client id and redirect URI), we navigate to it, and
  // LinkedIn returns the user to /auth/linkedin/callback, which completes
  // verification through AuthContext.
  async function handleLinkedInVerify() {
    setLinkedinLoading(true);
    try {
      const res = await api.auth.getLinkedInAuthUrl();
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not start LinkedIn verification.");
      setLinkedinLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login?next=/profile");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    api.users.contributorStats(user.username).then((r) => setStats(r.data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (tab === "contributions") api.jobs.myContributions({ limit: 50 }).then((r) => setContributions(r.data)).catch(() => {});
    if (tab === "watching") api.jobs.watching({ limit: 50 }).then((r) => setWatching(r.data)).catch(() => {});
    if (tab === "challenges") api.reports.mine({ limit: 50 }).then((r) => setChallenges(r.data)).catch(() => {});
  }, [tab, isAuthenticated]);

  if (!user) return <div className="px-8 py-16 text-muted">Loading…</div>;

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] border-b border-border-strong">
        <div className="px-4 md:px-8 py-8 md:py-9 lg:border-r border-border">
          <div className="flex items-center gap-3.5">
            <span className="w-[38px] h-[38px] rounded-full bg-ink text-background font-mono text-[13px] flex items-center justify-center">
              {initials(user.username)}
            </span>
            <h1 className="text-[26px] md:text-[34px] tracking-[-0.03em] font-bold">{user.username}</h1>
            {stats && (
              <span
                title={`Tier ${stats.tier} of 3`}
                className="font-mono text-[10px] tracking-[0.1em] border border-border-mid text-muted px-2 py-1"
              >
                TIER {stats.tier} · {tierLabel(stats.tier).toUpperCase()}
              </span>
            )}
            {user.linkedinVerified && (
              <span className="font-mono text-[10px] tracking-[0.1em] border border-accent text-accent px-2 py-1">
                LINKEDIN VERIFIED
              </span>
            )}
          </div>
          {stats && (
            <p className="mt-5 font-serif text-[18px] md:text-[19px] leading-[1.55] max-w-[52ch]">
              {stats.contributions} contribution{stats.contributions === 1 ? "" : "s"} filed
              {stats.evidenceVerified > 0 ? `, ${stats.evidenceVerified} evidence item${stats.evidenceVerified === 1 ? "" : "s"} verified` : ""}.
            </p>
          )}
          <p className="mt-3.5 font-serif text-[15px] leading-[1.65] text-muted max-w-[56ch]">
            Tiers reflect how much of what you file holds up — not how much you post. Filing a few solid accounts beats
            filing forty votes.
          </p>
          {stats && stats.tier < 3 && (
            <p className="mt-1.5 text-[12.5px] text-muted-foreground max-w-[56ch]">
              To reach the next tier: {tierDescription(stats.tier + 1).charAt(0).toLowerCase() + tierDescription(stats.tier + 1).slice(1)}
            </p>
          )}

          <div className="mt-6 border border-border-mid bg-card p-3.5 max-w-[56ch]">
            <Mono tone={user.linkedinVerified ? "accent" : "ink"}>
              {user.linkedinVerified ? "IDENTITY VERIFIED" : "IDENTITY NOT VERIFIED"}
            </Mono>
            {user.linkedinVerified ? (
              <p className="mt-2 text-[13.5px] text-muted">
                Verified as <strong className="text-ink">{user.linkedinDisplayName}</strong> on LinkedIn. Accounts you
                file carry this marker.
              </p>
            ) : (
              <>
                <p className="mt-2 text-[13.5px] text-muted">
                  Linking your LinkedIn proves a real person stands behind what you file. It does not publish anything
                  to LinkedIn, and your email must match the one on this account.
                </p>
                <SecondaryButton
                  onClick={handleLinkedInVerify}
                  disabled={linkedinLoading}
                  className="mt-3.5"
                >
                  {linkedinLoading ? "Redirecting…" : "Verify with LinkedIn"}
                </SecondaryButton>
              </>
            )}
          </div>
        </div>
        {stats && (
          <div className="px-4 md:px-8 py-8 md:py-9">
            <Mono>YOUR RECORD</Mono>
            <div className="mt-3.5 flex flex-col">
              <StatRow label="Account visibility" value={user.type === "public" ? "Public" : "Private"} />
              <StatRow label="Accounts filed" value={stats.accountsFiled} />
              <StatRow label="Evidence filed" value={stats.evidenceFiled} />
              <StatRow label="Evidence verified" value={stats.evidenceVerified} valueClassName={stats.evidenceVerified ? "text-accent" : ""} />
              <StatRow label="Challenges filed" value={stats.challengesFiled} />
              <StatRow label="Disputes upheld against you" value={stats.disputesUpheldAgainst} last />
            </div>
            <Link
              href="/settings#visibility"
              className="mt-3 inline-block font-mono text-[10px] tracking-[0.08em] text-accent hover:text-ink"
            >
              CHANGE VISIBILITY →
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center px-4 md:px-8 border-b border-border-strong overflow-x-auto">
        <Tab active={tab === "contributions"} onClick={() => setTab("contributions")}>Contributions</Tab>
        <Tab active={tab === "watching"} onClick={() => setTab("watching")}>Watching</Tab>
        <Tab active={tab === "challenges"} onClick={() => setTab("challenges")}>Challenges filed</Tab>
      </div>

      {tab === "contributions" && (
        <ListOrEmpty items={contributions} empty="Nothing filed yet — pick a listing in the Registry and add what you know.">
          {(job) => {
            const { label, tone } = quickRecordLabel(job);
            return (
              <Link key={job._id} href={`/registry/${job._id}`} className="flex flex-col sm:flex-row gap-2 sm:gap-6 px-4 md:px-8 py-4 border-b border-border-soft hover:bg-panel !no-underline text-inherit">
                <div className="flex-1">
                  <div className="text-[16px] font-semibold">{job.title}</div>
                  <div className="mt-1 text-[12.5px] text-muted">{job.company} · updated {timeAgo(job.updatedAt)}</div>
                </div>
                <span className={`font-mono text-[9.5px] tracking-[0.08em] ${stateInk(tone)}`}>{label.toUpperCase()}</span>
              </Link>
            );
          }}
        </ListOrEmpty>
      )}

      {tab === "watching" && (
        <ListOrEmpty items={watching} empty="You are not watching any records yet — watch one from its record page.">
          {(job) => (
            <Link key={job._id} href={`/registry/${job._id}`} className="flex flex-col sm:flex-row gap-2 sm:gap-6 px-4 md:px-8 py-4 border-b border-border-soft hover:bg-panel !no-underline text-inherit">
              <div className="flex-1">
                <div className="text-[16px] font-semibold">{job.title}</div>
                <div className="mt-1 text-[12.5px] text-muted">{job.company} · last activity {timeAgo(job.updatedAt)}</div>
              </div>
            </Link>
          )}
        </ListOrEmpty>
      )}

      {tab === "challenges" && (
        <ListOrEmpty items={challenges} empty="No challenges filed.">
          {(r) => (
            <div key={r._id} className="px-4 md:px-8 py-4 border-b border-border-soft">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[15px] font-semibold">{r.reason}</span>
                <span className={`font-mono text-[9.5px] tracking-[0.08em] ${r.status === "pending" ? "text-amber-ink" : r.status === "reviewed" ? "text-accent" : "text-muted-foreground"}`}>
                  {r.status.toUpperCase()}
                </span>
                <span className="ml-auto font-mono text-[10px] text-faint">{formatDateMono(r.createdAt)}</span>
              </div>
              {r.description && <p className="mt-1.5 text-[13.5px] text-muted">{r.description}</p>}
            </div>
          )}
        </ListOrEmpty>
      )}
    </div>
  );
}

function ListOrEmpty<T>({ items, empty, children }: { items: T[]; empty: string; children: (item: T) => React.ReactNode }) {
  if (items.length === 0) return <div className="px-4 md:px-8 py-10 text-muted text-sm">{empty}</div>;
  return <div>{items.map(children)}</div>;
}
