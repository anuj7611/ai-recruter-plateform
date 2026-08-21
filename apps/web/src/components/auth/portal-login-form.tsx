"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { errorMessage } from "@/lib/auth/api";
import { useAuth } from "@/lib/auth/auth-context";
import { getRoleHome } from "@/lib/auth/role-routing";
import type { UserRole } from "@/lib/auth/types";
import { AuthShell } from "./auth-shell";
import {
  Field,
  PasswordField,
  StatusMessage,
  SubmitButton,
} from "./form-controls";

interface PortalLoginFormProps {
  role: Exclude<UserRole, "CANDIDATE">;
  eyebrow: string;
  title: string;
  description: string;
  registerHref?: string;
  registerLabel?: string;
}

export function PortalLoginForm({
  role,
  eyebrow,
  title,
  description,
  registerHref,
  registerLabel = "Create an account",
}: PortalLoginFormProps) {
  const router = useRouter();
  const { login, status, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(getRoleHome(user.role));
    }
  }, [router, status, user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const authenticatedUser = await login({ email, password }, role);
      router.replace(getRoleHome(authenticatedUser.role));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow={eyebrow} title={title} description={description}>
      <form className="space-y-5" onSubmit={submit}>
        {error && <StatusMessage>{error}</StatusMessage>}
        <Field
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <div className="flex justify-end">
          <Link
            className="text-sm font-semibold text-violet-600 hover:text-violet-800"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <SubmitButton loading={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </SubmitButton>
      </form>

      {registerHref ? (
        <p className="mt-7 text-center text-sm text-slate-500">
          Need an account?{" "}
          <Link
            href={registerHref}
            className="font-semibold text-violet-600 hover:text-violet-800"
          >
            {registerLabel}
          </Link>
        </p>
      ) : (
        <p className="mt-7 text-center text-sm text-slate-500">
          Administrator accounts are created through a secure invitation.
        </p>
      )}

      <p className="mt-3 text-center text-xs text-slate-400">
        <Link href="/login" className="font-semibold hover:text-violet-700">
          Return to candidate sign in
        </Link>
      </p>
    </AuthShell>
  );
}
