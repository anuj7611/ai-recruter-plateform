"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import type {
  InterviewTemplate,
  JobOpening,
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

const blank = {
  candidateProfileId: "",
  resumeId: "",
  jobId: "",
  templateId: "",
  title: "",
  scheduledAt: "",
  expiresAt: "",
};

export default function RecruiterInterviewsPage() {
  const { status, requestWithAuth } = useAuth();
  const [items, setItems] = useState<RecruiterInterview[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [form, setForm] = useState(blank);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<RecruiterInterview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [interviewData, jobData, templateData] = await Promise.all([
        requestWithAuth<{ interviews: RecruiterInterview[] }>("/interviews"),
        requestWithAuth<{ jobs: JobOpening[] }>("/jobs"),
        requestWithAuth<{ templates: InterviewTemplate[] }>(
          "/interview-templates",
        ),
      ]);
      setItems(interviewData.interviews);
      setJobs(jobData.jobs);
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

  const stats = useMemo(() => {
    const scores = items.flatMap((item) =>
      item.overallScore === null ? [] : [item.overallScore],
    );
    return {
      active: items.filter((item) =>
        ["READY", "SCHEDULED", "IN_PROGRESS"].includes(item.status),
      ).length,
      completed: items.filter((item) => item.status === "COMPLETED").length,
      average: scores.length
        ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
        : 0,
    };
  }, [items]);

  const detail = async (id: string) => {
    setBusy(id);
    setError("");
    try {
      const data = await requestWithAuth<{ interview: RecruiterInterview }>(
        `/interviews/${id}`,
      );
      setSelected(data.interview);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("create");
    setError("");
    try {
      await requestWithAuth("/interviews", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          title: form.title || undefined,
          scheduledAt: form.scheduledAt
            ? new Date(form.scheduledAt).toISOString()
            : null,
          expiresAt: form.expiresAt
            ? new Date(form.expiresAt).toISOString()
            : null,
        }),
      });
      setCreateOpen(false);
      setForm(blank);
      setNotice("Interview created. Generate questions before sending the invitation.");
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const action = async (
    id: string,
    kind: "generate-questions" | "invitations",
    method = "POST",
  ) => {
    setBusy(`${id}:${kind}`);
    setError("");
    try {
      await requestWithAuth(`/interviews/${id}/${kind}`, {
        method,
        body:
          method === "POST" && kind === "invitations"
            ? JSON.stringify({ expiresInHours: 72 })
            : undefined,
      });
      setNotice(
        kind === "generate-questions"
          ? "Questions generated successfully."
          : method === "DELETE"
            ? "Invitation revoked."
            : "Invitation and reminder queued.",
      );
      await load();
      if (selected?.id === id) await detail(id);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const candidate = selected?.candidateProfile;
  const candidateName = candidate?.user.name ?? "Candidate";
  const initials = candidateName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div>
      <PageHeader
        eyebrow="Interview operations"
        title="Interviews"
        description="Create assessments, generate questions, send invitations, and review completed evidence."
        action={
          <button className="solid-button" onClick={() => setCreateOpen(true)}>
            Create interview
          </button>
        }
      />

      {(error || notice) && (
        <div className="mt-6">
          {error ? <Notice>{error}</Notice> : <Notice tone="success">{notice}</Notice>}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Active" value={stats.active} detail="Ready, scheduled, or underway" />
        <MetricCard label="Completed" value={stats.completed} detail="Evaluations delivered" accent="emerald" />
        <MetricCard label="Average score" value={`${stats.average}%`} detail="Across completed interviews" accent="sky" />
      </div>

      <section className="mt-8">
        {loading ? (
          <LoadingState label="Loading interviews" />
        ) : items.length === 0 ? (
          <EmptyState
            title="Create your first interview"
            description="You’ll need a candidate profile ID, ready resume, active job, and active template."
            action={<button className="solid-button" onClick={() => setCreateOpen(true)}>Create interview</button>}
          />
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <article key={item.id} className="workspace-card card-rise" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-950 to-indigo-950 text-xs text-white shadow-md">▶</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-950">{item.title}</h2>
                      <StatusPill value={item.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.candidateProfile?.user.name ?? "Candidate"} · {item.job?.title ?? "Job"} · {formatDate(item.scheduledAt)}
                    </p>
                  </div>
                  {item.overallScore !== null && (
                    <div className="text-center">
                      <p className="text-xl font-semibold text-slate-950">{item.overallScore}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Score</p>
                    </div>
                  )}
                  <button className="secondary-button" onClick={() => void detail(item.id)} disabled={busy === item.id}>
                    {busy === item.id ? "Opening…" : "Open"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create interview"
        description="Enter the candidate, resume, job, and template identifiers for this assessment."
        wide
      >
        <form className="space-y-4" onSubmit={create}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="workspace-label">Candidate profile ID</span>
              <input className="workspace-input font-mono text-xs" value={form.candidateProfileId} onChange={(event) => setForm({ ...form, candidateProfileId: event.target.value })} required />
            </label>
            <label>
              <span className="workspace-label">Candidate resume ID</span>
              <input className="workspace-input font-mono text-xs" value={form.resumeId} onChange={(event) => setForm({ ...form, resumeId: event.target.value })} required />
            </label>
            <label>
              <span className="workspace-label">Active job</span>
              <select className="workspace-select" value={form.jobId} onChange={(event) => setForm({ ...form, jobId: event.target.value })} required>
                <option value="">Select a job</option>
                {jobs.filter((job) => job.status === "ACTIVE").map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
              </select>
            </label>
            <label>
              <span className="workspace-label">Active template</span>
              <select className="workspace-select" value={form.templateId} onChange={(event) => setForm({ ...form, templateId: event.target.value })} required>
                <option value="">Select a template</option>
                {templates.filter((template) => template.isActive).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
            </label>
            <label>
              <span className="workspace-label">Custom title (optional)</span>
              <input className="workspace-input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              <span className="workspace-label">Scheduled at</span>
              <input className="workspace-input" type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} />
            </label>
            <label>
              <span className="workspace-label">Expires at</span>
              <input className="workspace-input" type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
            </label>
          </div>
          <div className="flex justify-end">
            <button className="solid-button" disabled={busy === "create"}>{busy === "create" ? "Creating…" : "Create interview"}</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? "Interview details"}
        description={selected ? `${candidateName} · ${selected.job?.title ?? "Role"}` : undefined}
        wide
      >
        {selected && candidate && (
          <div>
            <section className="invitation-hero overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-5 text-white shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <span
                  className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10 bg-cover bg-center text-lg font-bold ring-1 ring-white/15 backdrop-blur"
                  style={
                    candidate.user.avatarUrl
                      ? { backgroundImage: `url(${candidate.user.avatarUrl})` }
                      : undefined
                  }
                >
                  {!candidate.user.avatarUrl && initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-white">{candidate.user.name}</h2>
                    <StatusPill value={selected.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {candidate.headline ?? candidate.currentRole ?? "Candidate"}
                  </p>
                  <a className="mt-1 inline-block text-xs text-violet-200 hover:text-white" href={`mailto:${candidate.user.email}`}>
                    {candidate.user.email}
                  </a>
                </div>
                {selected.overallScore !== null && (
                  <div className="rounded-xl bg-white/10 px-4 py-2 text-center ring-1 ring-white/10">
                    <p className="text-2xl font-bold text-white">{selected.overallScore}%</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Score</p>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950">Candidate details</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Profile and experience shared with this application.</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {[
                  ["Current role", candidate.currentRole ?? "Not specified"],
                  ["Target role", candidate.targetRole ?? "Not specified"],
                  ["Experience", `${candidate.experienceYears ?? 0} years${candidate.experienceLevel ? ` · ${titleCase(candidate.experienceLevel)}` : ""}`],
                  ["Location", candidate.location ?? "Not specified"],
                  ["Job", selected.job?.title ?? "Not specified"],
                  ["Scheduled", formatDate(selected.scheduledAt)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-violet-200 hover:bg-violet-50/40">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
              {candidate.bio && (
                <div className="mt-3 rounded-xl border border-slate-100 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">About</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-600">{candidate.bio}</p>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["LinkedIn", candidate.linkedinUrl],
                  ["GitHub", candidate.githubUrl],
                  ["Portfolio", candidate.portfolioUrl],
                ].map(([label, url]) =>
                  url ? (
                    <a key={label} href={url} target="_blank" rel="noreferrer" className="soft-button">{label} ↗</a>
                  ) : null,
                )}
              </div>
            </section>

            {selected.resume && (
              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">Resume</h3>
                      {selected.resume.status && <StatusPill value={selected.resume.status} />}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {selected.resume.title ?? selected.resume.originalFileName ?? "Candidate resume"}
                    </p>
                  </div>
                  {selected.resume.storageUrl && (
                    <a href={selected.resume.storageUrl} target="_blank" rel="noreferrer" className="secondary-button">Open resume ↗</a>
                  )}
                </div>
                {Boolean(selected.resume.skills?.length) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selected.resume.skills?.map((skill) => (
                      <span key={skill.id} className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-600/10">
                        {skill.name}{skill.yearsExperience ? ` · ${skill.yearsExperience}y` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div className="mt-5 grid gap-2.5 sm:grid-cols-4">
              {[
                ["Status", <StatusPill key="status" value={selected.status} />],
                ["Type", titleCase(selected.type)],
                ["Difficulty", titleCase(selected.difficulty)],
                ["Score", selected.overallScore ?? "—"],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  <div className="mt-1.5 text-xs font-semibold text-slate-800">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button className="solid-button" onClick={() => void action(selected.id, "generate-questions")} disabled={busy === `${selected.id}:generate-questions`}>Generate questions</button>
              <button className="soft-button" onClick={() => void action(selected.id, "invitations")} disabled={busy === `${selected.id}:invitations`}>Send invitation</button>
              <button className="danger-button" onClick={() => void action(selected.id, "invitations", "DELETE")} disabled={busy === `${selected.id}:invitations`}>Revoke invitation</button>
            </div>

            <section className="mt-5">
              <h3 className="font-semibold text-slate-950">Questions ({selected.questions?.length ?? 0})</h3>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {selected.questions?.map((question) => (
                  <div key={question.id} className="rounded-xl border border-slate-100 p-3 transition hover:border-violet-200">
                    <div className="flex gap-3">
                      <span className="font-bold text-violet-600">{question.order}.</span>
                      <div>
                        <p className="text-xs font-medium text-slate-800">{question.question}</p>
                        {question.answer && <p className="mt-1 text-[10px] text-slate-500">Score: {question.answer.score ?? "Pending"}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                {!selected.questions?.length && (
                  <p className="rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-500">Generate questions to prepare this interview.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}
