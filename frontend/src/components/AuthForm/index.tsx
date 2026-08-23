"use client";
import { useState } from "react";
import Link from "next/link";
import { api, setAccessToken, ApiError } from "../../lib/api";
import { useAuth } from "../AuthContext";
import { useToast } from "../ui/Toast";
import { Mono, PrimaryButton } from "../ui/primitives";

interface AuthFormProps {
  mode: "login" | "register";
  onAuth: (identifier: string, password: string) => Promise<void>;
}

export default function AuthForm({ mode, onAuth }: AuthFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"public" | "private">("public");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { setUser } = useAuth();
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      setLoading(true);
      try {
        await onAuth(identifier, password);
        toast.success("Logged in");
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Login failed";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!otpSent) {
      setLoading(true);
      try {
        await api.auth.register({ username, email, password, userType });
        setOtpSent(true);
        toast.success("Code sent — check your email");
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to send code";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    } else {
      setVerifying(true);
      try {
        const res = await api.auth.verifyOTP(email, otp);
        const { user, accessToken } = res.data;
        setAccessToken(accessToken);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        toast.success("Account created");
        await onAuth(username, password);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Verification failed";
        setError(msg);
        toast.error(msg);
      } finally {
        setVerifying(false);
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-95px)]">
      <div className="hidden lg:flex flex-col justify-between bg-ink text-background px-12 py-14">
        <div>
          <Mono className="!text-faint">WORKWYSE</Mono>
          <h1 className="mt-6 text-[40px] leading-[1.1] tracking-[-0.035em] font-bold max-w-[14ch]">
            {mode === "login" ? "Welcome back to the record." : "Add your name to the record."}
          </h1>
          <p className="mt-5 font-serif text-[18px] leading-[1.6] text-border-mid max-w-[36ch]">
            {mode === "login"
              ? "Sign in to file accounts, evidence, and challenges, and to watch the records that matter to you."
              : "Every account, evidence item, and vote is attributed to a handle with a visible contribution history."}
          </p>
        </div>
        <div className="font-mono text-[10px] tracking-[0.1em] text-faint">
          EVERY RECORD SHOWS ITS SOURCES · EVERY CONTRIBUTION IS ATTRIBUTED
        </div>
      </div>

      <div className="px-6 sm:px-12 py-14 flex flex-col justify-center max-w-[440px] mx-auto w-full">
        <h2 className="text-[26px] font-bold tracking-[-0.03em]">{mode === "login" ? "Sign in" : "Create an account"}</h2>
        <p className="mt-2 text-[13.5px] text-muted">
          {mode === "login" ? (
            <>Don&apos;t have an account? <Link href="/register" className="text-accent">Create one</Link></>
          ) : (
            <>Already have an account? <Link href="/login" className="text-accent">Sign in</Link></>
          )}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          {mode === "login" && (
            <Field label="Email or username">
              <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" placeholder="you@example.com or your username" className="input" />
            </Field>
          )}

          {mode === "register" && (
            <Field label="Username">
              <input value={username} onChange={(e) => setUsername(e.target.value)} required disabled={otpSent} autoComplete="username" placeholder="Your username" className="input" />
            </Field>
          )}

          {mode === "register" && (
            <>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={otpSent} autoComplete="email" placeholder="you@example.com" className="input" />
              </Field>
              {!otpSent && (
                <div>
                  <Mono>ACCOUNT TYPE</Mono>
                  <div className="mt-2 flex gap-2">
                    {(["public", "private"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setUserType(t)}
                        className={`flex-1 py-2.5 text-[13px] font-semibold border capitalize ${userType === t ? "border-ink bg-panel" : "border-border-mid text-muted"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[12px] text-muted">
                    {userType === "public" ? "Your handle is shown next to what you file." : "Your handle is redacted to Anonymous wherever shown."}
                  </p>
                </div>
              )}
            </>
          )}

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={otpSent && mode === "register"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={mode === "login" ? "Your password" : "Min. 8 chars, uppercase, lowercase, number"}
              className="input"
            />
            {mode === "login" && (
              <Link href="/forgot-password" className="mt-1.5 inline-block text-[12.5px] text-accent">Forgot password?</Link>
            )}
          </Field>

          {mode === "register" && otpSent && (
            <Field label="Verification code">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                placeholder="000000"
                className="input font-mono tracking-[0.2em]"
              />
              <p className="mt-1.5 text-[12px] text-muted">We sent a 6-digit code to your email.</p>
            </Field>
          )}

          {error && <div className="text-[13px] text-destructive">{error}</div>}

          <PrimaryButton type="submit" disabled={loading || verifying} className="mt-2">
            {loading
              ? mode === "login" ? "Signing in…" : "Sending code…"
              : verifying
              ? "Verifying…"
              : mode === "login"
              ? "Sign in"
              : otpSent
              ? "Verify & create account"
              : "Send verification code"}
          </PrimaryButton>
        </form>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid var(--border-strong);
          background: var(--card);
          padding: 11px 13px;
          font-size: 14.5px;
          outline: none;
        }
        .input:focus { border-color: var(--accent); }
        .input:disabled { opacity: 0.55; }
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
