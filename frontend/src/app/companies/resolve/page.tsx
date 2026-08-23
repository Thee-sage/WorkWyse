"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../lib/api";

/** Resolves a company by free-text name and redirects to its profile — used
 * when a link only has a company name (e.g. from a job record), not an id. */
export default function ResolveCompanyPage() {
  return (
    <Suspense fallback={<div className="px-8 py-16 text-muted">Loading…</div>}>
      <Resolver />
    </Suspense>
  );
}

function Resolver() {
  const router = useRouter();
  const params = useSearchParams();
  const name = params.get("name") || "";

  useEffect(() => {
    if (!name) { router.replace("/companies"); return; }
    api.companies.resolveByName(name)
      .then((r) => router.replace(`/companies/${r.data._id}`))
      .catch(() => router.replace("/companies"));
  }, [name, router]);

  return <div className="px-8 py-16 text-muted">Looking up {name}…</div>;
}
