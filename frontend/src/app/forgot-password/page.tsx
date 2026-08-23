"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { Mono, PrimaryButton } from "../../components/ui/primitives";

type Step = "email" | "otp" | "new-password" | "done";
const STEP_LABELS = ["Email", "Verify", "New password", "Done"];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setStep("otp");
      toast.success("If that email exists, a reset code has been sent.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.auth.verifyResetOtp(email, otp);
      setResetToken(res.data.resetToken);
      setStep("new-password");
      toast.success("Code verified");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Invalid or expired code.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("Password must include uppercase, lowercase, and a number.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(resetToken, newPassword);
      setStep("done");
      toast.success("Password reset");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to reset password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = { email: 0, otp: 1, "new-password": 2, done: 3 }[step];

  return (
    <div className="flex items-start justify-center px-4 py-14">
      <div className="w-full max-w-[440px] border border-border-strong bg-card p-7 md:p-9">
        <Mono>ACCOUNT</Mono>
        <h1 className="mt-3 text-[26px] font-bold tracking-[-0.03em]">{step === "done" ? "All set" : "Reset password"}</h1>
        <p className="mt-2 text-[13.5px] text-muted leading-[1.6]">
          {step === "email" && "Enter the email linked to your account and we'll send a verification code."}
          {step === "otp" && `We sent a 6-digit code to ${email}.`}
          {step === "new-password" && "Choose a strong new password."}
          {step === "done" && "Your password has been updated. You can now log in."}
        </p>

        <div className="mt-6 flex items-center gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5 flex-1 last:flex-none">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${i <= stepIndex ? "bg-ink text-background" : "bg-panel text-faint"}`}>
                {i < stepIndex ? "✓" : i + 1}
              </span>
              {i < STEP_LABELS.length - 1 && <span className={`flex-1 h-[2px] ${i < stepIndex ? "bg-ink" : "bg-border-soft"}`} />}
            </div>
          ))}
        </div>

        {step === "email" && (
          <form onSubmit={requestOtp} className="mt-6 flex flex-col gap-4">
            <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" placeholder="you@example.com" className="input" /></Field>
            {error && <ErrorBox msg={error} />}
            <PrimaryButton type="submit" disabled={loading}>{loading ? "Sending…" : "Send reset code"}</PrimaryButton>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="mt-6 flex flex-col gap-4">
            <Field label="Verification code">
              <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required maxLength={6} autoFocus placeholder="000000" className="input text-center font-mono text-[20px] tracking-[0.3em]" />
              <p className="mt-2 text-center text-[12px] text-muted">
                Didn&apos;t get a code?{" "}
                <button type="button" onClick={() => { setStep("email"); setOtp(""); setError(""); }} className="text-accent font-semibold">Resend</button>
              </p>
            </Field>
            {error && <ErrorBox msg={error} />}
            <PrimaryButton type="submit" disabled={loading}>{loading ? "Verifying…" : "Verify code"}</PrimaryButton>
          </form>
        )}

        {step === "new-password" && (
          <form onSubmit={resetPassword} className="mt-6 flex flex-col gap-4">
            <Field label="New password">
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus autoComplete="new-password" placeholder="Min. 8 chars, uppercase, lowercase, number" className="input" />
              <PasswordStrength password={newPassword} />
            </Field>
            <Field label="Confirm password">
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" placeholder="Re-enter your new password" className="input" />
            </Field>
            {error && <ErrorBox msg={error} />}
            <PrimaryButton type="submit" disabled={loading}>{loading ? "Resetting…" : "Set new password"}</PrimaryButton>
          </form>
        )}

        {step === "done" && (
          <div className="mt-8 text-center">
            <div className="w-16 h-16 rounded-full bg-panel-teal flex items-center justify-center mx-auto text-[28px] text-accent">✓</div>
            <PrimaryButton onClick={() => router.push("/login")} className="mt-5 w-full">Go to login</PrimaryButton>
          </div>
        )}

        {step !== "done" && (
          <p className="mt-6 text-center text-[13px] text-muted">
            Remember your password? <Link href="/login" className="text-accent">Sign in</Link>
          </p>
        )}
      </div>
      <style jsx>{`
        .input { width: 100%; border: 1px solid var(--border-strong); background: var(--card); padding: 11px 13px; font-size: 14.5px; outline: none; }
        .input:focus { border-color: var(--accent); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-mono text-[10px] tracking-[0.1em] text-muted mb-1.5">{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return <div className="text-[13px] text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2">{msg}</div>;
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase", pass: /[A-Z]/.test(password) },
    { label: "Lowercase", pass: /[a-z]/.test(password) },
    { label: "Number", pass: /[0-9]/.test(password) },
  ];
  const passed = checks.filter((c) => c.pass).length;
  const strength = passed <= 1 ? "Weak" : passed <= 2 ? "Fair" : passed <= 3 ? "Good" : "Strong";
  const colorClass = { Weak: "bg-destructive", Fair: "bg-amber", Good: "text-accent bg-accent", Strong: "bg-accent" }[strength];

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flex-1 h-1 ${i < passed ? colorClass : "bg-border-soft"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <span className="text-[11px] font-semibold text-muted">{strength}</span>
        <div className="flex gap-2.5">
          {checks.map((c) => (
            <span key={c.label} className={`text-[10.5px] ${c.pass ? "text-muted" : "text-faint line-through"}`}>{c.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
