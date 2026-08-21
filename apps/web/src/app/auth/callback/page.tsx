"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { PageLoader } from "@/components/auth/protected-page";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import { getRoleHome } from "@/lib/auth/role-routing";

const oauthErrorMessages: Record<string, string> = {
  OAUTH_ACCESS_DENIED: "Google or GitHub sign-in was cancelled.",
  INVALID_OAUTH_STATE:
    "Your sign-in request expired or could not be verified. Please try again.",
  OAUTH_NOT_CONFIGURED: "This sign-in provider is not configured yet.",
  OAUTH_EMAIL_NOT_VERIFIED:
    "Your provider account needs a verified email address.",
  OAUTH_PROFILE_INCOMPLETE:
    "The provider did not return the account information we need.",
  OAUTH_ROLE_NOT_ALLOWED:
    "OAuth is available only in the candidate portal. Use your assigned role portal instead.",
  ACCOUNT_UNAVAILABLE: "This account is currently unavailable.",
  OAUTH_PROVIDER_ERROR:
    "The provider could not complete sign-in. Please try again.",
  OAUTH_CALLBACK_FAILED:
    "Sign-in could not be completed. Please try again.",
};

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { restoreSession } = useAuth();
  const started = useRef(false);
  const [sessionError, setSessionError] = useState("");
  const callbackError =
    searchParams.get("oauth") === "error"
      ? (oauthErrorMessages[
          searchParams.get("code") ?? "OAUTH_CALLBACK_FAILED"
        ] ?? oauthErrorMessages.OAUTH_CALLBACK_FAILED)
      : "";
  const error = callbackError || sessionError;

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (callbackError) return;

    void restoreSession()
      .then((user) => router.replace(getRoleHome(user.role)))
      .catch((caught) => setSessionError(errorMessage(caught)));
  }, [callbackError, restoreSession, router]);

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

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<PageLoader label="Finishing secure sign in" />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}
