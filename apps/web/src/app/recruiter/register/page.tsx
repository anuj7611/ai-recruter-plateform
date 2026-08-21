"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  Field,
  PasswordField,
  StatusMessage,
  SubmitButton,
} from "@/components/auth/form-controls";
import { errorMessage } from "@/lib/auth/api";
import { useAuth } from "@/lib/auth/auth-context";

export default function RecruiterRegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register(
        { name: form.name, email: form.email, password: form.password },
        "RECRUITER",
      );
      setCreated(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <AuthShell
        eyebrow="Recruiter account created"
        title="Your hiring workspace is ready"
        description="Verify your email, then sign in through the recruiter portal."
      >
        <StatusMessage tone="success">
          Check your inbox for the email verification link.
        </StatusMessage>
        <Link href="/recruiter/login" className="primary-button mt-6">
          Continue to recruiter sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Recruiter registration"
      title="Create your hiring workspace"
      description="Register a recruiter account to organize interviews and candidates."
    >
      <form className="space-y-5" onSubmit={submit}>
        {error && <StatusMessage>{error}</StatusMessage>}
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Your full name"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          minLength={2}
          maxLength={80}
          required
        />
        <Field
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
          hint="8+ characters with uppercase, lowercase, number, and symbol."
          minLength={8}
          maxLength={128}
          required
        />
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={(event) => update("confirmPassword", event.target.value)}
          required
        />
        <SubmitButton loading={loading}>
          {loading ? "Creating account..." : "Create recruiter account"}
        </SubmitButton>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link
          href="/recruiter/login"
          className="font-semibold text-violet-600 hover:text-violet-800"
        >
          Recruiter sign in
        </Link>
      </p>
    </AuthShell>
  );
}
