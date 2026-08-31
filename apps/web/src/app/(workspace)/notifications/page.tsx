"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import type { NotificationItem } from "@/lib/workspace-types";
import { EmptyState, LoadingState, Notice, PageHeader, StatusPill, formatDate, titleCase } from "@/components/workspace-ui";

export default function NotificationsPage() {
  const { user, status, requestWithAuth } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await requestWithAuth<{ notifications: NotificationItem[] }>("/notifications");
      setItems(data.notifications);
    } catch (caught) { setError(errorMessage(caught)); } finally { setLoading(false); }
  }, [requestWithAuth]);

  useEffect(() => { if (status !== "authenticated") return; const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load, status]);

  const getNotificationHref = (item: NotificationItem) => {
    if (item.type === "JOB_AVAILABLE" || item.type === "JOB_APPLICATION_STATUS") {
      return "/candidate/jobs";
    }
    if (item.type === "JOB_APPLICATION_RECEIVED") {
      return "/recruiter/applications";
    }

    const interviewId = item.metadata?.interviewId;

    if (
      user?.role === "CANDIDATE" &&
      typeof interviewId === "string" &&
      ["INTERVIEW_INVITATION", "INTERVIEW_REMINDER"].includes(item.type)
    ) {
      return `/candidate/interviews/${interviewId}`;
    }

    return user?.role === "CANDIDATE"
      ? "/candidate/interviews"
      : "/recruiter/interviews";
  };

  return <div>
    <PageHeader eyebrow="Activity center" title="Notifications" description="Track interview invitations, reminders, completion updates, and delivery status." action={<button className="secondary-button" onClick={load}>Refresh</button>} />
    {error && <div className="mt-6"><Notice>{error}</Notice></div>}
    <section className="mt-8">
      {loading ? <LoadingState label="Loading notifications" /> : items.length === 0 ? <EmptyState title="No notifications yet" description="Interview activity and delivery updates will appear here." /> : <div className="space-y-3">
        {items.map((item, index) => <article key={item.id} className="workspace-card card-rise flex flex-col gap-4 sm:flex-row sm:items-center" style={{ animationDelay: `${Math.min(index * 45, 240)}ms` }}>
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-950">{item.subject}</h2><StatusPill value={item.status} /></div><p className="mt-1 text-xs text-slate-500">{titleCase(item.type)} · Created {formatDate(item.createdAt)}{item.sentAt ? ` · Sent ${formatDate(item.sentAt)}` : ""}</p></div>
          <Link href={getNotificationHref(item)} className="soft-button shrink-0">Open</Link>
        </article>)}
      </div>}
    </section>
  </div>;
}
