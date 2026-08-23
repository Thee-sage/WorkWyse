"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { ContributorStats, EvidenceStatus, FlagReport, PendingEvidenceItem } from "../../types/user";
import { formatDateMono, tierLabel } from "../../lib/record";
import { Mono, PrimaryButton, SecondaryButton, Tab } from "../../components/ui/primitives";

type Queue = "evidence" | "challenges" | "requests" | "admin";

export default function ModerationPage() {
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const isStaff = isAdmin || user?.role === "moderator";

  const [queue, setQueue] = useState<Queue>("evidence");
  const [evidenceItems, setEvidenceItems] = useState<PendingEvidenceItem[]>([]);
  const [reports, setReports] = useState<FlagReport[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<PendingEvidenceItem | null>(null);
  const [selectedReport, setSelectedReport] = useState<FlagReport | null>(null);
  const [note, setNote] = useState("");
  const [submitterStats, setSubmitterStats] = useState<ContributorStats | null>(null);

  // Admin passphrase second factor. Reports decisions, the approval queue,
  // and admin tools all require this to be true — a valid admin session
  // alone is not enough. See middleware/adminUnlock.ts on the backend.
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  async function handleUnlock() {
    setUnlocking(true);
    try {
      await api.admin.unlock(passphrase);
      setAdminUnlocked(true);
      setPassphrase("");
      toast.success("Admin access unlocked");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not unlock admin access");
    } finally {
      setUnlocking(false);
    }
  }

  function handleLock() {
    api.admin.lock();
    setAdminUnlocked(false);
    if (queue === "requests" || queue === "admin") setQueue("evidence");
  }

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isStaff)) router.push("/");
  }, [authLoading, isAuthenticated, isStaff, router]);

  const loadEvidence = useCallback(() => {
    api.jobs.evidenceQueue({ limit: 30 }).then((r) => {
      setEvidenceItems(r.data);
      setSelectedEvidence((prev) => prev ?? r.data[0] ?? null);
    }).catch(() => {});
  }, []);

  const loadReports = useCallback(() => {
    api.reports.adminList({ status: "pending", limit: 30 }).then((r) => {
      setReports(r.data);
      setSelectedReport((prev) => prev ?? r.data[0] ?? null);
    }).catch(() => {});
  }, []);

  useEffect(() => { if (isStaff) { loadEvidence(); loadReports(); } }, [isStaff, loadEvidence, loadReports]);

  useEffect(() => {
    setNote("");
    const author = selectedEvidence?.evidence.addedBy ?? (typeof selectedReport?.reportedBy === "object" ? selectedReport.reportedBy.username : undefined);
    if (author) api.users.contributorStats(author).then((r) => setSubmitterStats(r.data)).catch(() => setSubmitterStats(null));
    else setSubmitterStats(null);
  }, [selectedEvidence, selectedReport]);

  async function decideEvidence(status: EvidenceStatus) {
    if (!selectedEvidence) return;
    try {
      await api.jobs.updateEvidenceStatus(selectedEvidence.jobId, selectedEvidence.evidence._id!, { status, note: note || undefined });
      toast.success("Decision recorded");
      setSelectedEvidence(null);
      loadEvidence();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not record decision");
    }
  }

  /**
   * An admin with an unlocked session decides directly. A moderator (or an
   * admin who hasn't unlocked) submits a request instead — capped at one
   * per day server-side — which then waits in the admin approval queue.
   */
  async function decideReport(status: "reviewed" | "dismissed") {
    if (!selectedReport) return;

    if (isAdmin && adminUnlocked) {
      try {
        await api.reports.updateStatus(selectedReport._id, status);
        toast.success("Report updated");
        setSelectedReport(null);
        loadReports();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Could not update report");
      }
      return;
    }

    try {
      await api.reports.requestDecision(selectedReport._id, status, note || undefined);
      toast.success("Decision request submitted — an admin will review it");
      setSelectedReport(null);
      setNote("");
      loadReports();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not submit decision request");
    }
  }

  if (!isStaff) return <div className="px-8 py-16 text-muted">Loading…</div>;

  return (
    <div className="bg-panel">
      <div className="flex items-center gap-4 px-4 md:px-8 h-11 bg-ink text-background overflow-x-auto whitespace-nowrap">
        <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em]">
          <span className="w-2 h-1.5 bg-amber rotate-45" /> MODERATION WORKSPACE
        </span>
        <span className="font-mono text-[10px] tracking-[0.08em] text-faint">{user?.username.toUpperCase()} · {user?.role.toUpperCase()}</span>
        <span className="ml-auto font-mono text-[10px] tracking-[0.08em] text-faint">
          EVIDENCE {evidenceItems.length} · CHALLENGES {reports.length}
        </span>
      </div>

      <div className="flex items-center px-4 md:px-8 border-b border-border-strong bg-background overflow-x-auto">
        <Tab active={queue === "evidence"} onClick={() => setQueue("evidence")} count={evidenceItems.length}>Evidence queue</Tab>
        <Tab active={queue === "challenges"} onClick={() => setQueue("challenges")} count={reports.length}>Challenges</Tab>
        {isAdmin && (
          <Tab active={queue === "requests"} onClick={() => setQueue("requests")}>Decision requests</Tab>
        )}
        {isAdmin && <Tab active={queue === "admin"} onClick={() => setQueue("admin")}>Admin tools</Tab>}
      </div>

      {isAdmin && (queue === "requests" || queue === "admin" || (queue === "challenges" && !adminUnlocked)) && (
        <div className="px-4 md:px-8 py-4 border-b border-border bg-panel-amber flex items-center gap-3 flex-wrap">
          {adminUnlocked ? (
            <>
              <Mono tone="amber">ADMIN ACCESS UNLOCKED</Mono>
              <SecondaryButton onClick={handleLock} className="!py-1.5 !px-3 text-[11px]">Lock</SecondaryButton>
            </>
          ) : (
            <>
              <Mono tone="amber">ADMIN ACCESS LOCKED</Mono>
              <span className="text-[12.5px] text-muted">Enter the admin passphrase to unlock decision approval and admin tools.</span>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="Admin passphrase"
                className="ml-auto font-mono text-[12.5px] border border-border-mid px-2.5 py-1.5 bg-card w-[220px]"
              />
              <PrimaryButton onClick={handleUnlock} disabled={unlocking || !passphrase} className="!py-1.5 !px-3 text-[11px]">
                {unlocking ? "Unlocking…" : "Unlock"}
              </PrimaryButton>
            </>
          )}
        </div>
      )}

      {queue === "evidence" && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] bg-background min-h-[500px]">
          <div className="lg:border-r border-border">
            {evidenceItems.length === 0 && <div className="p-5 text-muted text-sm">Queue is empty.</div>}
            {evidenceItems.map((item) => (
              <button
                key={item.evidence._id}
                onClick={() => setSelectedEvidence(item)}
                className={`w-full text-left px-4 py-3.5 border-b border-border-soft ${selectedEvidence?.evidence._id === item.evidence._id ? "bg-panel border-l-[3px] border-l-ink" : "hover:bg-panel"}`}
              >
                <div className="flex items-center gap-2">
                  <Mono>{item.evidence.type.toUpperCase()}</Mono>
                  <span className="ml-auto font-mono text-[9.5px] text-faint">{formatDateMono(item.evidence.addedAt ?? new Date().toISOString())}</span>
                </div>
                <div className="mt-1.5 text-[14.5px] font-semibold line-clamp-1">{item.jobTitle}</div>
                <div className="mt-1 text-[12.5px] text-muted">{item.evidence.addedBy ?? "unknown"} · {item.jobCompany}</div>
              </button>
            ))}
          </div>
          <div className="p-5 md:p-7">
            {selectedEvidence ? (
              <>
                <Mono>{selectedEvidence.evidence.type.toUpperCase()} · SUBMITTED {formatDateMono(selectedEvidence.evidence.addedAt ?? new Date().toISOString())}</Mono>
                <h2 className="mt-2.5 text-[22px] font-bold tracking-[-0.02em]">{selectedEvidence.jobTitle}</h2>
                <div className="mt-1.5 text-[13.5px] text-muted">
                  On <Link href={`/registry/${selectedEvidence.jobId}`} className="text-accent">{selectedEvidence.jobCompany}</Link> · submitted by {selectedEvidence.evidence.addedBy ?? "unknown"}
                </div>

                <div className="mt-5 border border-border-mid">
                  {selectedEvidence.evidence.type === "url" ? (
                    <a href={selectedEvidence.evidence.value} target="_blank" rel="noopener noreferrer" className="block p-4 text-[13px] text-accent break-all">{selectedEvidence.evidence.value}</a>
                  ) : selectedEvidence.evidence.type === "text" ? (
                    <p className="p-4 font-mono text-[12.5px] leading-[1.7] whitespace-pre-wrap break-words">{selectedEvidence.evidence.value}</p>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedEvidence.evidence.value} alt="Submitted evidence" className="max-h-72 w-full object-contain bg-panel" />
                  )}
                </div>

                {submitterStats && (
                  <div className="mt-5 p-3.5 bg-panel text-[12.5px] flex flex-wrap gap-x-6 gap-y-1.5">
                    <span>{tierLabel(submitterStats.tier)}</span>
                    <span>{submitterStats.contributions} contributions</span>
                    <span>{submitterStats.evidenceVerified} evidence verified</span>
                    <span>{submitterStats.disputesUpheldAgainst} disputes upheld against</span>
                  </div>
                )}

                <div className="mt-5">
                  <Mono>DECISION NOTE · PUBLISHED WITH YOUR DECISION</Mono>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="e.g. Sender domain matches the company. Redactions were made by the submitter before upload."
                    className="mt-2.5 w-full border border-border-mid p-3 text-[14px] outline-none resize-none bg-card"
                  />
                </div>

                <div className="mt-5 flex items-center gap-2.5 flex-wrap">
                  <PrimaryButton onClick={() => decideEvidence("verified")}>Accept as verified</PrimaryButton>
                  <SecondaryButton onClick={() => decideEvidence("unverifiable")}>Publish as unverifiable</SecondaryButton>
                  <button onClick={() => decideEvidence("redacted")} className="ml-auto text-[13px] text-amber-ink">Withhold / redact</button>
                </div>
              </>
            ) : (
              <div className="text-muted">Select an item from the queue.</div>
            )}
          </div>
        </div>
      )}

      {queue === "challenges" && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] bg-background min-h-[500px]">
          <div className="lg:border-r border-border">
            {reports.length === 0 && <div className="p-5 text-muted text-sm">Queue is empty.</div>}
            {reports.map((r) => (
              <button
                key={r._id}
                onClick={() => setSelectedReport(r)}
                className={`w-full text-left px-4 py-3.5 border-b border-border-soft ${selectedReport?._id === r._id ? "bg-panel border-l-[3px] border-l-ink" : "hover:bg-panel"}`}
              >
                <div className="flex items-center gap-2">
                  <Mono>{r.targetType.toUpperCase()}</Mono>
                  <span className="ml-auto font-mono text-[9.5px] text-faint">{formatDateMono(r.createdAt)}</span>
                </div>
                <div className="mt-1.5 text-[14.5px] font-semibold line-clamp-1">{r.reason}</div>
              </button>
            ))}
          </div>
          <div className="p-5 md:p-7">
            {selectedReport ? (
              <>
                <Mono>{selectedReport.targetType.toUpperCase()} CHALLENGE · FILED {formatDateMono(selectedReport.createdAt)}</Mono>
                <h2 className="mt-2.5 text-[22px] font-bold tracking-[-0.02em]">{selectedReport.reason}</h2>
                {selectedReport.description && <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft max-w-[64ch]">{selectedReport.description}</p>}
                {selectedReport.targetType === "job" && (
                  <Link href={`/registry/${selectedReport.targetId}`} className="inline-block mt-3 font-mono text-[10px] tracking-[0.08em] text-accent">VIEW THE RECORD →</Link>
                )}
                {!(isAdmin && adminUnlocked) && (
                  <>
                    <p className="mt-5 text-[12.5px] text-muted max-w-[56ch]">
                      {isAdmin
                        ? "Unlock admin access above to decide directly, or submit a request below."
                        : "Report decisions go through admin approval. You can submit one request per day."}
                    </p>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional note for the reviewing admin…"
                      rows={2}
                      className="mt-3 w-full max-w-[56ch] border border-border-mid px-3 py-2 text-[13px] bg-card"
                    />
                  </>
                )}
                <div className="mt-4 flex items-center gap-2.5">
                  <PrimaryButton onClick={() => decideReport("reviewed")}>
                    {isAdmin && adminUnlocked ? "Resolve — action taken" : "Request: action taken"}
                  </PrimaryButton>
                  <SecondaryButton onClick={() => decideReport("dismissed")}>
                    {isAdmin && adminUnlocked ? "Dismiss" : "Request: dismiss"}
                  </SecondaryButton>
                </div>
              </>
            ) : (
              <div className="text-muted">Select an item from the queue.</div>
            )}
          </div>
        </div>
      )}

      {queue === "requests" && isAdmin && (adminUnlocked ? <DecisionRequestsQueue /> : <LockedNotice />)}

      {queue === "admin" && isAdmin && (adminUnlocked ? <AdminTools /> : <LockedNotice />)}
    </div>
  );
}

