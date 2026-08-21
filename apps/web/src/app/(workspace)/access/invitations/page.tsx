"use client";

import { FormEvent, useMemo, useState } from "react";
import { Field, StatusMessage, SubmitButton } from "@/components/auth/form-controls";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import { getRoleLabel } from "@/lib/auth/role-routing";
import type { UserRole } from "@/lib/auth/types";

type InvitableRole = Exclude<UserRole, "CANDIDATE">;

interface InvitationResult {
  invitation: {
    id: string;
    name: string;
    email: string;
    role: InvitableRole;
    expiresAt: string;
    createdAt: string;
  };
  invitationEmailSent: boolean;
  manualInvitationUrl: string | null;
}

export default function InvitationsPage() {
  const { user, requestWithAuth } = useAuth();
  const allowedRoles = useMemo<InvitableRole[]>(
    () =>
      user?.role === "SUPER_ADMIN"
        ? ["RECRUITER", "ORGANIZATION_ADMIN", "SUPER_ADMIN"]
        : ["RECRUITER"],
    [user?.role],
  );
  const [form, setForm] = useState({ name: "", email: "", role: "RECRUITER" as InvitableRole });
  const [result, setResult] = useState<InvitationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setCopied(false);
    setLoading(true);
    try {
      const data = await requestWithAuth<InvitationResult>("/auth/invitations", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setResult(data);
      setForm((current) => ({ ...current, name: "", email: "" }));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!result?.manualInvitationUrl) return;
    await navigator.clipboard.writeText(result.manualInvitationUrl);
    setCopied(true);
  };

  return (
    <div>
      <p className="text-sm font-semibold text-violet-600">Access control</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Invite a team member</h1>
      <p className="mt-2 max-w-2xl text-slate-500">Create a secure, single-use invitation that expires after seven days.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="workspace-card">
          <h2 className="text-lg font-semibold text-slate-950">New invitation</h2>
          <p className="mt-1 text-sm text-slate-500">The recipient will set their own password when accepting.</p>
          <form className="mt-6 space-y-5" onSubmit={submit}>
            {error && <StatusMessage>{error}</StatusMessage>}
            {result && (
              <StatusMessage tone={result.invitationEmailSent ? "success" : "info"}>
                Invitation created for {result.invitation.email}.
                {result.invitationEmailSent ? " The email was accepted for delivery." : " Email delivery failed; use the development link shown beside the form."}
              </StatusMessage>
            )}
            <Field label="Full name" name="name" autoComplete="off" placeholder="Team member's name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            <Field label="Work email" name="email" type="email" autoComplete="off" placeholder="person@company.com" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Account role</span>
              <select className="form-input" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as InvitableRole }))}>
                {allowedRoles.map((role) => <option key={role} value={role}>{getRoleLabel(role)}</option>)}
              </select>
            </label>
            <SubmitButton loading={loading}>{loading ? "Creating invitation…" : "Send invitation"}</SubmitButton>
          </form>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-950">Role boundary</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {user?.role === "SUPER_ADMIN"
                ? "Super admins can provision recruiters, organization admins, and other super admins."
                : "Organization admins can provision recruiter accounts only."}
            </p>
          </div>
          {result?.manualInvitationUrl && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
              <p className="text-sm font-semibold text-sky-950">Development invitation link</p>
              <p className="mt-2 break-all text-xs leading-5 text-sky-800">{result.manualInvitationUrl}</p>
              <button className="secondary-button mt-4 w-full" onClick={copyLink}>{copied ? "Copied" : "Copy invitation link"}</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
