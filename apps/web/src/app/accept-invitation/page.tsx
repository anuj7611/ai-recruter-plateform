"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordField, StatusMessage, SubmitButton } from "@/components/auth/form-controls";
import { apiRequest, errorMessage } from "@/lib/auth/api";
import { useAuth } from "@/lib/auth/auth-context";
import { getRoleHome, getRoleLabel } from "@/lib/auth/role-routing";
import type { UserRole } from "@/lib/auth/types";

interface InvitationDetails {
  name: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  invitedByName: string;
}

function AcceptInvitationForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const { login } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(Boolean(token));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(token ? "" : "This invitation link is incomplete.");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void apiRequest<{ invitation: InvitationDetails }>(`/auth/invitations/${encodeURIComponent(token)}`)
      .then((response) => {
        if (!cancelled) setInvitation(response.data.invitation);
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoadingInvitation(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!invitation) return;
    setError("");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      const registrationEndpoint =
        invitation.role === "ORGANIZATION_ADMIN"
          ? "/auth/organization-admin/register"
          : invitation.role === "SUPER_ADMIN"
            ? "/auth/super-admin/register"
            : "/auth/invitations/accept";
      await apiRequest(registrationEndpoint, {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      const user = await login(
        { email: invitation.email, password },
        invitation.role,
      );
      router.replace(getRoleHome(user.role));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell eyebrow="Team invitation" title="Activate your workspace" description="Confirm your invitation and choose a password only you know.">
      {loadingInvitation ? (
        <div className="grid min-h-48 place-items-center"><span className="size-9 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" /></div>
      ) : invitation ? (
        <form className="space-y-5" onSubmit={submit}>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <p className="text-sm font-semibold text-violet-950">{invitation.name}</p>
            <p className="mt-1 text-sm text-violet-800">{invitation.email}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-violet-600">{getRoleLabel(invitation.role)} · invited by {invitation.invitedByName}</p>
          </div>
          {error && <StatusMessage>{error}</StatusMessage>}
          <PasswordField label="Create password" name="password" autoComplete="new-password" placeholder="Create a strong password" hint="8+ characters with uppercase, lowercase, number, and symbol." value={password} onChange={(event) => setPassword(event.target.value)} required />
          <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" placeholder="Repeat your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          <SubmitButton loading={submitting}>{submitting ? "Activating account…" : "Accept invitation"}</SubmitButton>
        </form>
      ) : (
        <div>
          <StatusMessage>{error || "This invitation is unavailable."}</StatusMessage>
          <Link href="/login" className="primary-button mt-6">Return to sign in</Link>
        </div>
      )}
    </AuthShell>
  );
}

export default function AcceptInvitationPage() {
  return <Suspense><AcceptInvitationForm /></Suspense>;
}
