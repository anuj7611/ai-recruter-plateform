"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field, StatusMessage, SubmitButton } from "@/components/auth/form-controls";
import { apiRequest, errorMessage } from "@/lib/auth/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      await apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true);
    } catch (caught) { setError(errorMessage(caught)); } finally { setLoading(false); }
  };

  return (
    <AuthShell eyebrow="Password recovery" title="Reset your password" description="Enter your account email and we’ll send you a secure, time-limited reset link.">
      {sent ? (
        <div className="space-y-6">
          <StatusMessage tone="success">If an eligible account exists for {email}, a reset link is on its way.</StatusMessage>
          <Link href="/login" className="primary-button">Back to sign in</Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          {error && <StatusMessage>{error}</StatusMessage>}
          <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <SubmitButton loading={loading}>{loading ? "Sending link…" : "Send reset link"}</SubmitButton>
          <Link href="/login" className="block text-center text-sm font-semibold text-slate-600 hover:text-violet-700">Back to sign in</Link>
        </form>
      )}
    </AuthShell>
  );
}
