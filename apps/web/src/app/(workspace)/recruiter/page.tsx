"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import type {
  InterviewTemplate,
  JobOpening,
  RecruiterInterview,
} from "@/lib/workspace-types";
import {
  MetricCard,
  Notice,
  PageHeader,
  StatusPill,
  formatDate,
} from "@/components/workspace-ui";

const QUALIFICATION_THRESHOLD = 65;

export default function RecruiterPage() {
  const { user, status, requestWithAuth } = useAuth();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [interviews, setInterviews] = useState<RecruiterInterview[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [jobData, templateData, interviewData] = await Promise.all([
        requestWithAuth<{ jobs: JobOpening[] }>("/jobs"),
        requestWithAuth<{ templates: InterviewTemplate[] }>(
          "/interview-templates",
        ),
        requestWithAuth<{ interviews: RecruiterInterview[] }>("/interviews"),
      ]);
      setJobs(jobData.jobs);
      setTemplates(templateData.templates);
      setInterviews(interviewData.interviews);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [requestWithAuth]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, status]);

  const recent = useMemo(() => interviews.slice(0, 5), [interviews]);
  const qualifiedCandidates = useMemo(
    () =>
      interviews
        .filter(
          (interview) =>
            interview.status === "COMPLETED" &&
            interview.overallScore !== null &&
            interview.overallScore > QUALIFICATION_THRESHOLD,
        )
        .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0)),
    [interviews],
  );

  return (
    <div>
      {error && (
        <div className="mb-5">
          <Notice>{error}</Notice>
        </div>
      )}

      <PageHeader
        eyebrow="Recruiter workspace"
        title={`Build a stronger hiring signal, ${user?.name.split(" ")[0] ?? "there"}.`}
        description="Structure roles, launch consistent interviews, and turn every answer into comparable evidence."
        action={
          <Link className="solid-button" href="/recruiter/interviews">
            Create interview
          </Link>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Active jobs"
          value={jobs.filter((job) => job.status === "ACTIVE").length}
          detail={`${jobs.length} openings in your workspace`}
        />
        <MetricCard
          label="Qualified"
          value={qualifiedCandidates.length}
          detail={`Candidates scoring above ${QUALIFICATION_THRESHOLD}%`}
          accent="emerald"
        />
        <MetricCard
          label="Completed"
          value={interviews.filter((item) => item.status === "COMPLETED").length}
          detail={`${interviews.length} interviews total`}
          accent="sky"
        />
      </div>

      <section className="workspace-card card-rise mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/15">
                <svg
                  viewBox="0 0 24 24"
                  className="size-4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </span>
              <div>
                <h2 className="font-semibold text-slate-950">
                  Qualified candidates
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Completed interviews scoring above {QUALIFICATION_THRESHOLD}%.
                </p>
              </div>
            </div>
          </div>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-600/10">
            {qualifiedCandidates.length} shortlisted
          </span>
        </div>

        {qualifiedCandidates.length > 0 ? (
          <div className="mt-5 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {qualifiedCandidates.map((interview, index) => {
              const candidate = interview.candidateProfile?.user;
              const initials = (candidate?.name ?? "Candidate")
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase();

              return (
                <article
                  key={interview.id}
                  className="group flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-md sm:flex-row sm:items-center"
                  style={{ animationDelay: `${Math.min(index * 45, 260)}ms` }}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-xs font-bold text-white shadow-sm transition group-hover:scale-105">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900">
                        {candidate?.name ?? "Candidate"}
                      </h3>
                      <StatusPill value="QUALIFIED" />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {candidate?.email ?? "No email"} ·{" "}
                      {interview.job?.title ?? interview.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Completed {formatDate(interview.completedAt)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="text-xl font-bold tracking-tight text-emerald-700">
                        {interview.overallScore}%
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Interview score
                      </p>
                    </div>
                    <Link
                      href="/recruiter/interviews"
                      className="grid size-8 place-items-center rounded-lg bg-white text-violet-600 ring-1 ring-slate-200 transition hover:bg-violet-600 hover:text-white"
                      aria-label={`Review ${candidate?.name ?? "candidate"}`}
                    >
                      →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No qualified candidates yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Candidates appear here after completing an interview above the score threshold.
            </p>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.8fr]">
        <section className="workspace-card card-rise">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Recent interviews</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Latest candidate activity and outcomes.
              </p>
            </div>
            <Link
              href="/recruiter/interviews"
              className="text-xs font-bold text-violet-600"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {recent.map((interview) => (
              <Link
                href="/recruiter/interviews"
                key={interview.id}
                className="flex items-center gap-3 py-3 transition hover:translate-x-1"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-slate-950 text-xs text-white">
                  ▶
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900">
                    {interview.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {interview.candidateProfile?.user.name ?? "Candidate"} ·{" "}
                    {formatDate(interview.scheduledAt)}
                  </p>
                </div>
                <StatusPill value={interview.status} />
                {interview.overallScore !== null && (
                  <span className="text-sm font-semibold">
                    {interview.overallScore}
                  </span>
                )}
              </Link>
            ))}
            {recent.length === 0 && (
              <p className="py-9 text-center text-xs text-slate-500">
                No interviews created yet.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          {[
            [
              "Job openings",
              `${jobs.filter((job) => job.status === "DRAFT").length} drafts to review`,
              "/recruiter/jobs",
              "from-violet-500 to-indigo-600",
            ],
            [
              "Interview templates",
              `${templates.length} structures available`,
              "/recruiter/templates",
              "from-sky-400 to-blue-600",
            ],
            [
              "Notifications",
              "Delivery and result updates",
              "/notifications",
              "from-emerald-400 to-teal-600",
            ],
          ].map(([title, detail, href, gradient]) => (
            <Link
              key={href}
              href={href}
              className="workspace-card card-rise flex items-center gap-3"
            >
              <span
                className={`size-9 rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}
              />
              <div>
                <h3 className="font-semibold text-slate-950">{title}</h3>
                <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>
              </div>
              <span className="ml-auto text-violet-600 transition group-hover:translate-x-1">
                →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
