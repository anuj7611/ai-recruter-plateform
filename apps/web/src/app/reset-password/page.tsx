"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordField, StatusMessage, SubmitButton } from "@/components/auth/form-controls";
import { apiRequest, errorMessage } from "@/lib/auth/api";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (!token) return setError("This reset link is missing its token. Request a new link.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await apiRequest("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      router.replace("/login?reset=success");
    } catch (caught) { setError(errorMessage(caught)); } finally { setLoading(false); }
  };

  return (
    <AuthShell eyebrow="Secure reset" title="Choose a new password" description="Use a strong password you haven’t used for this account before.">
      <form className="space-y-5" onSubmit={submit}>
        {!token && <StatusMessage>This password reset link is incomplete or invalid.</StatusMessage>}
        {error && <StatusMessage>{error}</StatusMessage>}
        <PasswordField label="New password" name="password" autoComplete="new-password" placeholder="Enter a new password" hint="8+ characters with uppercase, lowercase, number, and symbol." value={password} onChange={(event) => setPassword(event.target.value)} required />
        <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" placeholder="Repeat the new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        <SubmitButton loading={loading}>{loading ? "Updating password…" : "Update password"}</SubmitButton>
        <Link href="/forgot-password" className="block text-center text-sm font-semibold text-slate-600 hover:text-violet-700">Request a new link</Link>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
