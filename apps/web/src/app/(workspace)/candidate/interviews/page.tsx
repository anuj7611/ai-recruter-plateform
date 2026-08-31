"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import type { CandidateInterview } from "@/lib/workspace-types";
import {
  EmptyState,
  LoadingState,
  MetricCard,
  Notice,
  PageHeader,
  StatusPill,
  formatDate,
  titleCase,
} from "@/components/workspace-ui";

export default function CandidateInterviewsPage() {
  const { status, requestWithAuth } = useAuth();
  const [interviews, setInterviews] = useState<CandidateInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await requestWithAuth<{
        interviews: CandidateInterview[];
      }>("/candidate/interviews");
      setInterviews(data.interviews);
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

  const stats = useMemo(
    () => ({
      upcoming: interviews.filter((item) =>
        ["READY", "SCHEDULED"].includes(item.status),
      ).length,
      active: interviews.filter((item) => item.status === "IN_PROGRESS").length,
      completed: interviews.filter((item) => item.status === "COMPLETED").length,
    }),
    [interviews],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Interview room"
        title="My interviews"
        description="Review invitations, complete assessments, and view feedback from one focused workspace."
      />
      {error && (
        <div className="mt-6">
          <Notice>{error}</Notice>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Upcoming" value={stats.upcoming} detail="Ready or scheduled" accent="violet" />
        <MetricCard label="In progress" value={stats.active} detail="Continue where you left off" accent="sky" />
        <MetricCard label="Completed" value={stats.completed} detail="Results ready to review" accent="emerald" />
      </div>

      <section className="mt-8">
        {loading ? (
          <LoadingState label="Loading interviews" />
        ) : interviews.length === 0 ? (
          <EmptyState title="No interviews yet" description="Interview invitations will appear here as soon as a recruiter sends one." />
        ) : (
          <div className="space-y-4">
            {interviews.map((interview, index) => {
              const progress = interview.questionCount
                ? Math.min(100, (interview.currentQuestionIndex / interview.questionCount) * 100)
                : 0;
              const needsAcceptance =
                interview.requiresInvitation && interview.invitation?.status !== "ACCEPTED";

              return (
                <article key={interview.id} className="workspace-card card-rise" style={{ animationDelay: `${index * 55}ms` }}>
                  <div className="flex flex-col gap-5 md:flex-row md:items-center">
                    <span className="float-gentle grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-950 to-indigo-950 text-white shadow-lg shadow-indigo-950/15">
                      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <rect x="3" y="5" width="14" height="14" rx="3" />
                        <path d="m17 10 4-2v8l-4-2z" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-950">{interview.title}</h2>
                        <StatusPill value={interview.status} />
                        {interview.invitation && <StatusPill value={interview.invitation.status} />}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {interview.job?.title ?? "General interview"} · {titleCase(interview.type)} · {interview.durationMinutes} min · {interview.questionCount} questions
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {interview.completedAt ? `Completed ${formatDate(interview.completedAt)}` : `Scheduled ${formatDate(interview.scheduledAt)}`}
                      </p>
                      {interview.status === "IN_PROGRESS" && (
                        <div className="mt-3 h-1.5 max-w-md rounded-full bg-slate-100">
                          <div className="progress-shimmer h-full rounded-full bg-violet-600" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {interview.status === "COMPLETED" ? (
                        <Link className="soft-button" href={`/candidate/interviews/${interview.id}?view=result`}>View result</Link>
                      ) : (
                        <Link className="solid-button" href={`/candidate/interviews/${interview.id}`}>
                          {interview.status === "IN_PROGRESS" ? "Continue" : needsAcceptance ? "Review invitation" : "Open interview"}
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
