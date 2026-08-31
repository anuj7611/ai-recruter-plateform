"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import type {
  CandidateJob,
  JobApplication,
  Resume,
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

export default function CandidateJobsPage() {
  const { status, requestWithAuth } = useAuth();
  const [jobs, setJobs] = useState<CandidateJob[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selected, setSelected] = useState<CandidateJob | null>(null);
  const [resumeId, setResumeId] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [jobData, applicationData, resumeData] = await Promise.all([
        requestWithAuth<{ jobs: CandidateJob[] }>("/candidate/jobs"),
        requestWithAuth<{ applications: JobApplication[] }>(
          "/candidate/applications",
        ),
        requestWithAuth<{ resumes: Resume[] }>("/candidate/resume"),
      ]);
      setJobs(jobData.jobs);
      setApplications(applicationData.applications);
      setResumes(resumeData.resumes);
      const primary = resumeData.resumes.find(
        (resume) => resume.isPrimary && resume.status === "READY",
      );
      setResumeId(primary?.id ?? "");
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

  const readyResumes = useMemo(
    () => resumes.filter((resume) => resume.status === "READY"),
    [resumes],
  );

  const openJob = async (job: CandidateJob) => {
    setBusy(`details:${job.id}`);
    setError("");
    try {
      const data = await requestWithAuth<{ job: CandidateJob }>(
        `/candidate/jobs/${job.id}`,
      );
      setSelected(data.job);
      setCoverLetter("");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const apply = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(`apply:${selected.id}`);
    setError("");
    setNotice("");
    try {
      await requestWithAuth(`/candidate/jobs/${selected.id}/apply`, {
        method: "POST",
        body: JSON.stringify({
          resumeId,
          coverLetter: coverLetter.trim() || null,
        }),
      });
      setSelected(null);
      setNotice(
        "Application submitted. The recruiter received your profile and resume.",
      );
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  if (loading) return <LoadingState label="Loading opportunities" />;

  return (
    <div>
      <PageHeader
        eyebrow="Career opportunities"
        title="Find your next role"
        description="Explore active jobs, apply with a processed resume, and track every application through the interview stage."
        action={
          <Link href="/candidate/resumes" className="secondary-button">
            Manage resumes
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
          label="Open roles"
          value={jobs.length}
          detail="Currently accepting applications"
        />
        <MetricCard
          label="Applications"
          value={applications.length}
          detail="Submitted from your profile"
          accent="sky"
        />
        <MetricCard
          label="Interview stage"
          value={
            applications.filter((item) => item.status === "INTERVIEW_CREATED")
              .length
          }
          detail="AI interviews created"
          accent="emerald"
        />
      </div>

      {applications.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-950">
            My applications
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {applications.map((application) => (
              <article key={application.id} className="workspace-card card-rise">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {application.job.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {application.job.department ?? "General"} · Applied{" "}
                      {formatDate(application.appliedAt)}
                    </p>
                  </div>
                  <StatusPill value={application.status} />
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Resume: {application.resume.title ?? application.resume.originalFileName}
                </p>
                {application.interview && (
                  <Link
                    href={`/candidate/interviews/${application.interview.id}`}
                    className="soft-button mt-4"
                  >
                    Open interview
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-9">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Open jobs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Roles published by recruiters on the platform.
            </p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="No active jobs right now"
              description="Newly published opportunities will appear here and in your notifications."
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {jobs.map((job, index) => {
              const application = job.applications[0];
              return (
                <article
                  key={job.id}
                  className="workspace-card card-rise"
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                        {job.createdBy.name}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">
                        {job.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {job.department ?? "General"} · {job.location ?? "Flexible"}
                      </p>
                    </div>
                    {application ? (
                      <StatusPill value={application.status} />
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        Open
                      </span>
                    )}
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {job.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.requiredSkills.slice(0, 6).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                    <p className="text-xs text-slate-400">
                      {titleCase(job.experienceLevel ?? "Any level")} ·{" "}
                      {job.employmentType ?? "Employment type flexible"}
                    </p>
                    <button
                      className={application ? "secondary-button" : "solid-button"}
                      onClick={() => void openJob(job)}
                      disabled={busy === `details:${job.id}`}
                    >
                      {application ? "View details" : "View & apply"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? "Job details"}
        description={selected ? `${selected.department ?? "General"} · ${selected.location ?? "Flexible"}` : undefined}
        wide
      >
        {selected && (
          <div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {selected.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {selected.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700"
                >
                  {skill}
                </span>
              ))}
            </div>

            {selected.applications.length > 0 ? (
              <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="font-semibold text-emerald-950">
                  Application already submitted
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  Current status: {titleCase(selected.applications[0].status)}
                </p>
              </div>
            ) : readyResumes.length === 0 ? (
              <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="font-semibold text-amber-950">
                  A processed resume is required
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  Upload and process a resume before applying.
                </p>
                <Link href="/candidate/resumes" className="secondary-button mt-4">
                  Manage resumes
                </Link>
              </div>
            ) : (
              <form className="mt-7 space-y-5 border-t border-slate-100 pt-6" onSubmit={apply}>
                <label>
                  <span className="workspace-label">Submit resume</span>
                  <select
                    className="workspace-select"
                    value={resumeId}
                    onChange={(event) => setResumeId(event.target.value)}
                    required
                  >
                    <option value="">Choose a processed resume</option>
                    {readyResumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>
                        {resume.title ?? resume.originalFileName}
                        {resume.isPrimary ? " (Primary)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="workspace-label">Cover note (optional)</span>
                  <textarea
                    className="workspace-textarea"
                    value={coverLetter}
                    onChange={(event) => setCoverLetter(event.target.value)}
                    placeholder="Briefly explain why this role is a strong match."
                    maxLength={5000}
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    className="solid-button min-w-40"
                    disabled={busy === `apply:${selected.id}` || !resumeId}
                  >
                    {busy === `apply:${selected.id}`
                      ? "Submitting…"
                      : "Submit application"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
