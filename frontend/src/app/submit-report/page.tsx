'use client';
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Briefcase, MapPin, DollarSign, CalendarDays, Upload, UserCheck, Check, ChevronRight, AlertTriangle, CheckCircle2, Flag, Link as LinkIcon, Loader2, Sparkles, ChevronDown, ChevronUp, Image, FileText, X, Plus, ExternalLink } from "lucide-react";
import type { Evidence } from "../../types/user";
import { TactileButton } from "../../components/ui/TactileButton";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { useRouter } from "next/navigation";
import type { ExtractionResult } from "../../types/extraction";

type Step = 1 | 2 | 3;
type ReportType = "ghost" | "suspicious" | "legitimate" | "";

const steps = [
  { label: "Listing Details", description: "Company and role information" },
  { label: "Your Experience", description: "What happened during your application" },
  { label: "Evidence & Submit", description: "Additional context and verification" },
];

const reportTypeOptions = [
  { value: "ghost" as const, label: "Ghost Job", icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-200", description: "Position reposted with no hires or responses after extended periods." },
  { value: "suspicious" as const, label: "Suspicious", icon: Flag, color: "text-amber-600 bg-amber-50 border-amber-200", description: "Red flags like bait-and-switch salary, misleading requirements, or excessive unpaid work." },
  { value: "legitimate" as const, label: "Legitimate", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200", description: "Transparent, respectful, and honest hiring process." },
];

type ExtractionStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; result: ExtractionResult }
  | { type: 'error'; message: string };

// ─── Custom Select ──────────────────────────────────────────────────────────
function CustomSelect({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all duration-200"
        style={{
          fontSize: '0.875rem',
          backgroundColor: 'var(--card)',
          borderColor: open ? 'var(--accent)' : 'var(--border)',
          boxShadow: open ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
          color: selected ? 'var(--foreground)' : 'var(--muted-foreground)',
          textAlign: 'left',
        }}
      >
        <span>{selected ? selected.label : (placeholder || 'Select an option')}</span>
        <ChevronDown size={15} style={{
          color: 'var(--muted-foreground)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          flexShrink: 0,
        }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 50,
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            }}
          >
            {options.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2.5 transition-colors duration-150 text-left hover:bg-secondary"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: value === opt.value ? 600 : 400,
                  color: value === opt.value ? 'var(--accent)' : 'var(--foreground)',
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Thought-bubble Hint ──────────────────────────────────────────────────────
function HintField({
  hint,
  show,
  children,
}: {
  hint: string;
  show: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const visible = hovered && show;
  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            key="thought"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '-0.4rem',
              right: 0,
              transform: 'translateY(-100%)',
              maxWidth: '16rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '0.6rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <p style={{
              fontSize: '0.72rem',
              fontStyle: 'italic',
              color: 'var(--muted-foreground)',
              lineHeight: 1.55,
              margin: 0,
            }}>
              {hint}
            </p>
            {/* Tail */}
            <div style={{
              position: 'absolute',
              bottom: '-5px',
              right: '1rem',
              width: '10px',
              height: '10px',
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              borderLeft: 'none',
              transform: 'rotate(45deg)',
              boxShadow: '2px 2px 4px rgba(0,0,0,0.04)',
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubmitReportContent() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [formData, setFormData] = useState({
    company: "", role: "", location: "", jobUrl: "", salary: "",
    description: "", responseTime: "", wasContacted: false,
  });
  const [answers, setAnswers] = useState({
    applyTiming: "",
    responseType: "",
    mainIssue: "",
    description: "",
    // optional
    salaryAccurate: "",
    interviewRounds: "",
    additionalComments: "",
  });
  const [showAdditional, setShowAdditional] = useState(false);
  const [extraction, setExtraction] = useState<ExtractionStatus>({ type: 'idle' });
  const [verification, setVerification] = useState<{
    status: 'verified' | 'unverified' | 'none';
    confidence: 'low' | 'medium' | 'high' | null;
    source: 'linkedin' | 'indeed' | 'external' | null;
  }>({ status: 'none', confidence: null, source: null });
  const [evidenceItems, setEvidenceItems] = useState<Evidence[]>([]);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
  const [newEvidenceText, setNewEvidenceText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();

  const canAddEvidence = evidenceItems.length < 5;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large. Maximum size is 2MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed.');
      return;
    }
    setEvidenceUploading(true);
    try {
      const { url } = await api.upload.image(file);
      setEvidenceItems(prev => [...prev, { type: 'image', value: url }]);
      toast.success('Image uploaded!');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setEvidenceUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addUrlEvidence = () => {
    if (!newEvidenceUrl) return;
    try { new URL(newEvidenceUrl); } catch {
      toast.error('Please enter a valid URL.');
      return;
    }
    setEvidenceItems(prev => [...prev, { type: 'url', value: newEvidenceUrl }]);
    setNewEvidenceUrl('');
  };

  const addTextEvidence = () => {
    if (!newEvidenceText.trim()) return;
    if (newEvidenceText.length > 2000) {
      toast.error('Text evidence must be under 2000 characters.');
      return;
    }
    setEvidenceItems(prev => [...prev, { type: 'text', value: newEvidenceText.trim() }]);
    setNewEvidenceText('');
  };

  const removeEvidence = (index: number) => {
    setEvidenceItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateForm = (field: string, value: string | boolean) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleAutoFill = async () => {
    if (!formData.jobUrl) {
      toast.error('Please enter a job URL first');
      return;
    }
    try { new URL(formData.jobUrl); } catch {
      toast.error('Please enter a valid URL');
      return;
    }
    setExtraction({ type: 'loading' });
    try {
      const response = await api.jobs.extractUrl(formData.jobUrl);
      const result = response.data;
      if (result.detected) {
        setFormData(prev => ({
          ...prev,
          role: result.data.title || prev.role,
          company: result.data.company || prev.company,
          location: result.data.location || prev.location,
        }));
        setVerification({
          status: result.validation.confidence === 'high' ? 'verified' : 'unverified',
          confidence: result.validation.confidence,
          source: result.source,
        });
        toast.success('Job details extracted successfully!');
      } else {
        setVerification({ status: 'unverified', confidence: 'low', source: result.source });
        toast.error('Could not extract details — please fill in manually');
      }
      setExtraction({ type: 'success', result });
    } catch (err: any) {
      setExtraction({ type: 'error', message: err.message || 'Extraction failed' });
      setVerification({ status: 'none', confidence: null, source: null });
      toast.error('Failed to extract job data');
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'linkedin': return 'LinkedIn';
      case 'indeed': return 'Indeed';
      default: return 'external source';
    }
  };
  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-border focus:border-accent focus:outline-none focus:ring-0 transition-all duration-200";
  const inputStyle = { fontSize: "0.875rem", backgroundColor: "var(--card)" };

  const [attempted, setAttempted] = useState(false);

  const updateAnswer = (field: string, value: string) =>
    setAnswers(prev => ({ ...prev, [field]: value }));

  const buildDescription = (): string => {
    const lines = [
      `Apply timing: ${answers.applyTiming}`,
      `Response received: ${answers.responseType}`,
      `Main issue: ${answers.mainIssue}`,
      ``,
      answers.description,
    ];
    if (answers.salaryAccurate) lines.push(``, `Salary accurate: ${answers.salaryAccurate}`);
    if (answers.interviewRounds) lines.push(`Interview rounds: ${answers.interviewRounds}`);
    if (answers.additionalComments) lines.push(``, `Additional comments: ${answers.additionalComments}`);
    return lines.join('\n');
  };

  const handleSubmit = async () => {
    if (!formData.company || !formData.role || !reportType ||
        !answers.applyTiming || !answers.responseType || !answers.mainIssue || !answers.description) {
      setAttempted(true);
      toast.error('A few fields still need your attention.');
      return;
    }

    setSubmitting(true);
    try {
      await api.jobs.create({
        title: formData.role,
        company: formData.company,
        location: formData.location || 'Remote',
        jobUrl: formData.jobUrl || '',
        description: buildDescription(),
        jobDescription: extraction.type === 'success' && extraction.result.detected
          ? extraction.result.data.description || ''
          : '',
        isFake: reportType === 'ghost',
        // verificationStatus/Confidence/Source are server-only (Finding 1.1)
        evidence: evidenceItems,
      });
      setSubmitted(true);
      toast.success('Report filed successfully!');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to submit report';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="pt-36 pb-32 flex items-center justify-center min-h-screen" style={{ backgroundColor: "var(--background)" }}>
        <div className="max-w-md mx-auto px-6 text-center">
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "rgba(47, 111, 94, 0.1)" }}>
              <Check size={36} style={{ color: "#2F6F5E" }} />
            </div>
            <div className="bg-card rounded-2xl border border-border p-10 relative overflow-hidden">
              <div className="absolute top-4 right-6 pointer-events-none select-none" style={{ fontFamily: "'Playfair Display', serif", fontSize: "3rem", fontWeight: 700, transform: "rotate(-8deg)", opacity: 0.04 }}>FILED</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 600 }}>Report Filed</h2>
              <p className="mt-3" style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--muted-foreground)" }}>
                Your report has been added to the WorkWyse archive. The community can now verify and review your experience.
              </p>
              <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: "var(--background)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#2F6F5E" }} />
                  <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Report submitted and live</p>
                </div>
              </div>
              <div className="mt-6">
                <button onClick={() => router.push('/reports')} style={{ color: "var(--accent)", fontSize: "0.9rem", background: "none", border: "none", cursor: "pointer" }}>View all reports &rarr;</button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="pt-28 pb-12 md:pt-36 md:pb-16" style={{ backgroundColor: "rgba(237,236,235,0.4)" }}>
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>Submit a Report</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 600 }}>File a Report</h1>
          <p className="mt-3 max-w-md" style={{ fontSize: "1rem", lineHeight: 1.7, color: "var(--muted-foreground)" }}>
            Share your hiring experience to help the community make informed decisions.
          </p>
        </div>
      </section>

      {/* Responsibility banner */}
      <div style={{ backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4">
          <p style={{ fontSize: '0.8rem', lineHeight: 1.65, color: 'var(--muted-foreground)' }}>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>Your report shapes what others see.</span>{' '}
            Accurate, honest data is what keeps WorkWyse valuable — for job seekers who deserve the truth, and for companies doing right by their candidates.
            Please hold your submission to a high standard. Vague, misleading, or irrelevant reports make the platform worse for everyone.{' '}
            <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>Be specific. Be fair. Be factual.</span>
          </p>
        </div>
      </div>

      <section className="pb-24 md:pb-32 pt-8">
        <div className="max-w-3xl mx-auto px-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-10">
            {steps.map((step, i) => {
              const stepNum = (i + 1) as Step;
              const isActive = stepNum === currentStep;
              const isDone = stepNum < currentStep;
              return (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300" style={{
                      borderColor: isActive || isDone ? "var(--accent)" : "var(--border)",
                      backgroundColor: isActive || isDone ? "var(--accent)" : "transparent",
                      color: isActive || isDone ? "white" : "var(--muted-foreground)",
                      fontSize: "0.8rem", fontWeight: 600,
                    }}>
                      {isDone ? <Check size={14} /> : stepNum}
                    </div>
                    <div className="hidden sm:block min-w-0">
                      <p style={{ fontSize: "0.8rem", fontWeight: isActive ? 600 : 400, color: isActive ? "var(--foreground)" : "var(--muted-foreground)", whiteSpace: "nowrap" }}>{step.label}</p>
                    </div>
                  </div>
                  {i < 2 && <div className="flex-1 h-px" style={{ backgroundColor: isDone ? "var(--accent)" : "var(--border)", transition: "background-color 0.3s" }} />}
                </div>
              );
            })}
          </div>

          {/* Steps */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="bg-card rounded-xl border border-border p-6 md:p-8">
                  <div className="mb-6">
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 600 }}>Listing Details</h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Tell us about the job posting</p>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block mb-1.5" style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)" }}>Company Name *</label>
                      <div className="relative">
                        <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
                        <input type="text" value={formData.company} onChange={e => updateForm("company", e.target.value)} className={`${inputClass} pl-10`} style={inputStyle} placeholder="e.g. NovaTech Solutions" />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1.5" style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)" }}>Role / Position *</label>
                      <div className="relative">
                        <Briefcase size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
                        <input type="text" value={formData.role} onChange={e => updateForm("role", e.target.value)} className={`${inputClass} pl-10`} style={inputStyle} placeholder="e.g. Senior Frontend Engineer" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1.5" style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)" }}>Location</label>
                        <div className="relative">
                          <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
                          <input type="text" value={formData.location} onChange={e => updateForm("location", e.target.value)} className={`${inputClass} pl-10`} style={inputStyle} placeholder="Remote / City" />
                        </div>
                      </div>
                      <div>
                        <label className="block mb-1.5" style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)" }}>Job URL</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <LinkIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
                            <input type="url" value={formData.jobUrl} onChange={e => updateForm("jobUrl", e.target.value)} className={`${inputClass} pl-10`} style={inputStyle} placeholder="https://..." />
                          </div>
                          <button
                            type="button"
                            onClick={handleAutoFill}
                            disabled={extraction.type === 'loading' || !formData.jobUrl}
                            className="px-3 py-2 rounded-lg border border-accent text-accent font-medium transition-all duration-200 hover:bg-accent hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                            style={{ fontSize: '0.78rem', backgroundColor: extraction.type === 'loading' ? 'var(--accent)' : 'transparent', color: extraction.type === 'loading' ? 'white' : 'var(--accent)' }}
                          >
                            {extraction.type === 'loading' ? (
                              <><Loader2 size={14} className="animate-spin" /> Extracting…</>
                            ) : (
                              <><Sparkles size={14} /> Auto Fill</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Extracted Job Summary Card */}
                    {extraction.type === 'success' && extraction.result.detected && (
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: extraction.result.validation.confidence === 'high' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)' }}>
                        <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: extraction.result.validation.confidence === 'high' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)' }}>
                          {extraction.result.validation.confidence === 'high' ? (
                            <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                          ) : (
                            <AlertTriangle size={15} style={{ color: '#f59e0b' }} />
                          )}
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: extraction.result.validation.confidence === 'high' ? '#065f46' : '#92400e' }}>
                            Job detected from {getSourceLabel(extraction.result.source)}
                          </span>
                        </div>
                        <div className="px-4 py-3 space-y-1.5" style={{ backgroundColor: 'var(--background)', fontSize: '0.8rem' }}>
                          {extraction.result.data.title && (
                            <div className="flex gap-2">
                              <span style={{ color: 'var(--muted-foreground)', minWidth: '4.5rem' }}>Role</span>
                              <span style={{ fontWeight: 500 }}>{extraction.result.data.title}</span>
                            </div>
                          )}
                          {extraction.result.data.company && (
                            <div className="flex gap-2">
                              <span style={{ color: 'var(--muted-foreground)', minWidth: '4.5rem' }}>Company</span>
                              <span style={{ fontWeight: 500 }}>{extraction.result.data.company}</span>
                            </div>
                          )}
                          {extraction.result.data.location && (
                            <div className="flex gap-2">
                              <span style={{ color: 'var(--muted-foreground)', minWidth: '4.5rem' }}>Location</span>
                              <span style={{ fontWeight: 500 }}>{extraction.result.data.location}</span>
                            </div>
                          )}
                          {extraction.result.data.description && (
                            <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                              <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Job summary</span>
                              <p className="mt-1" style={{ fontSize: '0.78rem', lineHeight: 1.5, color: 'var(--foreground)', opacity: 0.8 }}>
                                {extraction.result.data.description.slice(0, 200)}{extraction.result.data.description.length > 200 ? '…' : ''}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="px-4 py-2.5" style={{ backgroundColor: 'rgba(59, 130, 246, 0.06)', borderTop: '1px solid var(--border)' }}>
                          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                            ✎ Fields above have been auto-filled. Describe your experience with this job in Step 2.
                          </p>
                        </div>
                      </div>
                    )}
                    {extraction.type === 'success' && !extraction.result.detected && (
                      <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#991b1b', fontSize: '0.8rem', fontWeight: 500 }}>
                        <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                        {extraction.result.reason || 'Could not extract job details from this URL. Please fill in manually.'}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="bg-card rounded-xl border border-border p-6 md:p-8">
                  <div className="mb-6">
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 600 }}>Your Experience</h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Answer a few quick questions about what happened</p>
                  </div>
                  <div className="space-y-6">

                    {/* Extracted Job Description — read-only reference */}
                    {extraction.type === 'success' && extraction.result.detected && extraction.result.data.description && (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                          <Briefcase size={13} style={{ color: 'var(--muted-foreground)' }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original Job Description</span>
                        </div>
                        <div className="px-4 py-3" style={{ backgroundColor: 'var(--background)', maxHeight: '8rem', overflowY: 'auto' }}>
                          <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--muted-foreground)' }}>
                            {extraction.result.data.description}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Report Type */}
                    <HintField
                      hint="Choose the one that most closely fits — your honest read of the situation is what matters."
                      show={!reportType}
                    >
                      <label className="block mb-2" style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)" }}>Report Type *</label>
                      <div className="space-y-3">
                        {reportTypeOptions.map(opt => {
                          const Icon = opt.icon;
                          return (
                            <button key={opt.value} onClick={() => setReportType(opt.value)} type="button"
                              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${reportType === opt.value ? `${opt.color} border-current` : "border-border bg-background"}`}>
                              <div className="flex items-center gap-3">
                                <Icon size={18} className={reportType === opt.value ? "" : "text-muted-foreground"} />
                                <div>
                                  <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>{opt.label}</p>
                                  <p style={{ fontSize: "0.78rem", opacity: 0.75, marginTop: "0.1rem" }}>{opt.description}</p>
                                </div>
                                {reportType === opt.value && <Check size={16} className="ml-auto" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </HintField>

                    {/* --- Required Questions --- */}
                    <div className="pt-2">
                      <p style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)", marginBottom: "1rem" }}>Required Questions</p>
                      <div className="space-y-5">

                        {/* Q1: Apply timing */}
                        <HintField
                          hint="Even an approximation helps — when you applied gives the community important context."
                          show={!answers.applyTiming}
                        >
                          <label className="block mb-1.5" style={{ fontSize: "0.82rem", fontWeight: 500 }}>When did you apply? *</label>
                          <CustomSelect
                            value={answers.applyTiming}
                            onChange={v => updateAnswer('applyTiming', v)}
                            placeholder="Select a timeframe"
                            options={[
                              { value: 'Less than 1 month ago', label: 'Less than 1 month ago' },
                              { value: '1–3 months ago', label: '1–3 months ago' },
                              { value: '3–6 months ago', label: '3–6 months ago' },
                              { value: 'More than 6 months ago', label: 'More than 6 months ago' },
                            ]}
                          />
                        </HintField>

                        {/* Q2: Response type */}
                        <HintField
                          hint="What you heard back — or didn't — tells the story."
                          show={!answers.responseType}
                        >
                          <label className="block mb-2" style={{ fontSize: "0.82rem", fontWeight: 500 }}>Did you receive a response? *</label>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {[
                              { val: "Yes — interview" },
                              { val: "Yes — rejection" },
                              { val: "No response" },
                            ].map(({ val }) => (
                              <button key={val} type="button" onClick={() => updateAnswer('responseType', val)}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all duration-200 text-left"
                                style={{
                                  borderColor: answers.responseType === val ? 'var(--accent)' : 'var(--border)',
                                  backgroundColor: answers.responseType === val ? 'rgba(var(--accent-rgb, 59,130,246),0.06)' : 'var(--background)',
                                  fontSize: '0.82rem', fontWeight: answers.responseType === val ? 600 : 400,
                                }}>
                                <span>{val}</span>
                                {answers.responseType === val && <Check size={14} className="ml-auto" style={{ color: 'var(--accent)' }} />}
                              </button>
                            ))}
                          </div>
                        </HintField>

                        {/* Q3: Main issue */}
                        <HintField
                          hint="Pick whatever fits closest — even if it's not a perfect match, it helps readers understand your experience."
                          show={!answers.mainIssue}
                        >
                          <label className="block mb-1.5" style={{ fontSize: "0.82rem", fontWeight: 500 }}>What was the main issue? *</label>
                          <CustomSelect
                            value={answers.mainIssue}
                            onChange={v => updateAnswer('mainIssue', v)}
                            placeholder="Select an issue"
                            options={[
                              { value: 'Ghost job — never filled', label: 'Ghost job — never filled' },
                              { value: 'Misleading salary', label: 'Misleading salary' },
                              { value: 'Misleading role description', label: 'Misleading role description' },
                              { value: 'Ghosted after interview', label: 'Ghosted after interview' },
                              { value: 'Scam or fraudulent listing', label: 'Scam or fraudulent listing' },
                              { value: 'Excessive unpaid work / test', label: 'Excessive unpaid work / test' },
                              { value: 'Other', label: 'Other' },
                            ]}
                          />
                        </HintField>

                        {/* Q4: Description */}
                        <HintField
                          hint={answers.description.length === 0
                            ? "Your account is the heart of this report — give readers enough to understand what really happened."
                            : "A little more, please — a few more lines will make this genuinely useful to others in the same position."
                          }
                          show={answers.description.length < 50}
                        >
                          <label className="block mb-1.5" style={{ fontSize: "0.82rem", fontWeight: 500 }}>Describe what happened *</label>
                          <textarea value={answers.description} onChange={e => updateAnswer('description', e.target.value)}
                            className={inputClass} rows={5} style={inputStyle}
                            placeholder="Give a factual account of your experience. What did the listing say? What actually happened? When?"/>
                          <p style={{ fontSize: "0.72rem", color: 'var(--muted-foreground)', marginTop: "0.35rem" }}>
                            {answers.description.length} chars{answers.description.length < 50 ? ` — minimum 50` : ''}
                          </p>
                        </HintField>

                      </div>
                    </div>

                    {/* --- Optional Additional Details --- */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <button type="button" onClick={() => setShowAdditional(p => !p)}
                        className="w-full flex items-center justify-between px-5 py-3.5 transition-colors duration-200 hover:bg-secondary"
                        style={{ backgroundColor: 'var(--secondary)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.04em' }}>Additional Details <span style={{ fontWeight: 400, color: 'var(--muted-foreground)' }}>(optional)</span></span>
                        {showAdditional ? <ChevronUp size={15} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronDown size={15} style={{ color: 'var(--muted-foreground)' }} />}
                      </button>
                      {showAdditional && (
                        <div className="px-5 pb-5 pt-4 space-y-5" style={{ borderTop: '1px solid var(--border)' }}>

                          {/* Salary accuracy */}
                          <div>
                            <label className="block mb-2" style={{ fontSize: "0.82rem", fontWeight: 500 }}>Was the listed salary accurate?</label>
                            <div className="flex gap-2 flex-wrap">
                              {['Yes', 'No', 'Not listed'].map(v => (
                                <button key={v} type="button" onClick={() => updateAnswer('salaryAccurate', v)}
                                  className="px-4 py-1.5 rounded-full border-2 transition-all duration-200"
                                  style={{
                                    fontSize: '0.8rem',
                                    borderColor: answers.salaryAccurate === v ? 'var(--accent)' : 'var(--border)',
                                    backgroundColor: answers.salaryAccurate === v ? 'rgba(59,130,246,0.08)' : 'transparent',
                                    fontWeight: answers.salaryAccurate === v ? 600 : 400,
                                  }}>
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Interview rounds */}
                          <div>
                            <label className="block mb-1.5" style={{ fontSize: "0.82rem", fontWeight: 500 }}>How many interview rounds were there?</label>
                            <input type="number" min={0} max={20} value={answers.interviewRounds}
                              onChange={e => updateAnswer('interviewRounds', e.target.value)}
                              className={inputClass} style={{ ...inputStyle, maxWidth: '8rem' }}
                              placeholder="0"/>
                          </div>

                          {/* Additional comments */}
                          <div>
                            <label className="block mb-1.5" style={{ fontSize: "0.82rem", fontWeight: 500 }}>Any other comments?</label>
                            <textarea value={answers.additionalComments} onChange={e => updateAnswer('additionalComments', e.target.value)}
                              className={inputClass} rows={3} style={inputStyle}
                              placeholder="Anything else the community should know..."/>
                          </div>

                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="bg-card rounded-xl border border-border p-6 md:p-8">
                  <div className="mb-6">
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 600 }}>Evidence & Submit</h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Add proof to strengthen your report, then review and submit</p>
                  </div>
                  <div className="space-y-6">

                    {/* Evidence Builder */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="px-5 py-3.5" style={{ backgroundColor: 'var(--secondary)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText size={14} style={{ color: 'var(--muted-foreground)' }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.04em' }}>Attach Evidence</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 400 }}>(optional but recommended)</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>{evidenceItems.length} of 5</span>
                        </div>
                      </div>

                      <div className="px-5 py-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
                        {/* Existing evidence items */}
                        {evidenceItems.length > 0 && (
                          <div className="space-y-2">
                            {evidenceItems.map((item, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 p-3 rounded-lg border border-border"
                                style={{ backgroundColor: 'var(--background)' }}
                              >
                                {item.type === 'image' && (
                                  <>
                                    <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-border">
                                      <img src={item.value} alt="Evidence" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="flex items-center gap-1" style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 500 }}><Image size={11} /> Image</span>
                                      <p className="truncate" style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>{item.value.split('/').pop()}</p>
                                    </div>
                                  </>
                                )}
                                {item.type === 'url' && (
                                  <div className="flex-1 min-w-0">
                                    <span className="flex items-center gap-1" style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 500 }}><ExternalLink size={11} /> URL</span>
                                    <p className="truncate" style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>{item.value}</p>
                                  </div>
                                )}
                                {item.type === 'text' && (
                                  <div className="flex-1 min-w-0">
                                    <span className="flex items-center gap-1" style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 500 }}><FileText size={11} /> Note</span>
                                    <p className="truncate" style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>{item.value}</p>
                                  </div>
                                )}
                                <button type="button" onClick={() => removeEvidence(idx)} className="shrink-0 p-1 rounded-md hover:bg-secondary transition-colors" title="Remove">
                                  <X size={14} style={{ color: 'var(--muted-foreground)' }} />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        )}

                        {/* Add evidence controls */}
                        {canAddEvidence && (
                          <div className="space-y-3">
                            {/* Image upload */}
                            <div>
                              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/jpeg,image/png,image/webp" className="hidden" id="evidence-file" />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={evidenceUploading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-border transition-all duration-200 hover:border-accent hover:bg-secondary disabled:opacity-50"
                                style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}
                              >
                                {evidenceUploading ? (
                                  <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                                ) : (
                                  <><Upload size={14} /> Upload Image (JPEG, PNG, WebP — max 2MB)</>
                                )}
                              </button>
                            </div>

                            {/* URL input */}
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <ExternalLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                                <input
                                  type="url"
                                  value={newEvidenceUrl}
                                  onChange={e => setNewEvidenceUrl(e.target.value)}
                                  className={`${inputClass} pl-9`}
                                  style={inputStyle}
                                  placeholder="Paste a reference URL..."
                                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrlEvidence())}
                                />
                              </div>
                              <button type="button" onClick={addUrlEvidence} disabled={!newEvidenceUrl}
                                className="px-3 py-2 rounded-lg border border-accent text-accent transition-all duration-200 hover:bg-accent hover:text-white disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                style={{ fontSize: '0.78rem' }}
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            {/* Text note */}
                            <div className="flex gap-2">
                              <textarea
                                value={newEvidenceText}
                                onChange={e => setNewEvidenceText(e.target.value)}
                                className={`${inputClass} flex-1`}
                                style={inputStyle}
                                rows={2}
                                placeholder="Add a short text note as evidence..."
                              />
                              <button type="button" onClick={addTextEvidence} disabled={!newEvidenceText.trim()}
                                className="px-3 self-end py-2 rounded-lg border border-accent text-accent transition-all duration-200 hover:bg-accent hover:text-white disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                style={{ fontSize: '0.78rem' }}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {!canAddEvidence && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>Maximum evidence items reached (5 of 5)</p>
                        )}
                      </div>
                    </div>

                    {/* Review Summary */}
                    <div className="p-5 rounded-xl border border-border" style={{ backgroundColor: "var(--secondary)" }}>
                      <h3 className="mb-3" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Review Summary</h3>
                      <div className="space-y-2" style={{ fontSize: "0.82rem" }}>
                        {[
                          { label: "Company", value: formData.company },
                          { label: "Role", value: formData.role },
                          { label: "Location", value: formData.location || "—" },
                          { label: "Report Type", value: reportType || "—" },
                          { label: "Apply timing", value: answers.applyTiming || "—" },
                          { label: "Response", value: answers.responseType || "—" },
                          { label: "Main issue", value: answers.mainIssue || "—" },
                          { label: "Details", value: answers.description ? `${answers.description.slice(0, 60)}…` : "—" },
                          { label: "Evidence", value: evidenceItems.length > 0 ? `${evidenceItems.length} item${evidenceItems.length !== 1 ? 's' : ''} attached` : "None" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between">
                            <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
                            <span style={{ fontWeight: 500, textTransform: "capitalize", maxWidth: "60%", textAlign: "right" }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: "0.78rem", lineHeight: 1.6, color: "var(--muted-foreground)" }}>
                      By submitting, you confirm this report is truthful to the best of your knowledge. False reports may be removed.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-between">
            {currentStep > 1 ? (
              <button onClick={() => setCurrentStep(prev => (prev - 1) as Step)} className="px-5 py-2.5 rounded-lg border border-border transition-all duration-200 hover:bg-secondary" style={{ fontSize: "0.875rem" }}>
                Back
              </button>
            ) : <div />}
            {currentStep < 3 ? (
              <TactileButton variant="primary" className="px-6 py-2.5 gap-2" onClick={() => setCurrentStep(prev => (prev + 1) as Step)}>
                Continue <ChevronRight size={16} />
              </TactileButton>
            ) : (
              <TactileButton variant="primary" className="px-8 py-2.5" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </TactileButton>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default function SubmitReportPage() {
  return (
    <ProtectedRoute>
      <SubmitReportContent />
    </ProtectedRoute>
  );
}
