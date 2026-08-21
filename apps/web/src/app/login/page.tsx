"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field, PasswordField, StatusMessage, SubmitButton } from "@/components/auth/form-controls";
import { OAuthButtons, OrDivider } from "@/components/auth/oauth-buttons";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [router, status]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      router.replace("/dashboard");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in to your account" description="Continue where you left off and keep your interview progress moving.">
      {searchParams.get("reset") === "success" && <StatusMessage tone="success">Your password has been reset. You can sign in now.</StatusMessage>}
      <OAuthButtons />
      <OrDivider />
      <form className="space-y-5" onSubmit={submit}>
        {error && <StatusMessage>{error}</StatusMessage>}
        <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <PasswordField label="Password" name="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <div className="flex justify-end"><Link className="text-sm font-semibold text-violet-600 hover:text-violet-800" href="/forgot-password">Forgot password?</Link></div>
        <SubmitButton loading={loading}>{loading ? "Signing in…" : "Sign in"}</SubmitButton>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">New to Hirely? <Link href="/register" className="font-semibold text-violet-600 hover:text-violet-800">Create an account</Link></p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
