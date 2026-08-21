"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageLoader } from "@/components/auth/protected-page";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { restoreSession } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void restoreSession()
      .then(() => router.replace("/dashboard"))
      .catch((caught) => setError(errorMessage(caught)));
  }, [restoreSession, router]);

  if (!error) return <PageLoader label="Finishing secure sign in" />;
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-600">!</span>
        <h1 className="mt-5 text-2xl font-semibold text-slate-950">Sign in couldn’t be completed</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{error}</p>
        <Link href="/login" className="primary-button mt-6">Return to sign in</Link>
      </div>
    </main>
  );
}
