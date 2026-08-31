"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import type { CandidateInterview, CandidateProfileResponse, NotificationItem, Resume } from "@/lib/workspace-types";
import { MetricCard, Notice, PageHeader, StatusPill, formatDate } from "@/components/workspace-ui";

export default function DashboardPage() {
  const { user, status, requestWithAuth, resendVerification } = useAuth();
  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [interviews, setInterviews] = useState<CandidateInterview[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => { try { const [profileData,resumeData,interviewData,notificationData] = await Promise.all([requestWithAuth<{ profile: CandidateProfileResponse }>("/candidate/profile"), requestWithAuth<{ resumes: Resume[] }>("/candidate/resume"), requestWithAuth<{ interviews: CandidateInterview[] }>("/candidate/interviews"), requestWithAuth<{ notifications: NotificationItem[] }>("/notifications")]); setProfile(profileData.profile); setResumes(resumeData.resumes); setInterviews(interviewData.interviews); setNotifications(notificationData.notifications); } catch (caught) { setError(errorMessage(caught)); } }, [requestWithAuth]);
  useEffect(() => { if (status !== "authenticated") return; const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load,status]);
  const upcoming = useMemo(() => interviews.filter((item) => ["READY","SCHEDULED","IN_PROGRESS"].includes(item.status)), [interviews]);
  const profileStrength = profile ? Math.min(100, 35 + Object.values(profile.candidateProfile).filter(Boolean).length * 6) : 0;
  const resend = async () => { try { setNotice(await resendVerification()); } catch (caught) { setError(errorMessage(caught)); } };
  return <div>
    {!user?.emailVerifiedAt && <div className="mb-7 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-amber-950">Verify your email address</p><p className="mt-1 text-sm text-amber-800">Verification protects your account and unlocks every workspace feature.</p></div><button className="secondary-button" onClick={() => void resend()}>Resend email</button></div>}
    {error && <div className="mb-6"><Notice>{error}</Notice></div>}{notice && <div className="mb-6"><Notice tone="success">{notice}</Notice></div>}
    <PageHeader eyebrow="Candidate workspace" title={`Good to see you, ${user?.name.split(" ")[0] ?? "there"}.`} description="Your next interview, career context, and recent activity—all in one place." action={<Link href="/candidate/interviews" className="solid-button">Open interviews</Link>} />
    <div className="mt-8 grid gap-4 sm:grid-cols-3"><MetricCard label="Profile strength" value={`${profileStrength}%`} detail="Keep your story interview-ready"/><MetricCard label="Ready resumes" value={resumes.filter((item) => item.status === "READY").length} detail={`${resumes.length} uploaded in total`} accent="emerald"/><MetricCard label="Active interviews" value={upcoming.length} detail={`${interviews.filter((item) => item.status === "COMPLETED").length} completed`} accent="sky"/></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.8fr]"><section className="workspace-card card-rise"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-950">Next interviews</h2><p className="mt-1 text-sm text-slate-500">Continue active and upcoming assessments.</p></div><Link href="/candidate/interviews" className="text-sm font-bold text-violet-600">View all</Link></div><div className="mt-5 space-y-3">{upcoming.length ? upcoming.slice(0,3).map((item) => <Link key={item.id} href={`/candidate/interviews/${item.id}`} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4 hover:border-violet-200 hover:bg-violet-50/40"><span className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white">▶</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.job?.title ?? "Interview"} · {formatDate(item.scheduledAt)}</p></div><StatusPill value={item.status}/></Link>) : <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">No active interviews.</div>}</div></section>
      <section className="workspace-card card-rise"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-950">Recent activity</h2><Link href="/notifications" className="text-sm font-bold text-violet-600">All</Link></div><div className="mt-5 space-y-5">{notifications.slice(0,4).map((item) => <div key={item.id} className="flex gap-3"><span className="mt-1 size-2 shrink-0 rounded-full bg-violet-500 ring-4 ring-violet-50"/><div><p className="text-sm font-medium leading-5 text-slate-800">{item.subject}</p><p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</p></div></div>)}{notifications.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No activity yet.</p>}</div></section></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3">{[["Complete your profile","Add experience and career goals.","/candidate/profile"],["Manage resumes","Upload and query your career context.","/candidate/resumes"],["Account security","Review devices and active sessions.","/settings/security"]].map(([title,description,href]) => <Link key={href} href={href} className="workspace-card card-rise"><h3 className="font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><span className="mt-4 inline-flex text-sm font-bold text-violet-600">Open →</span></Link>)}</div>
  </div>;
}
