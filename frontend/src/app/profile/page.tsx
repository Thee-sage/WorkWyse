'use client';
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, FileText, ThumbsUp, ThumbsDown, Star, Clock, ArrowRight, Calendar, BadgeCheck, Link2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { Job } from "../../types/user";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { ScrollReveal } from "../../components/ui/ScrollReveal";
import { PageHeader } from "../../components/ui/PageHeader";

function ProfileContent() {
  const { user, verifyWithLinkedIn } = useAuth();
  const toast = useToast();
  const [linkedinLoading, setLinkedinLoading] = useState(false);

  const handleLinkedInVerify = async () => {
    setLinkedinLoading(true);
    try {
      const res = await api.auth.getLinkedInAuthUrl();
      window.location.href = res.data.url;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not start LinkedIn verification.';
      toast.error(msg);
      setLinkedinLoading(false);
    }
  };
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Get all jobs and filter those submitted by current user
      const res = await api.jobs.list({ page: 1, limit: 50 });
      const raw = res as unknown as { data: Job[] };
      const allJobs = raw.data ?? (res.data as unknown as Job[]);
      // Filter by submittedBy uid
      const mine = allJobs.filter(j => {
        if (!j.submittedBy) return false;
        if (typeof j.submittedBy === 'object') return (j.submittedBy as Record<string, unknown>).uid === user?.uid;
        return j.submittedBy === user?.uid;
      });
      setMyJobs(mine);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load your reports';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchMyJobs();
  }, [fetchMyJobs]);

  if (!user) return null;

  const totalUpvotes = myJobs.reduce((s, j) => s + j.upvotes, 0);
  const totalDownvotes = myJobs.reduce((s, j) => s + j.downvotes, 0);
  const trustScore = totalUpvotes + totalDownvotes > 0
    ? Math.round((totalUpvotes / (totalUpvotes + totalDownvotes)) * 100)
    : 50;

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <>
      <PageHeader
        label="Your Profile"
        title={user.username}
        description={`${user.role === 'admin' ? 'Administrator' : 'Community Member'} · ${user.type} account`}
      />
      <section className="pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="bg-card rounded-xl border border-border p-8 md:p-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-8 px-4 py-1.5 rounded-b-md border-x border-b border-border" style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.05em", backgroundColor: "var(--secondary)" }}>
                INVESTIGATOR PROFILE
              </div>
              <div className="mt-4 flex flex-col md:flex-row items-start gap-8">
                <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(37,99,235,0.1)" }}>
                  <span className="text-accent" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>
                    {initials}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600 }}>{user.username}</h2>
                    {user.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#d97706" }}>
                        <ShieldCheck size={12} /> Admin
                      </span>
                    )}
                    {user.linkedinVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(10,102,194,0.1)", color: "#0A66C2" }}>
                        <BadgeCheck size={12} /> LinkedIn Verified
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2" style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                    <span>{user.email}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {user.type} account</span>
                  </div>
                  <div className="mt-5 max-w-md">
                    <div className="flex justify-between mb-1.5" style={{ fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Community Trust Score</span>
                      <span style={{ fontWeight: 500 }}>{trustScore}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: "#2F6F5E" }}
                        initial={{ width: 0 }} animate={{ width: `${trustScore}%` }}
                        transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="my-6 border-t border-dashed border-border" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <FileText size={18} style={{ color: "var(--accent)" }} />, value: myJobs.length, label: "Reports Filed" },
                  { icon: <ThumbsUp size={18} className="text-emerald-600" />, value: totalUpvotes, label: "Upvotes Received" },
                  { icon: <ThumbsDown size={18} className="text-red-500" />, value: totalDownvotes, label: "Downvotes" },
                  { icon: <Star size={18} style={{ color: "#D4A84A" }} />, value: `${trustScore}%`, label: "Trust Score" },
                ].map(stat => (
                  <div key={stat.label} className="p-4 rounded-lg text-center" style={{ backgroundColor: "var(--background)" }}>
                    <div className="flex items-center justify-center mb-2">{stat.icon}</div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600 }}>{stat.value}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-6 right-8 pointer-events-none select-none" style={{ fontFamily: "'Playfair Display', serif", fontSize: "3.5rem", fontWeight: 700, transform: "rotate(-10deg)", opacity: 0.03 }}>
                TRUSTED
              </div>
            </div>
          </ScrollReveal>

          {/* LinkedIn Verification Card */}
          <ScrollReveal delay={0.1}>
            <div className="mt-6 rounded-xl border border-border overflow-hidden" style={{ backgroundColor: "var(--card)" }}>
              <div className="flex items-center justify-between px-8 py-5">
                <div className="flex items-center gap-4">
                  {/* LinkedIn logo */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#0A66C2" }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <div>
                    {user.linkedinVerified ? (
                      <>
                        <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>Identity Verified</p>
                        <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                          Verified as <strong>{user.linkedinDisplayName}</strong> on LinkedIn
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>Verify Your Identity</p>
                        <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                          Link your LinkedIn to prove you're a real person
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {user.linkedinVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "rgba(10,102,194,0.1)", color: "#0A66C2" }}>
                    <BadgeCheck size={15} /> Verified
                  </span>
                ) : (
                  <button
                    onClick={handleLinkedInVerify}
                    disabled={linkedinLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: "#0A66C2", color: "white", cursor: linkedinLoading ? "not-allowed" : "pointer" }}
                  >
                    <Link2 size={14} />
                    {linkedinLoading ? 'Redirecting…' : 'Verify with LinkedIn'}
                  </button>
                )}
              </div>
            </div>
          </ScrollReveal>

          {/* My Reports */}
          <ScrollReveal delay={0.15}>
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600 }}>Your Reports</h3>
                <Link href="/submit-report" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ fontSize: "0.85rem", color: "var(--accent)" }}>
                  File new report <ArrowRight size={14} />
                </Link>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 rounded-xl border border-border animate-pulse" style={{ backgroundColor: "var(--card)" }} />
                  ))}
                </div>
              ) : myJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myJobs.map((job, i) => (
                    <Link key={job._id} href={`/reports/${job._id}`} style={{ display: "block" }}>
                      <motion.div
                        className="bg-card rounded-xl border border-border p-6 cursor-pointer hover:shadow-md transition-shadow"
                        initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.05 }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600 }}>{job.company}</p>
                            <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>{job.title}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${job.isFake ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                            {job.isFake ? "Ghost" : "Legitimate"}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-4" style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                          <span className="flex items-center gap-1"><ThumbsUp size={11} /> {job.upvotes}</span>
                          <span className="flex items-center gap-1"><ThumbsDown size={11} /> {job.downvotes}</span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>You haven&apos;t filed any reports yet.</p>
                  <Link href="/submit-report" className="inline-flex items-center gap-2 mt-3 hover:opacity-80 transition-opacity" style={{ fontSize: "0.85rem", color: "var(--accent)" }}>
                    Submit your first report <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
