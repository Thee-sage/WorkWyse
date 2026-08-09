'use client';
import { use, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Calendar, Users, FileText, ThumbsUp, ThumbsDown, MessageSquare, AlertTriangle, CheckCircle, Flag, Star, Image, ExternalLink, Shield } from "lucide-react";
import { api, ApiError } from "../../../lib/api";
import { Job } from "../../../types/user";
import { useAuth } from "../../../components/AuthContext";
import { useToast } from "../../../components/ui/Toast";
import { ScrollReveal } from "../../../components/ui/ScrollReveal";

function statusFromJob(job: Job): "ghost" | "suspicious" | "legitimate" {
  if (job.isFake) return "ghost";
  const ratio = job.upvotes / (job.upvotes + job.downvotes + 1);
  return ratio > 0.6 ? "legitimate" : "suspicious";
}

function trustScoreFromJob(job: Job): number {
  let score = 50;
  const totalVotes = job.upvotes + job.downvotes;
  if (totalVotes > 0) {
    const voteRatio = job.upvotes / totalVotes;
    score += Math.round((voteRatio - 0.5) * 60);
  }
  const evidence = job.evidence ?? [];
  if (job.hasEvidence || evidence.length > 0) {
    score += Math.min(evidence.length * 5, 15);
  }
  if (evidence.some(e => e.type === 'image')) {
    score += 5;
  }
  if (job.verificationStatus === 'verified') {
    score += 10;
  }
  return Math.max(0, Math.min(100, score));
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [voting, setVoting] = useState(false);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await api.jobs.get(id);
        setJob(res.data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [id]);

  // Fetch user's existing vote when logged in
  useEffect(() => {
    if (!user || !id) return;
    async function fetchUserVote() {
      try {
        const res = await api.jobs.getUserVote(id);
        setUserVote(res.data.userVote);
      } catch {
        // Silently fail — user just won't see their active vote
      }
    }
    fetchUserVote();
  }, [user, id]);

  const handleVote = async (type: 'upvote' | 'downvote') => {
    if (!user) { toast.error('Please log in to vote'); return; }
    if (voting) return;
    setVoting(true);
    try {
      const res = await api.jobs.vote(id, type);
      const data = res.data;
      // Update job counts in place (no full refetch needed)
      setJob(prev => prev ? { ...prev, upvotes: data.upvotes, downvotes: data.downvotes } : prev);
      setUserVote(data.userVote);

      if (data.userVote === null) {
        toast.success('Vote removed');
      } else {
        toast.success(`${data.userVote === 'upvote' ? 'Upvoted' : 'Downvoted'} successfully`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Vote failed');
    } finally {
      setVoting(false);
    }
  };

  const handleAddReview = async () => {
    if (!user) { toast.error('Please log in to add a review'); return; }
    if (!newComment.trim()) return;
    setSubmittingReview(true);
    try {
      await api.jobs.addReview(id, { rating, comment: newComment });
      const res = await api.jobs.get(id);
      setJob(res.data);
      setNewComment("");
      toast.success('Review added!');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-36 pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-64 rounded-xl border border-border animate-pulse" style={{ backgroundColor: "var(--card)" }} />
        </div>
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="pt-36 pb-24 text-center">
        <div className="max-w-md mx-auto px-6">
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 600 }}>Report Not Found</h1>
          <p className="mt-3" style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>This report does not exist in our archive.</p>
          <Link href="/reports" className="inline-flex items-center gap-2 mt-6" style={{ fontSize: "0.9rem", color: "var(--accent)" }}>
            <ArrowLeft size={16} /> Back to reports
          </Link>
        </div>
      </div>
    );
  }

  const status = statusFromJob(job);
  const trust = trustScoreFromJob(job);
  const statusConfig = {
    ghost: { label: "Ghost Job", icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-200", accent: "#E5484D" },
    legitimate: { label: "Legitimate", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-200", accent: "#2F6F5E" },
    suspicious: { label: "Suspicious", icon: Flag, color: "text-amber-600 bg-amber-50 border-amber-200", accent: "#D4A84A" },
  };
  const s = statusConfig[status];
  const StatusIcon = s.icon;
  const dateStr = new Date(job.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <>
      <div className="pt-28 md:pt-32">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/reports" className="inline-flex items-center gap-2 transition-colors duration-200 hover:opacity-80" style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
            <ArrowLeft size={14} /> Back to reports
          </Link>
        </div>
      </div>

      <section className="pt-6 pb-24 md:pb-32">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <div className="bg-card rounded-xl border border-border shadow-sm relative overflow-hidden">
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-dashed border-border">
                  <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: s.accent }} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                    Report
                  </span>
                  <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${s.color}`} style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                    <StatusIcon size={12} /> {s.label}
                  </span>
                  {job.hasEvidence && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-600" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                      <Shield size={12} /> Evidence
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600 }}>{job.title}</h1>
                    <p className="mt-1" style={{ fontSize: "0.95rem", color: "var(--accent)" }}>{job.company}</p>
                  </div>
                  <div className="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium" style={{
                    backgroundColor: trust >= 70 ? "#dcfce7" : trust >= 40 ? "#fef9c3" : "#fee2e2",
                    color: trust >= 70 ? "#166534" : trust >= 40 ? "#854d0e" : "#991b1b"
                  }}>
                    {trust}% trust
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-4" style={{ fontSize: "0.8rem" }}>
                  <span className="flex items-center gap-1.5" style={{ color: "var(--muted-foreground)" }}><MapPin size={13} /> {job.location}</span>
                  <span className="flex items-center gap-1.5" style={{ color: "var(--muted-foreground)" }}><Calendar size={13} /> {dateStr}</span>
                  <span className="flex items-center gap-1.5" style={{ color: "var(--muted-foreground)" }}><Users size={13} /> {job.reviews.length} reviews</span>
                </div>

                {job.jobUrl && (
                  <div className="mt-4">
                    <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:opacity-80" style={{ fontSize: "0.85rem", color: "var(--accent)" }}>
                      <FileText size={14} /> View original listing →
                    </a>
                  </div>
                )}

                {/* Job Description (extracted from listing) */}
                {job.jobDescription && (
                  <div className="mt-8">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={14} style={{ color: "var(--muted-foreground)" }} />
                      <span style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Job Description</span>
                    </div>
                    <div className="p-4 rounded-lg border border-border" style={{ backgroundColor: "var(--secondary)", maxHeight: "12rem", overflowY: "auto" }}>
                      <div style={{ fontSize: "0.85rem", lineHeight: 1.7, color: "var(--muted-foreground)" }}>
                        {job.jobDescription.split("\n\n").map((para, i) => (
                          <p key={i} className={i > 0 ? "mt-3" : ""}>{para}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reported Issue (user's experience) */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} style={{ color: s.accent }} />
                    <span style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Reported Issue</span>
                  </div>
                  <div style={{ fontSize: "0.9rem", lineHeight: 1.8 }}>
                    {job.description.split("\n\n").map((para, i) => (
                      <p key={i} className={i > 0 ? "mt-4" : ""}>{para}</p>
                    ))}
                  </div>
                </div>

                {/* Evidence Section */}
                {job.evidence && job.evidence.length > 0 && (
                  <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Shield size={14} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Evidence Provided</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200" style={{ fontSize: '0.7rem', fontWeight: 500 }}>{job.evidence.length} item{job.evidence.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-3">
                      {job.evidence.map((item, idx) => (
                        <div key={idx} className="rounded-lg border border-border p-4" style={{ backgroundColor: 'var(--background)' }}>
                          {item.type === 'image' && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Image size={12} style={{ color: 'var(--accent)' }} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--accent)' }}>Image Evidence</span>
                              </div>
                              <a href={item.value} target="_blank" rel="noopener noreferrer" className="block">
                                <img src={item.value} alt={`Evidence ${idx + 1}`} className="rounded-md border border-border" style={{ maxHeight: '16rem', maxWidth: '100%', objectFit: 'contain' }} />
                              </a>
                            </div>
                          )}
                          {item.type === 'url' && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <ExternalLink size={12} style={{ color: 'var(--accent)' }} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--accent)' }}>Reference Link</span>
                              </div>
                              <a href={item.value} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ fontSize: '0.85rem', color: 'var(--accent)', wordBreak: 'break-all' }}>
                                {item.value} →
                              </a>
                            </div>
                          )}
                          {item.type === 'text' && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <FileText size={12} style={{ color: 'var(--accent)' }} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--accent)' }}>Text Note</span>
                              </div>
                              <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--foreground)' }}>{item.value}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {status === "ghost" && (
                <div className="absolute bottom-8 right-10 pointer-events-none select-none" style={{ fontFamily: "'Playfair Display', serif", fontSize: "5rem", fontWeight: 700, transform: "rotate(-10deg)", opacity: 0.03 }}>FLAGGED</div>
              )}
            </div>
          </ScrollReveal>

          {/* Voting */}
          <ScrollReveal delay={0.1}>
            <div className="mt-6 bg-card rounded-xl border border-border p-6 md:p-8">
              <h3 className="mb-5" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600 }}>Community Verification</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border text-center bg-emerald-50 border-emerald-200 text-emerald-600">
                  <ThumbsUp size={18} className="mx-auto mb-2" />
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600 }}>{job.upvotes}</p>
                  <p style={{ fontSize: "0.8rem" }}>Upvotes</p>
                </div>
                <div className="p-4 rounded-lg border text-center bg-red-50 border-red-200 text-red-500">
                  <ThumbsDown size={18} className="mx-auto mb-2" />
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600 }}>{job.downvotes}</p>
                  <p style={{ fontSize: "0.8rem" }}>Downvotes</p>
                </div>
                <div className="p-4 rounded-lg border text-center bg-blue-50 border-blue-200 text-blue-600">
                  <MessageSquare size={18} className="mx-auto mb-2" />
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600 }}>{job.reviews.length}</p>
                  <p style={{ fontSize: "0.8rem" }}>Reviews</p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between mb-1.5" style={{ fontSize: "0.75rem" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Community Trust Score</span>
                  <span style={{ fontWeight: 500 }}>{trust}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
                  <motion.div className="h-full rounded-full"
                    style={{ backgroundColor: trust >= 70 ? "#2F6F5E" : trust >= 40 ? "#D4A84A" : "#E5484D" }}
                    initial={{ width: 0 }} whileInView={{ width: `${trust}%` }} viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }} />
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Vote Buttons */}
          <ScrollReveal delay={0.15}>
            <div className="mt-6">
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => handleVote('upvote')}
                  disabled={voting || !user}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-all duration-200 disabled:opacity-50 ${
                    userVote === 'upvote'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                      : 'bg-card border-border hover:border-emerald-300'
                  }`}
                  style={{ fontSize: "0.85rem" }}
                >
                  <ThumbsUp size={16} fill={userVote === 'upvote' ? 'currentColor' : 'none'} /> 
                  {userVote === 'upvote' ? 'Upvoted' : 'Upvote'}
                </button>
                <button
                  onClick={() => handleVote('downvote')}
                  disabled={voting || !user}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-all duration-200 disabled:opacity-50 ${
                    userVote === 'downvote'
                      ? 'bg-red-50 border-red-400 text-red-600'
                      : 'bg-card border-border hover:border-red-300'
                  }`}
                  style={{ fontSize: "0.85rem" }}
                >
                  <ThumbsDown size={16} fill={userVote === 'downvote' ? 'currentColor' : 'none'} /> 
                  {userVote === 'downvote' ? 'Downvoted' : 'Downvote'}
                </button>
              </div>
              {userVote && (
                <p className="mt-2" style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                  Click again to undo your vote
                </p>
              )}
              {!user && (
                <p className="mt-2" style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                  Log in to vote on this report
                </p>
              )}
            </div>
          </ScrollReveal>

          {/* Reviews */}
          <ScrollReveal delay={0.2}>
            <div className="mt-8">
              <h3 className="mb-5" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600 }}>
                Reviews ({job.reviews.length})
              </h3>
              {job.reviews.length > 0 ? (
                <div className="space-y-4">
                  {job.reviews.map((review, i) => (
                    <motion.div key={review._id} className="bg-card rounded-xl border border-border p-5"
                      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <MessageSquare size={14} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{review.author}</span>
                            <span className="flex items-center gap-0.5 text-amber-500">
                              {[...Array(5)].map((_, s) => (
                                <Star key={s} size={10} fill={s < review.rating ? "currentColor" : "none"} />
                              ))}
                            </span>
                          </div>
                          <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>{review.comment}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>No reviews yet. Be the first to share your experience.</p>
              )}

              {/* Add Review */}
              <div className="mt-6 bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-3" style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                  <MessageSquare size={12} /> Add a Review
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Rating:</span>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setRating(s)} className="transition-colors">
                      <Star size={18} className={s <= rating ? "text-amber-500" : "text-gray-300"} fill={s <= rating ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border focus:border-accent focus:outline-none focus:ring-0 resize-none transition-all duration-200"
                  rows={3}
                  placeholder={user ? "Share your experience with this listing..." : "Log in to add a review"}
                  disabled={!user}
                  style={{ fontSize: "0.85rem", lineHeight: 1.6, backgroundColor: "var(--background)" }}
                />
                <div className="mt-3 flex items-center justify-between">
                  <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Be factual and constructive</p>
                  <button
                    onClick={handleAddReview}
                    className="px-5 py-2 rounded-lg transition-shadow duration-200 hover:shadow-md disabled:opacity-50"
                    style={{ fontSize: "0.85rem", backgroundColor: "var(--accent)", color: "white" }}
                    disabled={!newComment.trim() || submittingReview || !user}
                  >
                    {submittingReview ? 'Posting...' : 'Post Review'}
                  </button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
