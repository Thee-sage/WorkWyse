import { motion } from "motion/react";
import { Link } from "react-router";
import { HeroIllustration } from "../components/HeroIllustration";
import { FeatureSection } from "../components/FeatureSection";
import { ReportIllustration, VerificationIllustration, TransparencyIllustration } from "../components/FeatureIllustrations";
import { ReportCard } from "../components/ReportCard";
import { CompanyProfile } from "../components/CompanyProfile";
import { ScrollReveal } from "../components/ScrollReveal";
import { MarkerHighlight } from "../components/MarkerHighlight";
import { TactileButton } from "../components/TactileButton";
import { FileEdit, Users, FolderOpen, ArrowRight } from "lucide-react";
import { mockReports, mockCompanies } from "../data/mockData";

const ease = [0.25, 0.1, 0.25, 1] as const;

export function LandingPage() {
  const featuredReports = mockReports.slice(0, 3);
  const featuredCompanies = mockCompanies.slice(0, 3);

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="pt-28 pb-24 md:pt-36 md:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            <div className="flex-1 max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0, ease }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border mb-6"
                style={{ fontSize: "0.8rem" }}
              >
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-muted-foreground">12,847 reports filed and counting</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease }}
                style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.2rem, 5vw, 3.5rem)", lineHeight: 1.15, fontWeight: 700 }}
              >
                Stop Applying
                <br />
                <span className="relative inline-block">
                  <MarkerHighlight delay={0.7}>Into The Void</MarkerHighlight>
                  <motion.svg
                    className="absolute -bottom-1 left-0 w-full"
                    viewBox="0 0 200 8"
                    preserveAspectRatio="none"
                  >
                    <motion.path
                      d="M 0 6 Q 50 0 100 4 Q 150 8 200 2"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
                    />
                  </motion.svg>
                </span>
              </motion.h1>

              <motion.p
                className="mt-6 text-muted-foreground max-w-md"
                style={{ fontSize: "1.05rem", lineHeight: 1.8 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease }}
              >
                WorkWyse helps job seekers identify ghost listings, fake postings, and misleading hiring processes &mdash; before you waste your time.
              </motion.p>

              <motion.div
                className="mt-8 flex flex-wrap items-center gap-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.32, ease }}
              >
                <Link to="/submit">
                  <TactileButton variant="primary" className="px-7 py-3">
                    Submit a Report
                  </TactileButton>
                </Link>
                <Link to="/reports">
                  <TactileButton variant="secondary" className="px-5 py-3">
                    Browse Reports <ArrowRight size={16} />
                  </TactileButton>
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                className="mt-12 flex gap-8 md:gap-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                {[
                  { value: "12.8K", label: "Reports Filed" },
                  { value: "2,400+", label: "Companies" },
                  { value: "89%", label: "Accuracy Rate" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.55 + i * 0.08 }}
                  >
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600 }}>{stat.value}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <div className="flex-1 flex justify-center">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal className="text-center mb-16 md:mb-24">
            <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              How It Works
            </p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 600 }}>
              Building a Public Archive of{" "}
              <MarkerHighlight delay={0.2}>Hiring Truth</MarkerHighlight>
            </h2>
          </ScrollReveal>

          <div className="space-y-24 md:space-y-32">
            <FeatureSection
              icon={
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <FileEdit className="w-6 h-6 text-accent" />
                </div>
              }
              title="Report Your Experience"
              description="Submit detailed accounts of your job application journey. Document ghost listings, misleading postings, and hiring red flags. Every report becomes part of a growing public record that helps fellow job seekers."
              illustration={<ReportIllustration />}
            />

            <FeatureSection
              icon={
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-700" />
                </div>
              }
              title="Community Verification"
              description="Reports are reviewed and confirmed by other job seekers who had similar experiences. When multiple people corroborate a report, it gains a community verification seal — like signatures on a shared document."
              illustration={<VerificationIllustration />}
              reversed
            />

            <FeatureSection
              icon={
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-amber-700" />
                </div>
              }
              title="Transparent Company Records"
              description="Every company has an open file with their hiring history, ghost job rate, and community trust score. Browse archived records to make informed decisions before you apply."
              illustration={<TransparencyIllustration />}
            />
          </div>
        </div>
      </section>

      {/* ─── Reports ─── */}
      <section className="py-24 md:py-32 bg-secondary/40">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal className="text-center mb-14">
            <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Recent Reports
            </p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 600 }}>
              From the Community Archive
            </h2>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
              Real experiences from real job seekers, verified by the community.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredReports.map((report, i) => (
              <ReportCard key={report.id} {...report} index={i} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/reports"
              className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors duration-200"
              style={{ fontSize: "0.9rem" }}
            >
              View all reports <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Companies ─── */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal className="text-center mb-14">
            <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Company Records
            </p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 600 }}>
              Open Company Files
            </h2>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
              Archived hiring records reviewed and scored by the community.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredCompanies.map((company, i) => (
              <ScrollReveal key={company.slug} delay={i * 0.08}>
                <Link to={`/companies/${company.slug}`}>
                  <CompanyProfile {...company} compact />
                </Link>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/companies"
              className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors duration-200"
              style={{ fontSize: "0.9rem" }}
            >
              View all companies <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-24 md:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <ScrollReveal>
            <div className="bg-card rounded-2xl border border-border p-12 md:p-16 shadow-sm relative overflow-hidden">
              <div className="absolute top-6 left-6 opacity-[0.04] pointer-events-none select-none" style={{ fontFamily: "'Playfair Display', serif", fontSize: "4rem", fontWeight: 700, transform: "rotate(-12deg)" }}>
                VERIFIED
              </div>
              <div className="absolute bottom-6 right-6 opacity-[0.04] pointer-events-none select-none" style={{ fontFamily: "'Playfair Display', serif", fontSize: "3rem", fontWeight: 700, transform: "rotate(8deg)" }}>
                FILED
              </div>

              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 600 }}>
                Every Report Makes Hiring More Honest
              </h2>
              <p className="text-muted-foreground mt-4 max-w-lg mx-auto" style={{ fontSize: "1rem", lineHeight: 1.8 }}>
                Join thousands of job seekers who are building the most transparent archive of hiring practices. Your experience matters.
              </p>
              <div className="mt-8">
                <Link to="/submit">
                  <TactileButton variant="primary" className="px-8 py-3">
                    Submit Your First Report
                  </TactileButton>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}