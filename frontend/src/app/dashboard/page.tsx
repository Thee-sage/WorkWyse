"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../components/AuthContext";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Briefcase,
  AlertTriangle,
  CheckCircle,
  Users,
  TrendingUp,
  FileWarning,
  Shield,
  Building2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface DashboardStats {
  jobs: { total: number; fake: number; real: number; withEvidence: number; verified: number };
  reports: { total: number; pending: number; reviewed: number; dismissed: number };
  users: { total: number; admins: number };
  topCompanies: Array<{ _id: string; count: number }>;
}

interface TrendPoint { date: string; count: number }

// ─── Sub-Components ──────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${color}22`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 3,
          background: `linear-gradient(90deg, ${color}, ${color}44)`,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>
          {label}
        </span>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${color}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} color={color} />
        </div>
      </div>
      <span style={{ fontSize: 36, fontWeight: 700, color: "#fff" }}>
        {value.toLocaleString()}
      </span>
      {sub && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{sub}</span>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 16,
        fontWeight: 600,
        color: "rgba(255,255,255,0.7)",
        margin: "32px 0 16px",
        textTransform: "uppercase",
        letterSpacing: 1,
      }}
    >
      {children}
    </h2>
  );
}

const PIE_COLORS = ["#f87171", "#34d399", "#60a5fa", "#facc15"];

// ─── Main Dashboard Page ─────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobTrend, setJobTrend] = useState<TrendPoint[]>([]);
  const [reportTrend, setReportTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, jobRes, repRes] = await Promise.all([
        api.get<DashboardStats>("/analytics/dashboard"),
        api.get<TrendPoint[]>("/analytics/trends/jobs?days=30"),
        api.get<TrendPoint[]>("/analytics/trends/reports?days=30"),
      ]);
      setStats(statsRes.data);
      setJobTrend(jobRes.data);
      setReportTrend(repRes.data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== "admin" && user.role !== "moderator")) {
        router.push("/login");
      } else {
        fetchAll();
      }
    }
  }, [authLoading, user, router, fetchAll]);

  if (authLoading || loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <AlertTriangle size={48} color="#f87171" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "#f87171" }}>{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const pieData = [
    { name: "Fake Jobs", value: stats.jobs.fake },
    { name: "Real Jobs", value: stats.jobs.real },
    { name: "With Evidence", value: stats.jobs.withEvidence },
    { name: "Verified", value: stats.jobs.verified },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
          Dashboard
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
          Real-time platform analytics and activity overview
        </p>
      </div>

      {/* Stat Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <StatCard label="Total Jobs" value={stats.jobs.total} icon={Briefcase} color="#7c3aed" sub={`${stats.jobs.real} real / ${stats.jobs.fake} fake`} />
        <StatCard label="Pending Reports" value={stats.reports.pending} icon={FileWarning} color="#f59e0b" sub={`${stats.reports.total} total`} />
        <StatCard label="Verified Jobs" value={stats.jobs.verified} icon={CheckCircle} color="#10b981" sub="Verified by moderators" />
        <StatCard label="Total Users" value={stats.users.total} icon={Users} color="#3b82f6" sub={`${stats.users.admins} admins`} />
        <StatCard label="Jobs w/ Evidence" value={stats.jobs.withEvidence} icon={Shield} color="#8b5cf6" />
        <StatCard label="Reports Reviewed" value={stats.reports.reviewed} icon={TrendingUp} color="#06b6d4" sub={`${stats.reports.dismissed} dismissed`} />
      </div>

      {/* Trend Charts */}
      <SectionTitle>Job Submissions — Last 30 Days</SectionTitle>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 8px 8px" }}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={jobTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
              labelStyle={{ color: "rgba(255,255,255,0.5)" }}
            />
            <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#7c3aed" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <SectionTitle>Reports Filed — Last 30 Days</SectionTitle>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 8px 8px" }}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={reportTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
              labelStyle={{ color: "rgba(255,255,255,0.5)" }}
            />
            <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#f59e0b" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 8 }}>
        {/* Donut Chart */}
        <div>
          <SectionTitle>Job Breakdown</SectionTitle>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Companies */}
        <div>
          <SectionTitle>Top Companies Reported</SectionTitle>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
            {stats.topCompanies.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0" }}>No data yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
                {stats.topCompanies.map((c, i) => {
                  const max = stats.topCompanies[0]?.count ?? 1;
                  const pct = Math.round((c.count / max) * 100);
                  return (
                    <div key={c._id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Building2 size={14} color="rgba(255,255,255,0.4)" />
                          <span style={{ fontSize: 14, color: "#fff" }}>{c._id || "Unknown"}</span>
                        </div>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{c.count} jobs</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: PIE_COLORS[i % PIE_COLORS.length], transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
