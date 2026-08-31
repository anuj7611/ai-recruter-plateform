"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, errorMessage } from "@/lib/auth/api";
import { useAuth } from "@/lib/auth/auth-context";
import { LoadingState, Notice, StatusPill, formatDate, titleCase } from "@/components/workspace-ui";

interface InvitationPreview { interview: { id: string; title: string; type: string; difficulty: string; durationMinutes: number; questionCount: number; scheduledAt: string | null; expiresAt: string | null; status: string; job: { title: string; department: string | null } | null; candidateProfile: { user: { name: string } } }; invitation: { status: string; expiresAt: string } }

export default function InterviewInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { status, user, requestWithAuth } = useAuth();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => { try { const response = await apiRequest<InvitationPreview>(`/interview-invitations/${token}`); setPreview(response.data); } catch (caught) { setError(errorMessage(caught)); } finally { setLoading(false); } }, [token]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const accept = async () => { setAccepting(true); setError(""); try { const data = await requestWithAuth<{ interviewId: string; accepted: boolean }>(`/interview-invitations/${token}/accept`, { method: "POST" }); router.push(`/candidate/interviews/${data.interviewId}`); } catch (caught) { setError(errorMessage(caught)); setAccepting(false); } };
  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-50 p-5"><div className="w-full max-w-3xl"><LoadingState label="Opening invitation" /></div></main>;
  return <main className="min-h-screen overflow-hidden bg-slate-950 px-5 py-12 text-white sm:py-20"><div className="pointer-events-none fixed left-1/2 top-0 size-[36rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"/><div className="page-enter relative mx-auto max-w-4xl"><Link href="/" className="text-sm font-bold text-violet-300">AI Interview</Link>{error && <div className="mt-6"><Notice>{error}</Notice></div>}{preview && <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.07] shadow-2xl backdrop-blur-xl"><div className="p-7 sm:p-10"><div className="flex flex-wrap items-center gap-3"><StatusPill value={preview.invitation.status}/><span className="text-xs text-slate-400">Expires {formatDate(preview.invitation.expiresAt)}</span></div><p className="mt-8 text-sm font-semibold text-violet-300">You’re invited, {preview.interview.candidateProfile.user.name}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">{preview.interview.title}</h1><p className="mt-4 text-lg text-slate-300">{preview.interview.job?.title ?? "Structured interview"}{preview.interview.job?.department ? ` · ${preview.interview.job.department}` : ""}</p><div className="mt-9 grid gap-3 sm:grid-cols-4">{[["Format",titleCase(preview.interview.type)],["Difficulty",titleCase(preview.interview.difficulty)],["Duration",`${preview.interview.durationMinutes} min`],["Questions",preview.interview.questionCount]].map(([label,value]) => <div key={String(label)} className="rounded-2xl bg-white/[.06] p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div><div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/30 p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Schedule</p><p className="mt-2 text-lg font-medium">{formatDate(preview.interview.scheduledAt)}</p></div></div><footer className="flex flex-col gap-4 border-t border-white/10 bg-black/15 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-10"><p className="text-sm text-slate-400">Sign in as the invited candidate to accept.</p>{status === "authenticated" && user?.role === "CANDIDATE" ? <button className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-950 hover:scale-[1.02] disabled:opacity-60" onClick={accept} disabled={accepting}>{accepting ? "Accepting…" : "Accept invitation"}</button> : <Link href="/login" className="rounded-xl bg-white px-6 py-3 text-center text-sm font-bold text-slate-950">Sign in to accept</Link>}</footer></section>}</div></main>;
}
