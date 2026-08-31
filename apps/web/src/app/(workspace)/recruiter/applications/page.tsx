"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import type {
  InterviewTemplate,
  JobApplication,
  JobApplicationStatus,
  RecruiterInterview,
} from "@/lib/workspace-types";
import {
  EmptyState,
  LoadingState,
  MetricCard,
  Modal,
  Notice,
  PageHeader,
  StatusPill,
  formatDate,
  titleCase,
} from "@/components/workspace-ui";

const blankInterview = {
  templateId: "",
  title: "",
  scheduledAt: "",
  expiresAt: "",
};

export default function RecruiterApplicationsPage() {
  const { status, requestWithAuth } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const [interviewApplication, setInterviewApplication] =
    useState<JobApplication | null>(null);
  const [interviewForm, setInterviewForm] = useState(blankInterview);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [applicationData, templateData] = await Promise.all([
        requestWithAuth<{ applications: JobApplication[] }>(
          "/jobs/applications",
        ),
        requestWithAuth<{ templates: InterviewTemplate[] }>(
          "/interview-templates",
        ),
      ]);
      setApplications(applicationData.applications);
      setTemplates(templateData.templates);
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
      new: applications.filter((item) => item.status === "APPLIED").length,
      reviewing: applications.filter((item) => item.status === "UNDER_REVIEW")
        .length,
      interviewing: applications.filter(
        (item) => item.status === "INTERVIEW_CREATED",
      ).length,
    }),
    [applications],
  );

  const openDetails = async (applicationId: string) => {
    setBusy(`details:${applicationId}`);
    setError("");
    try {
      const data = await requestWithAuth<{ application: JobApplication }>(
        `/jobs/applications/${applicationId}`,
      );
      setSelected(data.application);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const updateStatus = async (
    application: JobApplication,
    nextStatus: Extract<
      JobApplicationStatus,
      "UNDER_REVIEW" | "REJECTED"
    >,
  ) => {
    setBusy(`status:${application.id}`);
    setError("");
    try {
      await requestWithAuth(`/jobs/applications/${application.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setNotice(
        nextStatus === "UNDER_REVIEW"
          ? "Application moved to review. The candidate was notified."
          : "Application rejected. The candidate was notified.",
      );
      setSelected(null);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const openInterview = (application: JobApplication) => {
    setSelected(null);
    setInterviewApplication(application);
    setInterviewForm({
      ...blankInterview,
      title: `${application.job.title} Interview - ${application.candidateProfile?.user.name ?? "Candidate"}`,
    });
  };

  const createAiInterview = async (event: FormEvent) => {
    event.preventDefault();
    if (!interviewApplication) return;
    setBusy(`interview:${interviewApplication.id}`);
    setError("");
    setNotice("");

    try {
      const created = await requestWithAuth<{ interview: RecruiterInterview }>(
        `/jobs/applications/${interviewApplication.id}/interview`,
        {
          method: "POST",
          body: JSON.stringify({
            templateId: interviewForm.templateId,
            title: interviewForm.title || undefined,
            scheduledAt: interviewForm.scheduledAt
              ? new Date(interviewForm.scheduledAt).toISOString()
              : null,
            expiresAt: interviewForm.expiresAt
              ? new Date(interviewForm.expiresAt).toISOString()
              : null,
          }),
        },
      );

      await requestWithAuth(
        `/interviews/${created.interview.id}/generate-questions`,
        { method: "POST" },
      );

      await requestWithAuth(`/interviews/${created.interview.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({ expiresInHours: 72 }),
      });

      setNotice(
        "AI interview created, questions generated, and the candidate invitation was queued.",
      );
      setInterviewApplication(null);
      setInterviewForm(blankInterview);
      await load();
    } catch (caught) {
      setError(
        `${errorMessage(caught)} If the interview was already created, open Interviews to continue generation or invitation delivery.`,
      );
    } finally {
      setBusy("");
    }
  };

  if (loading) return <LoadingState label="Loading applications" />;

  return (
    <div>
      <PageHeader
        eyebrow="Candidate pipeline"
        title="Job applications"
        description="Review submitted resumes and turn qualified applications into structured AI interviews."
        action={
          <Link href="/recruiter/jobs" className="secondary-button">
            Manage jobs
          </Link>
        }
      />

      {(error || notice) && (
        <div className="mt-6">
          {error ? <Notice>{error}</Notice> : <Notice tone="success">{notice}</Notice>}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="New"
          value={stats.new}
          detail="Awaiting initial review"
        />
        <MetricCard
          label="In review"
          value={stats.reviewing}
          detail="Candidates under consideration"
          accent="sky"
        />
        <MetricCard
          label="Interviewing"
          value={stats.interviewing}
          detail="AI interviews created"
          accent="emerald"
        />
      </div>

      <section className="mt-8">
        {applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="When candidates apply to an active job, their profile and selected resume will appear here."
          />
        ) : (
          <div className="space-y-4">
            {applications.map((application, index) => (
              <article
                key={application.id}
                className="workspace-card card-rise"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 font-semibold text-white">
                    {application.candidateProfile?.user.name
                      .slice(0, 1)
                      .toUpperCase() ?? "C"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-950">
                        {application.candidateProfile?.user.name ?? "Candidate"}
                      </h2>
                      <StatusPill value={application.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Applied for {application.job.title} ·{" "}
                      {formatDate(application.appliedAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Resume: {application.resume.title ?? application.resume.originalFileName}
                    </p>
                  </div>
                  {application.interview ? (
                    <Link
                      href="/recruiter/interviews"
                      className="soft-button"
                    >
                      View interview
                    </Link>
                  ) : (
                    <button
                      className="secondary-button"
                      onClick={() => void openDetails(application.id)}
                      disabled={busy === `details:${application.id}`}
                    >
                      Review application
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.candidateProfile?.user.name ?? "Application details"}
        description={selected ? `Applied for ${selected.job.title}` : undefined}
        wide
      >
        {selected && (
          <div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">Experience</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {selected.candidateProfile?.experienceYears ?? 0} years ·{" "}
                  {titleCase(
                    selected.candidateProfile?.experienceLevel ?? "Not specified",
                  )}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">Location</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {selected.candidateProfile?.location ?? "Not specified"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">Status</p>
                <div className="mt-2">
                  <StatusPill value={selected.status} />
                </div>
              </div>
            </div>

            {selected.coverLetter && (
              <div className="mt-5 rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Cover note
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {selected.coverLetter}
                </p>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">
                    {selected.resume.title ?? selected.resume.originalFileName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Processed candidate resume
                  </p>
                </div>
                {selected.resume.storageUrl && (
                  <a
                    href={selected.resume.storageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button"
                  >
                    Open resume
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.resume.skills?.map((skill) => (
                  <span
                    key={skill.id}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-violet-700"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
              {selected.status === "APPLIED" && (
                <button
                  className="secondary-button"
                  onClick={() => void updateStatus(selected, "UNDER_REVIEW")}
                  disabled={busy === `status:${selected.id}`}
                >
                  Move to review
                </button>
              )}
              {!selected.interview && selected.status !== "REJECTED" && (
                <button
                  className="solid-button"
                  onClick={() => openInterview(selected)}
                >
                  Create AI interview
                </button>
              )}
              {!selected.interview && selected.status !== "REJECTED" && (
                <button
                  className="danger-button ml-auto"
                  onClick={() => void updateStatus(selected, "REJECTED")}
                  disabled={busy === `status:${selected.id}`}
                >
                  Reject application
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(interviewApplication)}
        onClose={() => setInterviewApplication(null)}
        title="Create and send AI interview"
        description={
          interviewApplication
            ? `${interviewApplication.candidateProfile?.user.name ?? "Candidate"} · ${interviewApplication.job.title}`
            : undefined
        }
        wide
      >
        <form className="space-y-5" onSubmit={createAiInterview}>
          <Notice tone="info">
            This action creates the interview, generates its AI questions, and
            queues the candidate invitation in one workflow.
          </Notice>
          <label>
            <span className="workspace-label">Active interview template</span>
            <select
              className="workspace-select"
              value={interviewForm.templateId}
              onChange={(event) =>
                setInterviewForm((current) => ({
                  ...current,
                  templateId: event.target.value,
                }))
              }
              required
            >
              <option value="">Select template</option>
              {templates
                .filter((template) => template.isActive)
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {titleCase(template.difficulty)} ·{" "}
                    {template.questionCount} questions
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span className="workspace-label">Interview title</span>
            <input
              className="workspace-input"
              value={interviewForm.title}
              onChange={(event) =>
                setInterviewForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="workspace-label">Scheduled at (optional)</span>
              <input
                className="workspace-input"
                type="datetime-local"
                value={interviewForm.scheduledAt}
                onChange={(event) =>
                  setInterviewForm((current) => ({
                    ...current,
                    scheduledAt: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span className="workspace-label">Expires at (optional)</span>
              <input
                className="workspace-input"
                type="datetime-local"
                value={interviewForm.expiresAt}
                onChange={(event) =>
                  setInterviewForm((current) => ({
                    ...current,
                    expiresAt: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              className="solid-button min-w-52"
              disabled={
                !interviewForm.templateId ||
                busy === `interview:${interviewApplication?.id}`
              }
            >
              {busy === `interview:${interviewApplication?.id}`
                ? "Creating AI interview…"
                : "Create, generate & invite"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
