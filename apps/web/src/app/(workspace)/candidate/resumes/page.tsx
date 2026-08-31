"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import type { Resume } from "@/lib/workspace-types";
import { EmptyState, LoadingState, Modal, Notice, PageHeader, StatusPill, formatDate } from "@/components/workspace-ui";

const sizeLabel = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export default function ResumesPage() {
  const { status, requestWithAuth } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [primary, setPrimary] = useState(false);
  const [askResume, setAskResume] = useState<Resume | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const load = useCallback(async () => {
    try { const data = await requestWithAuth<{ resumes: Resume[] }>("/candidate/resume"); setResumes(data.resumes); }
    catch (caught) { setError(errorMessage(caught)); } finally { setLoading(false); }
  }, [requestWithAuth]);
  useEffect(() => { if (status !== "authenticated") return; const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load, status]);

  const run = async (id: string, action: string, method = "POST") => {
    setBusy(`${id}:${action}`); setError(""); setNotice("");
    try { await requestWithAuth(`/candidate/resume/${id}/${action}`, { method }); setNotice(`Resume ${action} request completed.`); await load(); }
    catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  };

  const upload = async (event: FormEvent) => {
    event.preventDefault(); const file = fileRef.current?.files?.[0]; if (!file) { setError("Choose a PDF resume first."); return; }
    setBusy("upload"); setError("");
    const form = new FormData(); form.set("resume", file); if (title.trim()) form.set("title", title.trim()); form.set("isPrimary", String(primary));
    try { await requestWithAuth("/candidate/resume", { method: "POST", body: form }); setUploadOpen(false); setTitle(""); setPrimary(false); setNotice("Resume uploaded. Processing has started."); await load(); }
    catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  };

  const remove = async (resume: Resume) => {
    if (!window.confirm(`Delete ${resume.title ?? resume.originalFileName}?`)) return;
    setBusy(`${resume.id}:delete`); setError("");
    try { await requestWithAuth(`/candidate/resume/${resume.id}`, { method: "DELETE" }); setResumes((items) => items.filter((item) => item.id !== resume.id)); setNotice("Resume deleted."); }
    catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  };

  const openAsk = async (resume: Resume) => {
    setBusy(`${resume.id}:details`); setError("");
    try {
      const data = await requestWithAuth<{ resume: Resume }>(`/candidate/resume/${resume.id}`);
      setAskResume(data.resume); setQuestion(""); setAnswer("");
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  };

  const ask = async (event: FormEvent) => {
    event.preventDefault(); if (!askResume) return; setBusy(`${askResume.id}:ask`); setAnswer(""); setError("");
    try { const data = await requestWithAuth<Record<string, unknown>>(`/candidate/resume/${askResume.id}/ask`, { method: "POST", body: JSON.stringify({ question, limit: 6 }) }); const response = data.answer ?? data.response ?? data; setAnswer(typeof response === "string" ? response : JSON.stringify(response, null, 2)); }
    catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  };

  return <div>
    <PageHeader eyebrow="Knowledge base" title="Resumes" description="Upload, process, inspect, and query the career context used to personalize your interviews." action={<button className="solid-button" onClick={() => setUploadOpen(true)}>Upload resume</button>} />
    {(error || notice) && <div className="mt-6">{error ? <Notice>{error}</Notice> : <Notice tone="success">{notice}</Notice>}</div>}
    <section className="mt-8">{loading ? <LoadingState label="Loading resumes" /> : resumes.length === 0 ? <EmptyState title="Add your first resume" description="Upload a PDF and the AI pipeline will parse, analyze, and prepare it for interview generation." action={<button className="solid-button" onClick={() => setUploadOpen(true)}>Choose a PDF</button>} /> : <div className="grid gap-5 xl:grid-cols-2">
      {resumes.map((resume, index) => <article key={resume.id} className="workspace-card card-rise" style={{ animationDelay: `${index * 60}ms` }}>
        <div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700"><svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold text-slate-950">{resume.title ?? resume.originalFileName}</h2>{resume.isPrimary && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">PRIMARY</span>}<StatusPill value={resume.status} /></div><p className="mt-1 text-xs text-slate-500">{sizeLabel(resume.fileSize)} · Uploaded {formatDate(resume.uploadedAt)}</p></div></div>
        {resume.processingError && <div className="mt-4"><Notice>{resume.processingError}</Notice></div>}
        <div className="mt-5 flex flex-wrap gap-2"><button className="soft-button" onClick={() => void run(resume.id, "process")} disabled={busy.startsWith(resume.id)}>Process</button>{["parse","analyze","chunk","embed"].map((action) => <button key={action} className="secondary-button" onClick={() => void run(resume.id, action)} disabled={busy.startsWith(resume.id)}>{action[0].toUpperCase()+action.slice(1)}</button>)}<button className="secondary-button" onClick={() => void openAsk(resume)} disabled={busy.startsWith(resume.id)}>Details & Ask AI</button>{!resume.isPrimary && <button className="secondary-button" onClick={() => void run(resume.id, "primary", "PATCH")}>Make primary</button>}<button className="danger-button" onClick={() => void remove(resume)}>Delete</button></div>
      </article>)}
    </div>}</section>

    <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload a resume" description="PDF only. Processing will be queued automatically."><form className="space-y-5" onSubmit={upload}><label><span className="workspace-label">Resume title</span><input className="workspace-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product engineering resume" /></label><label><span className="workspace-label">PDF file</span><input ref={fileRef} className="workspace-input file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-1.5 file:font-semibold file:text-violet-700" type="file" accept="application/pdf,.pdf" required /></label><label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} className="size-4 accent-violet-600" />Use as primary resume</label><button className="solid-button w-full" disabled={busy === "upload"}>{busy === "upload" ? "Uploading…" : "Upload and process"}</button></form></Modal>
    <Modal open={Boolean(askResume)} onClose={() => setAskResume(null)} title="Resume intelligence" description="Inspect extracted skills and search the embedded resume context."><div className="mb-5 flex flex-wrap gap-2">{askResume?.skills?.map((skill) => <span key={skill.id} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{skill.name}</span>)}{askResume?.skills?.length === 0 && <span className="text-sm text-slate-500">No extracted skills yet. Process the resume first.</span>}</div><form onSubmit={ask} className="space-y-4"><textarea className="workspace-textarea" value={question} onChange={(e) => setQuestion(e.target.value)} required placeholder="What are my strongest examples of leading complex projects?" /><button className="solid-button" disabled={!askResume || busy.endsWith(":ask")}>{busy.endsWith(":ask") ? "Thinking…" : "Ask AI"}</button>{answer && <div className="max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">{answer}</div>}</form></Modal>
  </div>;
}
