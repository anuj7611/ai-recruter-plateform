"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/auth/form-controls";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import type { DeviceSession } from "@/lib/auth/types";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function SecurityPage() {
  const router = useRouter();
  const { status, requestWithAuth, logout, logoutAll } = useAuth();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    void requestWithAuth<{ sessions: DeviceSession[] }>("/auth/sessions")
      .then((data) => {
        if (!cancelled) setSessions(data.sessions);
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestWithAuth, status]);

  const revoke = async (session: DeviceSession) => {
    setBusyId(session.id); setError("");
    try {
      await requestWithAuth(`/auth/sessions/${session.id}`, { method: "DELETE" });
      if (session.isCurrent) {
        await logout();
        router.replace("/login");
        return;
      }
      setSessions((current) => current.map((entry) => entry.id === session.id ? { ...entry, status: "REVOKED", revokedAt: new Date().toISOString() } : entry));
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusyId(""); }
  };

  const signOutEverywhere = async () => {
    setBusyId("all"); setError("");
    try { await logoutAll(); router.replace("/login"); } catch (caught) { setError(errorMessage(caught)); setBusyId(""); }
  };

  return (
    <div>
      <div><p className="text-sm font-semibold text-violet-600">Account settings</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Security & devices</h1><p className="mt-2 text-slate-500">Review the devices signed into your account and revoke access at any time.</p></div>
      {error && <div className="mt-6"><StatusMessage>{error}</StatusMessage></div>}

      <section className="workspace-card mt-8">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-semibold text-slate-950">Device sessions</h2><p className="mt-1 text-sm text-slate-500">Active and recent sessions associated with your account.</p></div>
          <button className="danger-button" onClick={signOutEverywhere} disabled={busyId === "all"}>{busyId === "all" ? "Signing out…" : "Sign out all devices"}</button>
        </div>

        {loading ? (
          <div className="grid min-h-48 place-items-center"><span className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" /></div>
        ) : sessions.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No sessions were found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <div key={session.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${session.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-slate-900">{session.deviceName ?? "Unknown browser and device"}</p>{session.isCurrent && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">THIS DEVICE</span>}<span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${session.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{session.status}</span></div>
                  <p className="mt-1 text-xs text-slate-500">{session.ipAddress ?? "IP unavailable"} · Last used {formatDate(session.lastUsedAt)}</p>
                </div>
                {session.status === "ACTIVE" && <button className="text-sm font-semibold text-red-600 hover:text-red-800 disabled:opacity-50" onClick={() => revoke(session)} disabled={busyId === session.id}>{busyId === session.id ? "Revoking…" : session.isCurrent ? "Sign out" : "Revoke"}</button>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 4.5 6v5.2c0 4.6 3.1 8.8 7.5 9.8 4.4-1 7.5-5.2 7.5-9.8V6L12 3Z"/></svg></span><div><h2 className="font-semibold text-slate-950">How sessions stay secure</h2><p className="mt-1 text-sm leading-6 text-slate-500">Access tokens are kept in memory and expire quickly. Your refresh token stays in a protected HttpOnly cookie and rotates whenever your session is restored.</p></div></div>
      </section>
    </div>
  );
}
