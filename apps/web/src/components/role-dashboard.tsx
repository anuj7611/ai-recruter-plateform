"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import {
  LoadingState,
  MetricCard,
  Notice,
  PageHeader,
  StatusPill,
  formatDate,
  titleCase,
} from "./workspace-ui";

type WorkspaceKind = "organization" | "admin";

interface OrganizationSummary {
  scope: "organization";
  generatedAt: string;
  qualificationThreshold: number;
  metrics: {
    teamMembers: number;
    pendingInvitations: number;
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    totalInterviews: number;
    activeInterviews: number;
    completedInterviews: number;
    qualifiedCandidates: number;
    averageScore: number;
  };
  operations: { activeTeamSessions: number };
  teamMembers: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    recruiterProfile: {
      jobTitle: string | null;
      department: string | null;
    } | null;
  }>;
  invitationActivity: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
    acceptedAt: string | null;
    createdAt: string;
  }>;
  recentJobs: Array<{
    id: string;
    title: string;
    status: string;
    department: string | null;
    location: string | null;
    createdAt: string;
    createdBy: { name: string };
    _count: { applications: number; interviews: number };
  }>;
  recentInterviews: Array<{
    id: string;
    title: string;
    status: string;
    overallScore: number | null;
    scheduledAt: string | null;
    createdAt: string;
    candidateProfile: { user: { name: string } };
    createdBy: { name: string } | null;
    job: { title: string } | null;
  }>;
}

interface PlatformSummary {
  scope: "platform";
  generatedAt: string;
  qualificationThreshold: number;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    totalInterviews: number;
    completedInterviews: number;
    qualifiedCandidates: number;
  };
  usersByRole: Record<string, number>;
  usersByStatus: Record<string, number>;
  hiring: {
    totalResumes: number;
    failedResumes: number;
    failedInterviews: number;
  };
  operations: {
    activeSessions: number;
    pendingInvitations: number;
    notificationsByStatus: Record<string, number>;
  };
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
    createdAt: string;
  }>;
  recentInterviews: Array<{
    id: string;
    title: string;
    status: string;
    overallScore: number | null;
    createdAt: string;
    candidateProfile: { user: { name: string } };
    createdBy: { name: string } | null;
    job: { title: string } | null;
  }>;
  recentNotifications: Array<{
    id: string;
    type: string;
    status: string;
    subject: string;
    recipientEmail: string;
    createdAt: string;
  }>;
}

type AdminSummary = OrganizationSummary | PlatformSummary;

