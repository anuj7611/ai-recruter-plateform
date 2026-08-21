"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { StatusMessage } from "@/components/auth/form-controls";
import { apiRequest, errorMessage } from "@/lib/auth/api";

function VerifyEmailContent() {
  const token = useSearchParams().get("token") ?? "";
  const started = useRef(false);
  const [state, setState] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token
      ? "Verifying your email address…"
      : "This verification link is incomplete or invalid.",
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) return;
    void apiRequest("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => { setState("success"); setMessage("Your email address has been verified successfully."); })
      .catch((error) => { setState("error"); setMessage(errorMessage(error)); });
  }, [token]);

  return (
    <AuthShell eyebrow="Email verification" title={state === "success" ? "Email verified" : "Confirming your email"} description="We use email verification to keep every interview workspace safe.">
      {state === "loading" && <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center"><span className="mx-auto block size-9 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600"/><p className="mt-4 text-sm text-slate-600">{message}</p></div>}
      {state === "success" && <StatusMessage tone="success">{message}</StatusMessage>}
      {state === "error" && <StatusMessage>{message}</StatusMessage>}
      {state !== "loading" && <Link href="/login" className="primary-button mt-6">Continue to sign in</Link>}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailContent /></Suspense>;
}
