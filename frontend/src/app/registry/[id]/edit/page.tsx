"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "../../../../lib/api";
import { useAuth } from "../../../../components/AuthContext";
import { useToast } from "../../../../components/ui/Toast";
import { Job } from "../../../../types/user";
import { Mono, PrimaryButton, SecondaryButton } from "../../../../components/ui/primitives";

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAuthenticated, isAdmin, user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isFake, setIsFake] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.jobs.get(id).then((r) => {
      const j = r.data;
      setJob(j);
      setTitle(j.title);
      setCompany(j.company);
      setLocation(j.location);
      setDescription(j.description);
      setIsFake(j.isFake);
    }).catch(() => {});
  }, [id]);

  const submitterUid = job && typeof job.submittedBy === "object" ? job.submittedBy?.uid : undefined;
  const canEdit = isAuthenticated && (isAdmin || (submitterUid && submitterUid === user?.uid));

  async function save() {
    setSaving(true);
    try {
      await api.jobs.update(id, { title, company, location, description, isFake });
      toast.success("Record updated");
      router.push(`/registry/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  if (!job) return <div className="px-8 py-16 text-muted">Loading…</div>;
  if (!canEdit) return <div className="px-8 py-16 text-muted">You do not have permission to edit this record.</div>;

  return (
    <div className="px-4 md:px-8 py-10 max-w-[640px]">
      <Mono>EDIT RECORD</Mono>
      <h1 className="mt-3 text-[28px] font-bold tracking-[-0.03em]">Update listing details</h1>
      <p className="mt-2 text-[13.5px] text-muted">
        This edit is logged publicly on the record's Log, attributed to your account.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" /></Field>
        <Field label="Company"><input value={company} onChange={(e) => setCompany(e.target.value)} className="input" /></Field>
        <Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} className="input" /></Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="input resize-none" />
        </Field>
        <label className="flex items-center gap-2.5 text-[14px]">
          <input type="checkbox" checked={isFake} onChange={(e) => setIsFake(e.target.checked)} />
          Flag as likely fake
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <PrimaryButton onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</PrimaryButton>
        <Link href={`/registry/${id}`}><SecondaryButton type="button">Cancel</SecondaryButton></Link>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid var(--border-mid);
          background: var(--card);
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
        }
        .input:focus {
          border-color: var(--ink);
        }
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
