import { Send, Paperclip, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

export function ReportSubmission() {
  const [formData, setFormData] = useState({
    company: "",
    role: "",
    location: "",
    experience: "ghost",
    description: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all duration-200";

  return (
    <AnimatePresence mode="wait">
      {submitted ? (
        <motion.div
          key="success"
          className="bg-card rounded-xl border border-border p-10 text-center shadow-sm relative overflow-hidden"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </motion.div>
          <motion.h3
            style={{ fontSize: "1.3rem" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Report Submitted
          </motion.h3>
          <motion.p
            className="text-muted-foreground mt-2"
            style={{ fontSize: "0.9rem" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Your report has been filed and is pending community verification.
          </motion.p>

          {/* Stamp watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
            <div
              className="border-4 border-emerald-600 rounded-lg px-8 py-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "2rem",
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
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          className="bg-card rounded-xl border border-border p-8 shadow-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Document header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-dashed border-border">
            <div className="w-3 h-3 rounded-full border-2 border-accent" />
            <h3 style={{ fontSize: "1.2rem" }}>New Report Filing</h3>
            <span className="ml-auto text-muted-foreground opacity-60" style={{ fontSize: "0.75rem" }}>
              Confidential
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block mb-1.5 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                Company Name
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
                Job Title
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
                Experience Type
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
                <option value="legitimate">Legitimate Posting</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="block mb-1.5 text-muted-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
              Your Experience
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`${inputClass} resize-none`}
              rows={4}
              placeholder="Describe your application experience. What happened? How long did it take? Did you hear back?"
              style={{ fontSize: "0.875rem" }}
              required
            />
          </div>

          <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
            <button
              type="button"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
              style={{ fontSize: "0.85rem" }}
            >
              <Paperclip size={16} /> Attach evidence
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-accent text-accent-foreground px-6 py-2.5 rounded-lg transition-shadow duration-200 hover:shadow-md"
              style={{ fontSize: "0.9rem" }}
            >
              <Send size={16} /> Submit Report
            </button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
