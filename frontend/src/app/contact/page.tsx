'use client';
import { useState } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { MarkerHighlight } from "@/components/ui/MarkerHighlight";
import { TactileButton } from "@/components/ui/TactileButton";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MessageSquare, Bug, Flag, Check, ChevronDown } from "lucide-react";

const topics = [
  { value: "general", label: "General Question" },
  { value: "report-dispute", label: "Report Dispute / Removal" },
  { value: "company-response", label: "Company Response" },
  { value: "bug", label: "Bug Report" },
  { value: "press", label: "Press / Media Inquiry" },
  { value: "other", label: "Other" },
];

const faq = [
  {
    q: "How do I get a report removed?",
    a: "If you filed the report yourself, you can request removal by emailing us with your report ID. If you're a company requesting removal of a report about you, you'll need to submit a formal dispute with evidence that the report is factually inaccurate.",
  },
  {
    q: "Can companies officially respond to reports?",
    a: "Yes. Any company representative can add a response in the discussion section of a report. We recommend identifying yourself as a company representative so the community can consider the source.",
  },
  {
    q: "How long do responses take?",
    a: "We typically respond to emails within 1–3 business days. Urgent disputes (involving potential defamation) are prioritized and reviewed within 24 hours.",
  },
  {
    q: "Is WorkWyse available in other languages?",
    a: "Currently WorkWyse is English-only. We're working on expanding language support — if you'd like to help with translation, please reach out.",
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", topic: "general", message: "" });

  const updateForm = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));
  const inputClass = "w-full px-4 py-2.5 border border-border rounded-lg focus:border-accent focus:outline-none focus:ring-0 transition-all duration-200";
  const inputStyle = { fontSize: "0.875rem", backgroundColor: "var(--card)" };

  return (
    <>
      {/* Header */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20" style={{ backgroundColor: "rgba(237,236,235,0.4)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>Contact</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, lineHeight: 1.2 }}>
              Get in{" "}
              <MarkerHighlight delay={0.3}>Touch</MarkerHighlight>
            </h1>
            <p className="mt-5 max-w-xl" style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>
              Have a question, a dispute to file, or just want to say hello? We read every message.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact cards */}
            <div className="lg:col-span-1 space-y-4">
              {[
                { icon: Mail, title: "General Inquiries", detail: "hello@workwyse.com", sub: "Response within 1–3 days" },
                { icon: Flag, title: "Disputes & Removals", detail: "disputes@workwyse.com", sub: "Reviewed within 24 hours" },
                { icon: Bug, title: "Report a Bug", detail: "bugs@workwyse.com", sub: "Helps us improve for everyone" },
                { icon: MessageSquare, title: "Press & Media", detail: "press@workwyse.com", sub: "Interviews, data, research" },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <ScrollReveal key={i} delay={i * 0.07}>
                    <div className="bg-card rounded-xl border border-border p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(37,99,235,0.08)" }}>
                        <Icon size={18} style={{ color: "var(--accent)" }} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.2rem" }}>{card.title}</p>
                        <a href={`mailto:${card.detail}`} style={{ fontSize: "0.82rem", color: "var(--accent)" }}>{card.detail}</a>
                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.15rem" }}>{card.sub}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>

            {/* Form */}
            <ScrollReveal className="lg:col-span-2" delay={0.1}>
              <div className="bg-card rounded-xl border border-border p-7 md:p-9 relative overflow-hidden">
                <div className="absolute top-0 left-8 px-3 py-1 rounded-b-md border-x border-b border-border" style={{ fontSize: "0.65rem", fontWeight: 500, backgroundColor: "var(--secondary)" }}>
                  CONTACT FORM
                </div>
                <div className="mt-4">
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem" }}>Send a Message</h2>
                </div>
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(47,111,94,0.1)" }}>
                        <Check size={26} style={{ color: "#2F6F5E" }} />
                      </div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600 }}>Message Sent</h3>
                      <p className="mt-2" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>We&apos;ll get back to you at {form.email} within 1–3 business days.</p>
                    </motion.div>
                  ) : (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-1.5" style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)" }}>Name</label>
                          <input type="text" value={form.name} onChange={e => updateForm("name", e.target.value)} className={inputClass} style={inputStyle} placeholder="Your name" />
                        </div>
                        <div>
                          <label className="block mb-1.5" style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)" }}>Email *</label>
                          <input type="email" value={form.email} onChange={e => updateForm("email", e.target.value)} className={inputClass} style={inputStyle} placeholder="you@email.com" />
                        </div>
                      </div>
                      <div>
                        <label className="block mb-1.5" style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)" }}>Topic</label>
                        <select value={form.topic} onChange={e => updateForm("topic", e.target.value)} className={inputClass} style={inputStyle}>
                          {topics.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1.5" style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)" }}>Message *</label>
                        <textarea value={form.message} onChange={e => updateForm("message", e.target.value)} className={inputClass} rows={5} style={{ ...inputStyle, resize: "none" }} placeholder="Describe your question or issue in detail..." />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>We never share your email with third parties.</p>
                        <TactileButton variant="primary" className="px-6 py-2.5"
                          onClick={() => { if (form.email && form.message) setSubmitted(true); }}
                        >
                          Send Message
                        </TactileButton>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 pb-28 md:pb-36">
        <div className="max-w-3xl mx-auto px-6">
          <ScrollReveal className="mb-10">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>Common Questions</h2>
          </ScrollReveal>
          <div className="space-y-3">
            {faq.map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.06}>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{item.q}</span>
                    <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={18} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }} className="overflow-hidden">
                        <p className="px-5 pb-5" style={{ fontSize: "0.875rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