function AdminTools() {
  const toast = useToast();
  const [users, setUsers] = useState<Array<{ uid: string; username: string; role: string }>>([]);

  useEffect(() => {
    api.admin.listUsers({ limit: 50 }).then((r) => setUsers(r.data as any)).catch(() => {});
  }, []);

  async function changeRole(uid: string, role: "user" | "admin" | "moderator") {
    try {
      await api.admin.changeRole(uid, role);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
      toast.success("Role updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update role");
    }
  }

  return (
    <div className="bg-background p-5 md:p-7">
      <Mono>USER ROLES</Mono>
      <div className="mt-4 border border-border-mid">
        {users.map((u) => (
          <div key={u.uid} className="flex items-center gap-3 px-4 py-2.5 border-b border-border-soft last:border-b-0">
            <span className="text-[14px] font-semibold">{u.username}</span>
            <select value={u.role} onChange={(e) => changeRole(u.uid, e.target.value as any)} className="ml-auto font-mono text-[12px] border border-border-mid px-2 py-1 bg-card">
              <option value="user">user</option>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
            </select>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Mono>EXPORT / IMPORT</Mono>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href={api.export.jobsCSV()} className="font-mono text-[10px] tracking-[0.08em] border border-border-mid px-3 py-2 !no-underline text-ink-soft">EXPORT JOBS CSV</a>
          <a href={api.export.reportsCSV()} className="font-mono text-[10px] tracking-[0.08em] border border-border-mid px-3 py-2 !no-underline text-ink-soft">EXPORT REPORTS CSV</a>
        </div>
      </div>
    </div>
  );
}

function LockedNotice() {
  return (
    <div className="px-4 md:px-8 py-16 text-center text-muted text-sm">
      Unlock admin access above to continue.
    </div>
  );
}

interface DecisionRequestItem {
  _id: string;
  reportId: FlagReport;
  requestedBy: { username: string };
  proposedStatus: "reviewed" | "dismissed";
  note?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

/**
 * Admin approval queue for moderator decision requests. Every action here
 * requires the admin unlock (X-Admin-Unlock header, attached automatically
 * by lib/api.ts for /reports/decision-requests* calls) — see
 * middleware/adminUnlock.ts on the backend for why.
 */
function DecisionRequestsQueue() {
  const toast = useToast();
  const [requests, setRequests] = useState<DecisionRequestItem[]>([]);
  const [decisionNote, setDecisionNote] = useState("");

  const load = useCallback(() => {
    api.reports.decisionRequests({ status: "pending", limit: 30 }).then((r) => {
      setRequests(r.data as DecisionRequestItem[]);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    try {
      await api.reports.approveDecisionRequest(id, decisionNote || undefined);
      toast.success("Request approved — the report was updated");
      setDecisionNote("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not approve request");
    }
  }

  async function reject(id: string) {
    try {
      await api.reports.rejectDecisionRequest(id, decisionNote || undefined);
      toast.success("Request rejected");
      setDecisionNote("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not reject request");
    }
  }

  return (
    <div className="bg-background p-5 md:p-7">
      <Mono>PENDING DECISION REQUESTS · {requests.length}</Mono>
      <p className="mt-2 text-[12.5px] text-muted max-w-[64ch]">
        Moderators can no longer decide a report directly — each proposal below waits here until you approve or
        reject it. Approving applies the moderator&apos;s proposed outcome; rejecting leaves the report untouched.
      </p>

      {requests.length === 0 ? (
        <div className="mt-6 text-muted text-sm">Nothing pending.</div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {requests.map((req) => (
            <div key={req._id} className="border border-border-mid p-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Mono tone="ink">{req.reportId.targetType?.toUpperCase()} · {req.proposedStatus.toUpperCase()}</Mono>
                <span className="font-mono text-[10px] text-muted-foreground">
                  requested by {req.requestedBy.username} · {formatDateMono(req.createdAt)}
                </span>
              </div>
              <div className="mt-2 text-[14px] font-semibold">{req.reportId.reason}</div>
              {req.reportId.description && (
                <p className="mt-1.5 text-[13px] text-ink-soft">{req.reportId.description}</p>
              )}
              {req.note && (
                <p className="mt-2 text-[12.5px] text-muted italic">Moderator&apos;s note: {req.note}</p>
              )}
              {req.reportId.targetType === "job" && (
                <Link href={`/registry/${req.reportId.targetId}`} className="inline-block mt-2 font-mono text-[10px] tracking-[0.08em] text-accent">
                  VIEW THE RECORD →
                </Link>
              )}
              <input
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Optional note back to the moderator…"
                className="mt-3 w-full max-w-[56ch] border border-border-mid px-3 py-2 text-[13px] bg-card"
              />
              <div className="mt-3 flex items-center gap-2.5">
                <PrimaryButton onClick={() => approve(req._id)}>Approve</PrimaryButton>
                <SecondaryButton onClick={() => reject(req._id)}>Reject</SecondaryButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