const QuickLink = ({
  href,
  title,
  detail,
  color,
}: {
  href: string;
  title: string;
  detail: string;
  color: string;
}) => (
  <Link href={href} className="workspace-card card-rise group flex items-center gap-3">
    <span className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm`}>
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 12h14M14 7l5 5-5 5" />
      </svg>
    </span>
    <div className="min-w-0 flex-1">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <p className="mt-0.5 truncate text-[10px] text-slate-500">{detail}</p>
    </div>
    <span className="text-violet-600 transition group-hover:translate-x-1">→</span>
  </Link>
);

const DetailCard = ({
  label,
  value,
  detail,
  tone = "violet",
}: {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: "violet" | "emerald" | "sky" | "rose";
}) => {
  const tones = {
    violet: "from-violet-500 to-indigo-600",
    emerald: "from-emerald-400 to-teal-600",
    sky: "from-sky-400 to-blue-600",
    rose: "from-rose-400 to-red-600",
  };
  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50/75 p-3.5">
      <span className={`absolute -right-5 -top-5 size-16 rounded-full bg-gradient-to-br ${tones[tone]} opacity-10 blur-xl`} />
      <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">{label}</p>
      <div className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950">{value}</div>
      <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>
    </article>
  );
};

function OrganizationDashboard({ summary }: { summary: OrganizationSummary }) {
  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Recruiter team" value={summary.metrics.teamMembers} detail={`${summary.metrics.pendingInvitations} invitations pending`} />
        <MetricCard label="Active jobs" value={summary.metrics.activeJobs} detail={`${summary.metrics.totalJobs} roles created`} accent="sky" />
        <MetricCard label="Applications" value={summary.metrics.totalApplications} detail="Across team-owned jobs" accent="amber" />
        <MetricCard label="Qualified" value={summary.metrics.qualifiedCandidates} detail={`Scored above ${summary.qualificationThreshold}%`} accent="emerald" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.75fr]">
        <section className="workspace-card card-rise">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Hiring performance</h2>
              <p className="mt-0.5 text-xs text-slate-500">Consolidated activity from you and invited recruiters.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/10">
              {summary.metrics.averageScore}% average score
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <DetailCard label="Total interviews" value={summary.metrics.totalInterviews} detail={`${summary.metrics.activeInterviews} currently active`} />
            <DetailCard label="Completed" value={summary.metrics.completedInterviews} detail="Evaluations delivered" tone="emerald" />
            <DetailCard label="Team sessions" value={summary.operations.activeTeamSessions} detail="Active recruiter sessions" tone="sky" />
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["Interview completion", summary.metrics.completedInterviews, summary.metrics.totalInterviews],
              ["Qualified outcomes", summary.metrics.qualifiedCandidates, summary.metrics.completedInterviews],
              ["Active job coverage", summary.metrics.activeJobs, summary.metrics.totalJobs],
            ].map(([label, value, total]) => {
              const percentage = Number(total) > 0 ? Math.round((Number(value) / Number(total)) * 100) : 0;
              return (
                <div key={String(label)}>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500"><span>{label}</span><span>{percentage}%</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="progress-shimmer h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600" style={{ width: `${Math.max(percentage, percentage ? 4 : 0)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <QuickLink href="/access/invitations" title="Invite recruiter" detail="Create a secure team invitation" color="from-violet-500 to-indigo-600" />
          <QuickLink href="/notifications" title="Activity center" detail="Review notification delivery" color="from-sky-400 to-blue-600" />
          <QuickLink href="/settings/security" title="Security" detail="Manage devices and active sessions" color="from-emerald-400 to-teal-600" />
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="workspace-card card-rise">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Recruiter team</h2><p className="mt-0.5 text-xs text-slate-500">Accepted recruiter accounts in your workspace.</p></div><StatusPill value={`${summary.metrics.teamMembers} ACTIVE`} /></div>
          <div className="mt-4 divide-y divide-slate-100">
            {summary.teamMembers.slice(0, 8).map((member) => (
              <div key={member.id} className="flex items-center gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-xs font-bold text-white">{member.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{member.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{member.email} · {member.recruiterProfile?.department ?? member.recruiterProfile?.jobTitle ?? "Recruiter"}</p></div>
                <div className="text-right"><StatusPill value={member.status} /><p className="mt-1 text-[9px] text-slate-400">{member.lastLoginAt ? `Seen ${formatDate(member.lastLoginAt)}` : "Never signed in"}</p></div>
              </div>
            ))}
            {summary.teamMembers.length === 0 && <p className="py-8 text-center text-xs text-slate-500">Invite a recruiter to build your team.</p>}
          </div>
        </section>

        <section className="workspace-card card-rise">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Invitation activity</h2><p className="mt-0.5 text-xs text-slate-500">Recent recruiter access invitations.</p></div><Link href="/access/invitations" className="text-xs font-bold text-violet-600">Invite</Link></div>
          <div className="mt-4 divide-y divide-slate-100">
            {summary.invitationActivity.map((invitation) => (
              <div key={invitation.id} className="flex items-center gap-3 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor"><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg></span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{invitation.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{invitation.email} · {titleCase(invitation.role)}</p></div>
                <StatusPill value={invitation.status} />
              </div>
            ))}
            {summary.invitationActivity.length === 0 && <p className="py-8 text-center text-xs text-slate-500">No invitations have been created.</p>}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="workspace-card card-rise"><h2 className="font-semibold text-slate-950">Recent jobs</h2><p className="mt-0.5 text-xs text-slate-500">Latest roles created by your hiring team.</p><div className="mt-4 divide-y divide-slate-100">{summary.recentJobs.map((job) => <div key={job.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{job.title}</p><p className="mt-0.5 text-[10px] text-slate-500">{job.createdBy.name} · {job._count.applications} applications · {job._count.interviews} interviews</p></div><StatusPill value={job.status} /></div>)}{summary.recentJobs.length === 0 && <p className="py-8 text-center text-xs text-slate-500">No jobs created yet.</p>}</div></section>
        <section className="workspace-card card-rise"><h2 className="font-semibold text-slate-950">Recent interviews</h2><p className="mt-0.5 text-xs text-slate-500">Latest candidate assessment activity.</p><div className="mt-4 divide-y divide-slate-100">{summary.recentInterviews.map((interview) => <div key={interview.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{interview.candidateProfile.user.name} · {interview.job?.title ?? interview.title}</p><p className="mt-0.5 text-[10px] text-slate-500">Owned by {interview.createdBy?.name ?? "Platform"} · {formatDate(interview.scheduledAt)}</p></div><StatusPill value={interview.status} />{interview.overallScore !== null && <span className="text-sm font-bold text-slate-800">{interview.overallScore}%</span>}</div>)}{summary.recentInterviews.length === 0 && <p className="py-8 text-center text-xs text-slate-500">No interviews created yet.</p>}</div></section>
      </div>
    </>
  );
}

function PlatformDashboard({ summary }: { summary: PlatformSummary }) {
  const roles = ["CANDIDATE", "RECRUITER", "ORGANIZATION_ADMIN", "SUPER_ADMIN"];
  const maximumRoleCount = Math.max(...roles.map((role) => summary.usersByRole[role] ?? 0), 1);
  const sentNotifications = summary.operations.notificationsByStatus.SENT ?? 0;
  const failedNotifications = summary.operations.notificationsByStatus.FAILED ?? 0;
  const totalDelivery = Object.values(summary.operations.notificationsByStatus).reduce((total, count) => total + count, 0);

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Platform users" value={summary.metrics.totalUsers} detail={`${summary.metrics.activeUsers} active accounts`} />
        <MetricCard label="Active jobs" value={summary.metrics.activeJobs} detail={`${summary.metrics.totalJobs} jobs total`} accent="sky" />
        <MetricCard label="Applications" value={summary.metrics.totalApplications} detail="Candidate submissions" accent="amber" />
        <MetricCard label="Completed" value={summary.metrics.completedInterviews} detail={`${summary.metrics.qualifiedCandidates} qualified candidates`} accent="emerald" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="workspace-card card-rise">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-950">User distribution</h2><p className="mt-0.5 text-xs text-slate-500">Accounts across every platform role.</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold text-violet-700">{summary.metrics.verifiedUsers} verified</span></div>
          <div className="mt-5 space-y-4">
            {roles.map((role, index) => {
              const count = summary.usersByRole[role] ?? 0;
              const colors = ["from-violet-500 to-indigo-600", "from-sky-400 to-blue-600", "from-emerald-400 to-teal-600", "from-amber-400 to-orange-500"];
              return <div key={role}><div className="flex justify-between text-[10px] font-semibold text-slate-600"><span>{titleCase(role)}</span><span>{count}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-gradient-to-r ${colors[index]}`} style={{ width: `${Math.max((count / maximumRoleCount) * 100, count ? 4 : 0)}%` }} /></div></div>;
            })}
          </div>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
            {Object.entries(summary.usersByStatus).map(([userStatus, count]) => <div key={userStatus} className="rounded-xl bg-slate-50 p-3"><StatusPill value={userStatus} /><p className="mt-2 text-xl font-semibold text-slate-950">{count}</p><p className="text-[9px] text-slate-400">accounts</p></div>)}
          </div>
        </section>

        <section className="workspace-card card-rise">
          <h2 className="font-semibold text-slate-950">Platform operations</h2><p className="mt-0.5 text-xs text-slate-500">Security, processing, and delivery health.</p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <DetailCard label="Active sessions" value={summary.operations.activeSessions} detail="Unexpired sessions" tone="sky" />
            <DetailCard label="Pending invites" value={summary.operations.pendingInvitations} detail="Awaiting acceptance" />
            <DetailCard label="Failed resumes" value={summary.hiring.failedResumes} detail={`${summary.hiring.totalResumes} processed total`} tone={summary.hiring.failedResumes ? "rose" : "emerald"} />
            <DetailCard label="Failed interviews" value={summary.hiring.failedInterviews} detail={`${summary.metrics.totalInterviews} interviews total`} tone={summary.hiring.failedInterviews ? "rose" : "emerald"} />
          </div>
          <div className="mt-4 rounded-xl border border-slate-100 p-3.5"><div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Notification delivery</p><p className="mt-1 text-xs text-slate-600">{sentNotifications} sent · {failedNotifications} failed</p></div><StatusPill value={failedNotifications ? "ATTENTION" : "HEALTHY"} /></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-rose-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${totalDelivery ? (sentNotifications / totalDelivery) * 100 : 0}%` }} /></div></div>
        </section>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <QuickLink href="/access/invitations" title="Provision access" detail="Invite admins and recruiters" color="from-violet-500 to-indigo-600" />
        <QuickLink href="/notifications" title="Delivery center" detail="Inspect your notifications" color="from-sky-400 to-blue-600" />
        <QuickLink href="/settings/security" title="Account security" detail="Review devices and sessions" color="from-emerald-400 to-teal-600" />
      </div>

      <section className="workspace-card card-rise mt-6">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Newest users</h2><p className="mt-0.5 text-xs text-slate-500">Recently created accounts and access state.</p></div><span className="text-[10px] text-slate-400">Updated {formatDate(summary.generatedAt)}</span></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400"><th className="pb-2 font-bold">User</th><th className="pb-2 font-bold">Role</th><th className="pb-2 font-bold">Status</th><th className="pb-2 font-bold">Verified</th><th className="pb-2 text-right font-bold">Last activity</th></tr></thead><tbody>{summary.recentUsers.map((account) => <tr key={account.id} className="border-b border-slate-50 last:border-0"><td className="py-3"><p className="text-xs font-semibold text-slate-900">{account.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{account.email}</p></td><td className="py-3"><span className="text-[10px] font-semibold text-slate-600">{titleCase(account.role)}</span></td><td className="py-3"><StatusPill value={account.status} /></td><td className="py-3"><StatusPill value={account.emailVerifiedAt ? "VERIFIED" : "UNVERIFIED"} /></td><td className="py-3 text-right text-[10px] text-slate-500">{account.lastLoginAt ? formatDate(account.lastLoginAt) : `Joined ${formatDate(account.createdAt)}`}</td></tr>)}</tbody></table></div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="workspace-card card-rise"><h2 className="font-semibold text-slate-950">Recent interviews</h2><p className="mt-0.5 text-xs text-slate-500">Platform-wide assessment activity.</p><div className="mt-4 divide-y divide-slate-100">{summary.recentInterviews.map((interview) => <div key={interview.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{interview.candidateProfile.user.name} · {interview.job?.title ?? interview.title}</p><p className="mt-0.5 text-[10px] text-slate-500">Recruiter: {interview.createdBy?.name ?? "Unassigned"} · {formatDate(interview.createdAt)}</p></div><StatusPill value={interview.status} />{interview.overallScore !== null && <span className="text-sm font-bold text-slate-800">{interview.overallScore}%</span>}</div>)}{summary.recentInterviews.length === 0 && <p className="py-8 text-center text-xs text-slate-500">No interview activity.</p>}</div></section>
        <section className="workspace-card card-rise"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Notification stream</h2><p className="mt-0.5 text-xs text-slate-500">Latest platform delivery activity.</p></div><Link href="/notifications" className="text-xs font-bold text-violet-600">Open center</Link></div><div className="mt-4 divide-y divide-slate-100">{summary.recentNotifications.map((notification) => <div key={notification.id} className="flex items-center gap-3 py-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /></svg></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{notification.subject}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{notification.recipientEmail} · {titleCase(notification.type)}</p></div><StatusPill value={notification.status} /></div>)}{summary.recentNotifications.length === 0 && <p className="py-8 text-center text-xs text-slate-500">No notifications created.</p>}</div></section>
      </div>
    </>
  );
}

export function RoleDashboard({ kind }: { kind: WorkspaceKind }) {
  const { user, status, requestWithAuth, resendVerification } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await requestWithAuth<{ summary: AdminSummary }>("/admin/summary");
      setSummary(data.summary);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [requestWithAuth]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, status]);

  const resend = async () => {
    setNotice("");
    setError("");
    setSending(true);
    try {
      setNotice(await resendVerification());
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSending(false);
    }
  };

  const isPlatform = kind === "admin";

  return (
    <div>
      {!user?.emailVerifiedAt && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold text-amber-950">Verify your email address</p><p className="mt-0.5 text-xs text-amber-800">Verification protects this privileged workspace.</p></div>
          <button className="secondary-button shrink-0" onClick={resend} disabled={sending}>{sending ? "Sending…" : "Resend email"}</button>
        </div>
      )}

      {notice && <div className="mb-5"><Notice tone="success">{notice}</Notice></div>}
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}

      <PageHeader
        eyebrow={isPlatform ? "Super administration" : "Organization administration"}
        title={isPlatform ? `Platform command center, ${user?.name.split(" ")[0] ?? "admin"}.` : `Hiring operations, ${user?.name.split(" ")[0] ?? "admin"}.`}
        description={isPlatform ? "Monitor users, hiring activity, access, delivery health, and platform operations from one live view." : "Track recruiter access, team-owned jobs, applications, interviews, and hiring outcomes."}
        action={<div className="flex gap-2"><button className="secondary-button" onClick={() => void load()}>Refresh</button><Link href="/access/invitations" className="solid-button">Invite member</Link></div>}
      />

      {loading ? (
        <div className="mt-8"><LoadingState label="Loading administration dashboard" /></div>
      ) : summary?.scope === "platform" ? (
        <PlatformDashboard summary={summary} />
      ) : summary?.scope === "organization" ? (
        <OrganizationDashboard summary={summary} />
      ) : !error ? (
        <div className="mt-8"><Notice>Dashboard information is unavailable.</Notice></div>
      ) : null}
    </div>
  );
}
