import { useParams, Link } from "react-router";
import { motion } from "motion/react";
import {
  Building2, Globe, Users as UsersIcon, Calendar, TrendingUp, TrendingDown,
  FileText, AlertTriangle, CheckCircle2, ArrowLeft, ExternalLink,
} from "lucide-react";
import { getCompanyBySlug, getReportsForCompany } from "../data/mockData";
import { TrustScoreBadge } from "../components/TrustScoreBadge";
import { ReportCard } from "../components/ReportCard";
import { ScrollReveal } from "../components/ScrollReveal";

export function CompanyProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const company = getCompanyBySlug(slug || "");
  const reports = getReportsForCompany(slug || "");

  if (!company) {
    return (
      <div className="pt-36 pb-24 text-center">
        <div className="max-w-md mx-auto px-6">
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 600 }}>
            Company Not Found
          </h1>
          <p className="text-muted-foreground mt-3" style={{ fontSize: "0.9rem" }}>
            This company file does not exist in our archive.
          </p>
          <Link
            to="/companies"
            className="inline-flex items-center gap-2 text-accent mt-6 hover:text-accent/80 transition-colors"
            style={{ fontSize: "0.9rem" }}
          >
            <ArrowLeft size={16} /> Back to companies
          </Link>
        </div>
      </div>
    );
  }

  const ghostCount = reports.filter((r) => r.status === "ghost").length;
  const suspiciousCount = reports.filter((r) => r.status === "suspicious").length;
  const legitimateCount = reports.filter((r) => r.status === "legitimate").length;

  return (
    <>
      {/* Back nav */}
      <div className="pt-28 md:pt-32">
        <div className="max-w-6xl mx-auto px-6">
          <Link
            to="/companies"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
            style={{ fontSize: "0.85rem" }}
          >
            <ArrowLeft size={14} /> Back to companies
          </Link>
        </div>
      </div>

      {/* Company Header */}
      <section className="pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="bg-card rounded-xl border border-border p-8 md:p-10 shadow-sm relative overflow-hidden">
              {/* Archive tab */}
              <div
                className="absolute top-0 left-8 bg-secondary px-4 py-1.5 rounded-b-md border-x border-b border-border"
                style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.05em" }}
              >
                COMPANY FILE #{company.slug.slice(0, 8).toUpperCase()}
              </div>

              <div className="mt-4 flex flex-col md:flex-row items-start gap-6 md:gap-10">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>
                      {company.name}
                    </h1>
                    <TrustScoreBadge score={company.trustScore} size="md" />
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                    <span className="flex items-center gap-1.5"><Building2 size={14} /> {company.industry}</span>
                    <span className="flex items-center gap-1.5"><Globe size={14} /> {company.location}</span>
                    <span className="flex items-center gap-1.5"><UsersIcon size={14} /> {company.employees} employees</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> Founded {company.founded}</span>
                  </div>
                  <div className="mt-3">
                    <a
                      href={`https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-accent hover:text-accent/80 transition-colors duration-200"
                      style={{ fontSize: "0.8rem" }}
                    >
                      {company.website} <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Dashed separator */}
              <div className="my-6 border-t border-dashed border-border" />

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Total Reports",
                    value: company.totalReports,
                    icon: <FileText size={16} className="text-muted-foreground" />,
                  },
                  {
                    label: "Ghost Job Rate",
                    value: `${company.ghostJobRate}%`,
                    icon: company.trend === "down"
                      ? <TrendingDown size={16} className="text-emerald-600" />
                      : <TrendingUp size={16} className="text-red-500" />,
                  },
                  {
                    label: "Trust Score",
                    value: `${company.trustScore}%`,
                    icon: company.trustScore >= 70
                      ? <CheckCircle2 size={16} className="text-emerald-600" />
                      : <AlertTriangle size={16} className="text-amber-500" />,
                  },
                  {
                    label: "Ghost Rate Trend",
                    value: company.trend === "down" ? "Declining" : "Increasing",
                    icon: company.trend === "down"
                      ? <TrendingDown size={16} className="text-emerald-600" />
                      : <TrendingUp size={16} className="text-red-500" />,
                  },
                ].map((metric) => (
                  <div key={metric.label} className="p-4 bg-background rounded-lg text-center">
                    <div className="flex items-center justify-center mb-2">{metric.icon}</div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600 }}>
                      {metric.value}
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{metric.label}</p>
                  </div>
                ))}
              </div>

              {/* Decorative stamp */}
              {company.trustScore < 30 && (
                <div
                  className="absolute bottom-6 right-8 pointer-events-none select-none opacity-[0.03]"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "4rem", fontWeight: 700, transform: "rotate(-10deg)" }}
                >
                  FLAGGED
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Monthly Trend */}
      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="bg-card rounded-xl border border-border p-6 md:p-8">
              <h3
                className="mb-6"
                style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600 }}
              >
                Monthly Report Activity
              </h3>
              <div className="grid grid-cols-6 gap-3">
                {company.monthlyData.map((m, i) => (
                  <motion.div
                    key={m.month}
                    className="text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                  >
                    <div className="relative h-24 flex items-end justify-center mb-2">
                      <motion.div
                        className="w-8 rounded-t-md"
                        style={{
                          backgroundColor: m.ghostRate > 60 ? "#E5484D" : m.ghostRate > 35 ? "#D4A84A" : "#2F6F5E",
                          opacity: 0.7,
                        }}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(m.ghostRate, 8)}%` }}
                        transition={{ duration: 0.5, delay: 0.2 + i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                      />
                    </div>
                    <p style={{ fontSize: "0.7rem", fontWeight: 500 }}>{m.month}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
                      {m.reports} reports
                    </p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-dashed border-border flex items-center gap-6 text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#E5484D", opacity: 0.7 }} />
                  High ghost rate (&gt;60%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#D4A84A", opacity: 0.7 }} />
                  Moderate (35-60%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#2F6F5E", opacity: 0.7 }} />
                  Low (&lt;35%)
                </span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Report Breakdown */}
      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="bg-card rounded-xl border border-border p-6 md:p-8">
              <h3 className="mb-5" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600 }}>
                Report Breakdown
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Ghost Jobs", count: ghostCount, color: "bg-red-50 text-red-700 border-red-200" },
                  { label: "Suspicious", count: suspiciousCount, color: "bg-amber-50 text-amber-700 border-amber-200" },
                  { label: "Legitimate", count: legitimateCount, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                ].map((cat) => (
                  <div key={cat.label} className={`p-4 rounded-lg border text-center ${cat.color}`}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600 }}>
                      {cat.count}
                    </p>
                    <p style={{ fontSize: "0.8rem" }}>{cat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Recent Reports */}
      <section className="pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <h3
              className="mb-6"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600 }}
            >
              Recent Reports for {company.name}
            </h3>
          </ScrollReveal>
          {reports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((r, i) => (
                <ReportCard key={r.id} {...r} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground" style={{ fontSize: "0.9rem" }}>
                No reports found for this company yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
