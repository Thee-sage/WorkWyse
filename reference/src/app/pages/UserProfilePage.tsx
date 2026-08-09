import { motion } from "motion/react";
import { Link } from "react-router";
import {
  ShieldCheck, FileText, ThumbsUp, ThumbsDown, Award, Calendar,
  ArrowRight, TrendingUp, Star, Clock,
} from "lucide-react";
import { mockUser, getReportsByUser } from "../data/mockData";
import { TrustScoreBadge } from "../components/TrustScoreBadge";
import { ReportCard } from "../components/ReportCard";
import { ScrollReveal } from "../components/ScrollReveal";
import { PageHeader } from "../components/PageHeader";

export function UserProfilePage() {
  const user = mockUser;
  const userReports = getReportsByUser(user.id);

  return (
    <>
      <PageHeader
        label="Your Profile"
        title={user.name}
        description={`Member since ${user.joinDate} — ${user.reputationLevel}`}
      />

      <section className="pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          {/* Profile Card */}
          <ScrollReveal>
            <div className="bg-card rounded-xl border border-border p-8 md:p-10 shadow-sm relative overflow-hidden">
              {/* Archive tab */}
              <div
                className="absolute top-0 left-8 bg-secondary px-4 py-1.5 rounded-b-md border-x border-b border-border"
                style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.05em" }}
              >
                INVESTIGATOR PROFILE
              </div>

              <div className="mt-4 flex flex-col md:flex-row items-start gap-8">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <span
                    className="text-accent"
                    style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}
                  >
                    {user.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600 }}>
                      {user.name}
                    </h2>
                    <TrustScoreBadge score={user.trustScore} size="md" />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                    <span className="flex items-center gap-1.5">
                      <Award size={14} /> {user.reputationLevel}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} /> Member since {user.joinDate}
                    </span>
                  </div>

                  {/* Trust score bar */}
                  <div className="mt-5 max-w-md">
                    <div className="flex justify-between mb-1.5" style={{ fontSize: "0.75rem" }}>
                      <span className="text-muted-foreground">Reputation Score</span>
                      <span style={{ fontWeight: 500 }}>{user.trustScore}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: user.trustScore >= 70 ? "#2F6F5E" : user.trustScore >= 40 ? "#D4A84A" : "#E5484D",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${user.trustScore}%` }}
                        transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashed separator */}
              <div className="my-6 border-t border-dashed border-border" />

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <FileText size={18} className="text-accent" />, value: user.reportsSubmitted, label: "Reports Filed" },
                  { icon: <ThumbsUp size={18} className="text-emerald-600" />, value: user.confirmationsGiven, label: "Confirmations" },
                  { icon: <ThumbsDown size={18} className="text-red-500" />, value: user.disputesFiled, label: "Disputes" },
                  { icon: <TrendingUp size={18} className="text-accent" />, value: `${user.trustScore}%`, label: "Trust Score" },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 bg-background rounded-lg text-center">
                    <div className="flex items-center justify-center mb-2">{stat.icon}</div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600 }}>
                      {stat.value}
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Decorative stamp */}
              <div
                className="absolute bottom-6 right-8 pointer-events-none select-none opacity-[0.03]"
                style={{ fontFamily: "'Playfair Display', serif", fontSize: "3.5rem", fontWeight: 700, transform: "rotate(-10deg)" }}
              >
                TRUSTED
              </div>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Badges */}
            <ScrollReveal delay={0.1} className="lg:col-span-1">
              <div className="bg-card rounded-xl border border-border p-6 h-full">
                <h3 className="mb-4" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600 }}>
                  Badges Earned
                </h3>
                <div className="space-y-3">
                  {user.badges.map((badge, i) => (
                    <motion.div
                      key={badge.label}
                      className="flex items-start gap-3 p-3 bg-background rounded-lg"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.06 }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Star size={14} className="text-accent" />
                      </div>
                      <div>
                        <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>{badge.label}</p>
                        <p className="text-muted-foreground" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
                          {badge.description}
                        </p>
                        <p className="text-muted-foreground mt-1 opacity-60" style={{ fontSize: "0.7rem" }}>
                          {badge.date}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Activity log */}
            <ScrollReveal delay={0.15} className="lg:col-span-2">
              <div className="bg-card rounded-xl border border-border p-6 h-full">
                <h3 className="mb-4" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600 }}>
                  Recent Activity
                </h3>
                <div className="space-y-0">
                  {user.activityLog.map((entry, i) => (
                    <motion.div
                      key={i}
                      className="flex items-start gap-4 py-3 border-b border-dashed border-border last:border-0"
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.25, delay: i * 0.04 }}
                    >
                      <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0 mt-0.5">
                        <Clock size={14} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                          {entry.action}
                        </p>
                        <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                          {entry.date}
                        </p>
                      </div>
                      {entry.targetId && (
                        <Link
                          to={`/reports/${entry.targetId}`}
                          className="text-accent hover:text-accent/80 transition-colors duration-200 shrink-0"
                        >
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Your Reports */}
          <ScrollReveal delay={0.2}>
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600 }}>
                  Your Reports
                </h3>
                <Link
                  to="/submit"
                  className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors duration-200"
                  style={{ fontSize: "0.85rem" }}
                >
                  File new report <ArrowRight size={14} />
                </Link>
              </div>
              {userReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userReports.map((report, i) => (
                    <ReportCard key={report.id} {...report} index={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <p className="text-muted-foreground" style={{ fontSize: "0.9rem" }}>
                    You haven't filed any reports yet.
                  </p>
                  <Link
                    to="/submit"
                    className="inline-flex items-center gap-2 text-accent mt-3 hover:text-accent/80 transition-colors"
                    style={{ fontSize: "0.85rem" }}
                  >
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
