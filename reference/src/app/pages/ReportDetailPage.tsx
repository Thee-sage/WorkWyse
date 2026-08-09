import { useParams, Link } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft, MapPin, Clock, Users, AlertTriangle, CheckCircle, Flag,
  ThumbsUp, ThumbsDown, MessageSquare, FileText, ShieldCheck, Calendar,
  Paperclip,
} from "lucide-react";
import { getReportById } from "../data/mockData";
import { TrustScoreBadge } from "../components/TrustScoreBadge";
import { ScrollReveal } from "../components/ScrollReveal";
import { useState } from "react";

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const report = getReportById(id || "");
  const [newComment, setNewComment] = useState("");
  const [userAction, setUserAction] = useState<"confirm" | "dispute" | null>(null);

  if (!report) {
    return (
      <div className="pt-36 pb-24 text-center">
        <div className="max-w-md mx-auto px-6">
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 600 }}>
            Report Not Found
          </h1>
          <p className="text-muted-foreground mt-3" style={{ fontSize: "0.9rem" }}>
            This report does not exist in our archive.
          </p>
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 text-accent mt-6 hover:text-accent/80 transition-colors"
            style={{ fontSize: "0.9rem" }}
          >
            <ArrowLeft size={16} /> Back to reports
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = {
    ghost: { label: "Ghost Job", icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-200", accent: "#E5484D" },
    legitimate: { label: "Legitimate", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-200", accent: "#2F6F5E" },
    suspicious: { label: "Suspicious", icon: Flag, color: "text-amber-600 bg-amber-50 border-amber-200", accent: "#D4A84A" },
  };

  const s = statusConfig[report.status];
  const StatusIcon = s.icon;

  const confirmations = report.comments.filter((c) => c.type === "confirmation");
  const disputes = report.comments.filter((c) => c.type === "dispute");
  const discussions = report.comments.filter((c) => c.type === "discussion");

  const commentTypeConfig = {
    confirmation: { icon: ThumbsUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "Confirmed" },
    dispute: { icon: ThumbsDown, color: "text-red-500", bg: "bg-red-50", label: "Disputed" },
    discussion: { icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50", label: "Discussion" },
  };

  return (
    <>
      {/* Back nav */}
      <div className="pt-28 md:pt-32">
        <div className="max-w-4xl mx-auto px-6">
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
            style={{ fontSize: "0.85rem" }}
          >
            <ArrowLeft size={14} /> Back to reports
          </Link>
        </div>
      </div>

      <section className="pt-6 pb-24 md:pb-32">
        <div className="max-w-4xl mx-auto px-6">
          {/* Main Report Document */}
          <ScrollReveal>
            <div className="bg-card rounded-xl border border-border shadow-sm relative overflow-hidden">
              {/* Document header */}
              <div className="p-8 md:p-10">
                {/* Archive label */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-dashed border-border">
                  <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: s.accent }} />
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Report #{report.id.replace("rpt-", "")}
                  </span>
                  <span
                    className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${s.color}`}
                    style={{ fontSize: "0.75rem", fontWeight: 500 }}
                  >
                    <StatusIcon size={12} />
                    {s.label}
                  </span>
                </div>

                {/* Title & Meta */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600 }}>
                      {report.role}
                    </h1>
                    <Link
                      to={`/companies/${report.companySlug}`}
                      className="text-accent hover:text-accent/80 transition-colors duration-200 mt-1 inline-block"
                      style={{ fontSize: "0.95rem" }}
                    >
                      {report.company}
                    </Link>
                  </div>
                  <TrustScoreBadge score={report.trustScore} size="md" confirmations={report.confirmations} expandable />
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-4 mt-4" style={{ fontSize: "0.8rem" }}>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin size={13} /> {report.location}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar size={13} /> Posted {report.datePosted}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users size={13} /> {report.confirmations} confirmations
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText size={13} /> Filed by {report.authorName}
                  </span>
                </div>

                {/* Full description */}
                <div className="mt-8">
                  <div className="text-muted-foreground mb-3" style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Full Report
                  </div>
                  <div
                    className="prose-sm text-foreground"
                    style={{ fontSize: "0.9rem", lineHeight: 1.8 }}
                  >
                    {report.fullDescription.split("\n\n").map((para, i) => (
                      <p key={i} className={i > 0 ? "mt-4" : ""}>
                        {para}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Evidence */}
                {report.evidence && report.evidence.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-dashed border-border">
                    <div className="text-muted-foreground mb-3 flex items-center gap-2" style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      <Paperclip size={12} /> Supporting Evidence
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.evidence.map((ev, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border"
                          style={{ fontSize: "0.8rem" }}
                        >
                          <FileText size={14} className="text-muted-foreground" />
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stamp watermark */}
              {report.status === "ghost" && (
                <div
                  className="absolute bottom-8 right-10 pointer-events-none select-none opacity-[0.03]"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "5rem", fontWeight: 700, transform: "rotate(-10deg)" }}
                >
                  FLAGGED
                </div>
              )}
              {report.status === "legitimate" && (
                <div
                  className="absolute bottom-8 right-10 pointer-events-none select-none opacity-[0.03]"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "4rem", fontWeight: 700, transform: "rotate(-8deg)" }}
                >
                  VERIFIED
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Trust Score Breakdown */}
          <ScrollReveal delay={0.1}>
            <div className="mt-6 bg-card rounded-xl border border-border p-6 md:p-8">
              <h3 className="mb-5" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600 }}>
                Verification Summary
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Confirmations", count: confirmations.length, icon: ThumbsUp, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
                  { label: "Disputes", count: disputes.length, icon: ThumbsDown, color: "text-red-500 bg-red-50 border-red-200" },
                  { label: "Discussion", count: discussions.length, icon: MessageSquare, color: "text-blue-600 bg-blue-50 border-blue-200" },
                ].map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <div key={cat.label} className={`p-4 rounded-lg border text-center ${cat.color}`}>
                      <CatIcon size={18} className="mx-auto mb-2" />
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600 }}>
                        {cat.count}
                      </p>
                      <p style={{ fontSize: "0.8rem" }}>{cat.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Trust bar */}
              <div className="mt-6">
                <div className="flex justify-between mb-1.5" style={{ fontSize: "0.75rem" }}>
                  <span className="text-muted-foreground">Community Trust Score</span>
                  <span style={{ fontWeight: 500 }}>{report.trustScore}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: report.trustScore >= 70 ? "#2F6F5E" : report.trustScore >= 40 ? "#D4A84A" : "#E5484D",
                    }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${report.trustScore}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Action buttons */}
          <ScrollReveal delay={0.15}>
            <div className="mt-6 flex gap-3 flex-wrap">
              <button
                onClick={() => setUserAction(userAction === "confirm" ? null : "confirm")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-all duration-200 ${
                  userAction === "confirm"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-card border-border hover:border-emerald-300 text-foreground"
                }`}
                style={{ fontSize: "0.85rem" }}
              >
                <ThumbsUp size={16} />
                {userAction === "confirm" ? "Confirmed" : "Confirm this report"}
              </button>
              <button
                onClick={() => setUserAction(userAction === "dispute" ? null : "dispute")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-all duration-200 ${
                  userAction === "dispute"
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-card border-border hover:border-red-300 text-foreground"
                }`}
                style={{ fontSize: "0.85rem" }}
              >
                <ThumbsDown size={16} />
                {userAction === "dispute" ? "Disputed" : "Dispute this report"}
              </button>
            </div>
          </ScrollReveal>

          {/* Comments */}
          <ScrollReveal delay={0.2}>
            <div className="mt-8">
              <h3 className="mb-5" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600 }}>
                Community Discussion ({report.comments.length})
              </h3>

              <div className="space-y-4">
                {report.comments.map((comment, i) => {
                  const tc = commentTypeConfig[comment.type];
                  const TypeIcon = tc.icon;
                  return (
                    <motion.div
                      key={comment.id}
                      className="bg-card rounded-xl border border-border p-5"
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-full ${tc.bg} flex items-center justify-center`}>
                          <TypeIcon size={14} className={tc.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{comment.authorName}</span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}
                              style={{ fontSize: "0.65rem", fontWeight: 500 }}
                            >
                              {tc.label}
                            </span>
                          </div>
                          <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                            {comment.date}
                          </p>
                        </div>
                      </div>
                      <p className="text-foreground" style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
                        {comment.text}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Add comment */}
              <div className="mt-6 bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-3 text-muted-foreground" style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  <MessageSquare size={12} />
                  Add a Comment
                </div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all duration-200 resize-none"
                  rows={3}
                  placeholder="Share additional context, confirm this experience, or provide a different perspective..."
                  style={{ fontSize: "0.85rem", lineHeight: 1.6 }}
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                    Be factual and constructive
                  </p>
                  <button
                    className="bg-accent text-accent-foreground px-5 py-2 rounded-lg transition-shadow duration-200 hover:shadow-md disabled:opacity-50"
                    style={{ fontSize: "0.85rem" }}
                    disabled={!newComment.trim()}
                  >
                    Post Comment
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
