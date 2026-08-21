"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusMessage } from "@/components/auth/form-controls";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";

export default function DashboardPage() {
  const { user, resendVerification } = useAuth();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setNotice(""); setError(""); setSending(true);
    try { setNotice(await resendVerification()); } catch (caught) { setError(errorMessage(caught)); } finally { setSending(false); }
  };

  return (
    <div>
      {!user?.emailVerifiedAt && (
        <div className="mb-7 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-semibold text-amber-950">Verify your email address</p><p className="mt-1 text-sm text-amber-800">Verification protects your account and unlocks every workspace feature.</p></div>
          <button className="secondary-button shrink-0" onClick={resend} disabled={sending}>{sending ? "Sending…" : "Resend email"}</button>
        </div>
      )}
      {notice && <div className="mb-6"><StatusMessage tone="success">{notice}</StatusMessage></div>}
      {error && <div className="mb-6"><StatusMessage>{error}</StatusMessage></div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-violet-600">Your workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Good to see you, {user?.name.split(" ")[0]}.</h1><p className="mt-2 text-slate-500">Your secure interview hub is ready.</p></div>
        <Link href="/settings/security" className="secondary-button">Manage security</Link>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="workspace-card md:col-span-2"><span className="card-icon bg-violet-100 text-violet-700"><svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5h16v12H4z"/><path d="M8 21h8M12 17v4M8 9h8M8 13h5"/></svg></span><h2 className="mt-6 text-xl font-semibold text-slate-950">Interview workspace</h2><p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">Your interview preparation and assessment modules will appear here as the platform grows.</p><button className="mt-6 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Explore workspace</button></article>
        <article className="workspace-card"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account</p><div className="mt-5 space-y-4"><div><p className="text-xs text-slate-400">Email</p><p className="mt-1 truncate text-sm font-medium text-slate-800">{user?.email}</p></div><div><p className="text-xs text-slate-400">Role</p><p className="mt-1 text-sm font-medium capitalize text-slate-800">{user?.role.replaceAll("_", " ").toLowerCase()}</p></div><div><p className="text-xs text-slate-400">Verification</p><span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user?.emailVerifiedAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{user?.emailVerifiedAt ? "Verified" : "Pending"}</span></div></div></article>
      </div>
    </div>
  );
}
