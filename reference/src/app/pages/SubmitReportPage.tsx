import { Send, Paperclip, CheckCircle2, Upload, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { ScrollReveal } from "../components/ScrollReveal";

export function SubmitReportPage() {
  const [formData, setFormData] = useState({
    company: "",
    role: "",
    location: "",
    experience: "ghost",
    salaryListed: "",
    salaryActual: "",
    applicationDate: "",
    responseTime: "none",
    description: "",
    evidence: [] as string[],
    anonymous: true,
  });
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all duration-200";

  const handleAddEvidence = () => {
    setFormData({
      ...formData,
      evidence: [...formData.evidence, `Evidence_${formData.evidence.length + 1}.png`],
    });
  };

  return (
    <>
      <PageHeader
        label="File a Report"
        title="Report Your Experience"
        description="Document your job application experience to help the community identify ghost listings and misleading hiring practices."
      />

      <section className="pb-24 md:pb-32">
        <div className="max-w-3xl mx-auto px-6">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                className="bg-card rounded-xl border border-border p-12 text-center shadow-sm relative overflow-hidden"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <motion.div
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 flex items-center justify-center"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </motion.div>
                <motion.h2
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Report Successfully Filed
                </motion.h2>
                <motion.p
                  className="text-muted-foreground mt-3 max-w-md mx-auto"
                  style={{ fontSize: "0.9rem", lineHeight: 1.7 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Your report has been submitted and is pending community verification. Other job seekers will be able to confirm or provide additional context.
                </motion.p>
                <motion.div
                  className="mt-8 flex items-center justify-center gap-4 flex-wrap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Link
                    to="/reports"
                    className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg hover:shadow-md transition-shadow duration-200"
                    style={{ fontSize: "0.9rem" }}
                  >
                    View Reports
                  </Link>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setStep(1);
                      setFormData({
                        company: "", role: "", location: "", experience: "ghost",
                        salaryListed: "", salaryActual: "", applicationDate: "",
                        responseTime: "none", description: "", evidence: [], anonymous: true,
                      });
                    }}
                    className="text-accent hover:text-accent/80 transition-colors duration-200 px-6 py-2.5"
                    style={{ fontSize: "0.9rem" }}
                  >
                    File Another Report
                  </button>
                </motion.div>

                {/* Stamp watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                  <div
                    className="border-4 border-emerald-600 rounded-lg px-10 py-5"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "2.5rem",
                      fontWeight: 700,
                      color: "#2F6F5E",
                      transform: "rotate(-8deg)",
                    }}
                  >
                    FILED
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Progress steps */}
                <div className="mb-8">
                  <div className="flex items-center gap-3">
                    {[
                      { num: 1, label: "Listing Details" },
                      { num: 2, label: "Your Experience" },
                      { num: 3, label: "Evidence & Review" },
                    ].map((s, i) => (
                      <div key={s.num} className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => s.num < step + 1 && setStep(s.num)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                            step >= s.num
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                          style={{ fontSize: "0.8rem", fontWeight: 500 }}
                        >
                          {s.num}
                        </button>
                        <span
                          className={`hidden sm:inline transition-colors duration-200 ${
                            step >= s.num ? "text-foreground" : "text-muted-foreground"
                          }`}
                          style={{ fontSize: "0.8rem" }}
                        >
                          {s.label}
                        </span>
                        {i < 2 && (
                          <div className={`flex-1 h-px transition-colors duration-200 ${
                            step > s.num ? "bg-accent" : "bg-border"
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
                    {/* Document header */}
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-dashed border-border">
                      <div className="w-3 h-3 rounded-full border-2 border-accent" />
                      <h3 style={{ fontSize: "1.15rem" }}>
                        {step === 1 ? "Listing Details" : step === 2 ? "Your Experience" : "Evidence & Review"}
                      </h3>
                      <span className="ml-auto text-muted-foreground opacity-60" style={{ fontSize: "0.75rem" }}>
                        Report Filing &mdash; Step {step} of 3
                      </span>
                    </div>

                    <AnimatePresence mode="wait">
                      {/* Step 1: Listing Details */}
                      {step === 1 && (
                        <motion.div
                          key="step1"
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-5"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block mb-1.5 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                Company Name *
                              </label>
                              <input
                                type="text"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                className={inputClass}
                                placeholder="e.g. Acme Corp"
                                style={{ fontSize: "0.875rem" }}
                                required
                              />
                            </div>
                            <div>
                              <label className="block mb-1.5 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                Job Title *
                              </label>
                              <input
                                type="text"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className={inputClass}
                                placeholder="e.g. Senior Developer"
                                style={{ fontSize: "0.875rem" }}
                                required
                              />
                            </div>
                            <div>
                              <label className="block mb-1.5 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                Location
                              </label>
                              <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className={inputClass}
                                placeholder="e.g. Remote / New York, NY"
                                style={{ fontSize: "0.875rem" }}
                              />
                            </div>
                            <div>
                              <label className="block mb-1.5 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                Application Date
                              </label>
                              <input
                                type="date"
                                value={formData.applicationDate}
                                onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
                                className={inputClass}
                                style={{ fontSize: "0.875rem" }}
                              />
                            </div>
                            <div>
                              <label className="block mb-1.5 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                Listed Salary Range
                              </label>
                              <input
                                type="text"
                                value={formData.salaryListed}
                                onChange={(e) => setFormData({ ...formData, salaryListed: e.target.value })}
                                className={inputClass}
                                placeholder="e.g. $80K - $120K"
                                style={{ fontSize: "0.875rem" }}
                              />
                            </div>
                            <div>
                              <label className="block mb-1.5 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                Actual/Offered Salary
                              </label>
                              <input
                                type="text"
                                value={formData.salaryActual}
                                onChange={(e) => setFormData({ ...formData, salaryActual: e.target.value })}
                                className={inputClass}
                                placeholder="e.g. $55K (if different)"
                                style={{ fontSize: "0.875rem" }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 2: Experience */}
                      {step === 2 && (
                        <motion.div
                          key="step2"
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-5"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block mb-1.5 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                Experience Type *
                              </label>
                              <select
                                value={formData.experience}
                                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                className={inputClass}
                                style={{ fontSize: "0.875rem" }}
                              >
                                <option value="ghost">Ghost Job (No real hiring)</option>
                                <option value="reposted">Reposted Listing</option>
                                <option value="misleading">Misleading Description</option>
                                <option value="salary-bait">Salary Bait-and-Switch</option>
                                <option value="free-labor">Free Labor / Consulting Project</option>
                                <option value="legitimate">Legitimate Posting</option>
                              </select>
                            </div>
                            <div>
                              <label className="block mb-1.5 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                Response Time
                              </label>
                              <select
                                value={formData.responseTime}
                                onChange={(e) => setFormData({ ...formData, responseTime: e.target.value })}
                                className={inputClass}
                                style={{ fontSize: "0.875rem" }}
                              >
                                <option value="none">No response at all</option>
                                <option value="1week">Within 1 week</option>
                                <option value="2weeks">Within 2 weeks</option>
                                <option value="1month">Within 1 month</option>
                                <option value="2months">1-2 months</option>
                                <option value="3months">Over 2 months</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block mb-1.5 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                              Detailed Description *
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className={`${inputClass} resize-none`}
                              rows={8}
                              placeholder="Describe your complete application experience in detail. Include timeline, communication (or lack thereof), interview process, and any red flags you noticed. The more detail, the more helpful your report will be to the community."
                              style={{ fontSize: "0.875rem", lineHeight: 1.6 }}
                              required
                            />
                            <p className="mt-1.5 text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                              {formData.description.length} characters &middot; Minimum recommended: 200
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3: Evidence & Review */}
                      {step === 3 && (
                        <motion.div
                          key="step3"
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-6"
                        >
                          {/* Evidence upload */}
                          <div>
                            <label className="block mb-2 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                              Supporting Evidence (Optional)
                            </label>
                            <div
                              onClick={handleAddEvidence}
                              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent/30 transition-colors duration-200"
                            >
                              <Upload size={24} className="mx-auto text-muted-foreground mb-3" />
                              <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                                Click to add screenshots, emails, or other evidence
                              </p>
                              <p className="text-muted-foreground opacity-60 mt-1" style={{ fontSize: "0.75rem" }}>
                                PNG, JPG, PDF up to 10MB each
                              </p>
                            </div>
                            {formData.evidence.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {formData.evidence.map((file, i) => (
                                  <div key={i} className="flex items-center gap-3 p-2.5 bg-background rounded-lg">
                                    <FileText size={14} className="text-muted-foreground" />
                                    <span style={{ fontSize: "0.8rem" }}>{file}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFormData({
                                          ...formData,
                                          evidence: formData.evidence.filter((_, j) => j !== i),
                                        })
                                      }
                                      className="ml-auto text-muted-foreground hover:text-red-500 transition-colors"
                                      style={{ fontSize: "0.75rem" }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Anonymous toggle */}
                          <div className="flex items-center gap-3 p-4 bg-background rounded-lg">
                            <input
                              type="checkbox"
                              checked={formData.anonymous}
                              onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
                              className="w-4 h-4 rounded border-border accent-accent"
                            />
                            <div>
                              <p style={{ fontSize: "0.85rem" }}>Submit anonymously</p>
                              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                                Your identity will be hidden from the public report
                              </p>
                            </div>
                          </div>

                          {/* Review summary */}
                          <div className="p-5 bg-background rounded-lg border border-dashed border-border">
                            <p className="text-muted-foreground mb-3" style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                              Report Summary
                            </p>
                            <div className="space-y-2" style={{ fontSize: "0.85rem" }}>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Company</span>
                                <span>{formData.company || "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Position</span>
                                <span>{formData.role || "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Location</span>
                                <span>{formData.location || "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Type</span>
                                <span className="capitalize">{formData.experience.replace("-", " ")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Evidence</span>
                                <span>{formData.evidence.length} file{formData.evidence.length !== 1 ? "s" : ""}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="mt-8 pt-6 border-t border-dashed border-border flex items-center justify-between">
                      {step > 1 ? (
                        <button
                          type="button"
                          onClick={() => setStep(step - 1)}
                          className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                          style={{ fontSize: "0.85rem" }}
                        >
                          &larr; Previous
                        </button>
                      ) : (
                        <div />
                      )}

                      {step < 3 ? (
                        <button
                          type="button"
                          onClick={() => setStep(step + 1)}
                          className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg transition-shadow duration-200 hover:shadow-md"
                          style={{ fontSize: "0.9rem" }}
                        >
                          Continue &rarr;
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="flex items-center gap-2 bg-accent text-accent-foreground px-6 py-2.5 rounded-lg transition-shadow duration-200 hover:shadow-md"
                          style={{ fontSize: "0.9rem" }}
                        >
                          <Send size={16} /> Submit Report
                        </button>
                      )}
                    </div>
                  </div>
                </form>

                {/* Guidance note */}
                <ScrollReveal delay={0.2}>
                  <div className="mt-8 p-5 bg-card rounded-xl border border-border" style={{ fontSize: "0.8rem" }}>
                    <p className="text-muted-foreground mb-2" style={{ fontWeight: 500 }}>
                      Reporting Guidelines
                    </p>
                    <ul className="space-y-1.5 text-muted-foreground" style={{ lineHeight: 1.6 }}>
                      <li>&bull; Be factual and specific — include dates, timelines, and details</li>
                      <li>&bull; Avoid naming individuals — focus on company practices and processes</li>
                      <li>&bull; Include supporting evidence when possible for faster verification</li>
                      <li>&bull; Positive reports help too — document good hiring practices</li>
                    </ul>
                  </div>
                </ScrollReveal>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}
