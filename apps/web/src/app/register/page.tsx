"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field, PasswordField, StatusMessage, SubmitButton } from "@/components/auth/form-controls";
import { OAuthButtons, OrDivider } from "@/components/auth/oauth-buttons";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ emailSent: boolean; message: string } | null>(null);

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const response = await register({ name: form.name, email: form.email, password: form.password });
      setResult({ emailSent: response.verificationEmailSent, message: response.message ?? "Account created successfully." });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <AuthShell eyebrow="Account created" title="You’re ready to get started" description="Your candidate workspace has been created successfully.">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <span className="grid size-11 place-items-center rounded-full bg-emerald-100 text-emerald-700"><svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          <h2 className="mt-4 text-lg font-semibold text-slate-950">Check your inbox</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{result.message}</p>
          {!result.emailSent && <p className="mt-3 text-sm font-medium text-amber-700">Email delivery was not accepted. Sign in and use “resend verification” after your sender domain is configured.</p>}
        </div>
        <Link href="/login" className="primary-button mt-6">Continue to sign in</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Create your account" title="Start interviewing smarter" description="Create a secure candidate workspace in less than a minute.">
      <OAuthButtons />
      <OrDivider />
      <form className="space-y-5" onSubmit={submit}>
        {error && <StatusMessage>{error}</StatusMessage>}
        <Field label="Full name" name="name" autoComplete="name" placeholder="Your full name" value={form.name} onChange={(event) => update("name", event.target.value)} minLength={2} maxLength={80} required />
        <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(event) => update("email", event.target.value)} required />
        <PasswordField label="Password" name="password" autoComplete="new-password" placeholder="Create a strong password" value={form.password} onChange={(event) => update("password", event.target.value)} hint="8+ characters with uppercase, lowercase, number, and symbol." minLength={8} maxLength={128} required />
        <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" placeholder="Repeat your password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required />
        <SubmitButton loading={loading}>{loading ? "Creating account…" : "Create account"}</SubmitButton>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-800">Sign in</Link></p>
    </AuthShell>
  );
}
