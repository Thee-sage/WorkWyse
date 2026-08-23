"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { api, ApiError } from "../../lib/api";
import { Mono, PrimaryButton, SecondaryButton, StatRow } from "../../components/ui/primitives";

function SettingsContent() {
  const { user, logout, setUser } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<"public" | "private">(user?.type || "public");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) setSelectedType(user.type); }, [user]);

  async function updateType() {
    if (!user || selectedType === user.type) return;
    setLoading(true);
    try {
      await api.auth.updateUserType(selectedType);
      const updated = { ...user, type: selectedType };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      toast.success("Account type updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update account type");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    toast.success("Logged out");
    router.push("/login");
  }

  if (!user) return null;

  return (
    <div className="px-4 md:px-8 py-10 max-w-[640px]">
      <Mono>ACCOUNT</Mono>
      <h1 className="mt-3 text-[28px] font-bold tracking-[-0.03em]">Settings</h1>

      <div className="mt-7 border border-border-mid">
        <StatRow label="Username" value={user.username} />
        <StatRow label="Email" value={user.email} />
        <StatRow label="Role" value={user.role} />
        <StatRow label="Type" value={user.type} last />
      </div>

      <div id="visibility" className="mt-8 scroll-mt-20">
        <Mono>VISIBILITY</Mono>
        <p className="mt-2 text-[13.5px] text-muted leading-[1.6]">
          A private account is redacted to &ldquo;Anonymous&rdquo; wherever your submissions are shown to other visitors.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["public", "private"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`text-left p-4 border ${selectedType === t ? "border-ink bg-panel" : "border-border-mid hover:border-ink"}`}
            >
              <div className="text-[15px] font-semibold capitalize">{t} {selectedType === t && "✓"}</div>
              <p className="mt-1.5 text-[12.5px] text-muted">
                {t === "public" ? "Your handle is shown next to what you file." : "Your handle is redacted to Anonymous."}
              </p>
            </button>
          ))}
        </div>
        <PrimaryButton onClick={updateType} disabled={loading || selectedType === user.type} className="mt-4">
          {loading ? "Updating…" : "Save"}
        </PrimaryButton>
      </div>

      <div className="mt-10 pt-6 border-t border-border-soft">
        <SecondaryButton onClick={handleLogout} className="!border-destructive !text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
          Log out
        </SecondaryButton>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
