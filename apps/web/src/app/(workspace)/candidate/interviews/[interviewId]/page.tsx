"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import type {
  CandidateInterview,
  CandidateQuestion,
  InterviewResult,
} from "@/lib/workspace-types";
import {
  LoadingState,
  Notice,
  StatusPill,
  formatDate,
  titleCase,
} from "@/components/workspace-ui";

interface QuestionResponse {
  question: CandidateQuestion | null;
  currentQuestion?: CandidateQuestion | null;
  allQuestionsAnswered?: boolean;
  progress?: { answered: number; total: number };
}

export default function CandidateInterviewRoom() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { status, requestWithAuth } = useAuth();
  const [interview, setInterview] = useState<CandidateInterview | null>(null);
  const [question, setQuestion] = useState<CandidateQuestion | null>(null);
  const [progress, setProgress] = useState({ answered: 0, total: 0 });
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [codeAnswer, setCodeAnswer] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const appendSpeechTranscript = useCallback((transcript: string) => {
    setAnswerText((current) => {
      const existing = current.trimEnd();
      return existing ? `${existing} ${transcript}` : transcript;
    });
  }, []);

  const {
    isSupported: isSpeechSupported,
    isListening,
    interimTranscript,
    speechError,
    startListening,
    stopListening,
    clearSpeechError,
  } = useSpeechRecognition(appendSpeechTranscript);

  const loadResult = useCallback(async () => {
    const data = await requestWithAuth<{ result: InterviewResult }>(
      `/candidate/interviews/${interviewId}/result`,
    );
    setResult(data.result);
  }, [interviewId, requestWithAuth]);

  const loadQuestion = useCallback(async () => {
    const data = await requestWithAuth<QuestionResponse>(
      `/candidate/interviews/${interviewId}/current-question`,
    );
    setQuestion(data.question);
    if (data.progress) setProgress(data.progress);
    setStartedAt(Date.now());
  }, [interviewId, requestWithAuth]);

  const load = useCallback(async () => {
    try {
      const data = await requestWithAuth<{
        interviews: CandidateInterview[];
      }>("/candidate/interviews");
      const found =
        data.interviews.find((item) => item.id === interviewId) ?? null;
      setInterview(found);
      if (!found) throw new Error("Interview not found.");

      if (found.status === "COMPLETED") await loadResult();
      else if (found.status === "IN_PROGRESS") await loadQuestion();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [interviewId, loadQuestion, loadResult, requestWithAuth]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, status]);

  const acceptInvitation = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await requestWithAuth<{
        accepted: boolean;
        invitation: { status: string; expiresAt: string };
      }>(`/candidate/interviews/${interviewId}/invitation/accept`, {
        method: "POST",
      });
      setInterview((current) =>
        current ? { ...current, invitation: data.invitation } : current,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await requestWithAuth<
        QuestionResponse & { interview?: CandidateInterview }
      >(`/candidate/interviews/${interviewId}/start`, { method: "POST" });
      if (data.interview) {
        setInterview((current) =>
          current ? { ...current, status: "IN_PROGRESS" } : current,
        );
      }
      setQuestion(data.currentQuestion ?? data.question ?? null);
      setProgress((current) => ({
        answered: current.answered,
        total:
          data.interview?.questionCount ??
          interview?.questionCount ??
          current.total,
      }));
      setStartedAt(Date.now());
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!question) return;

    if (isListening) {
      setError("Stop the microphone before submitting so the final words are included.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const elapsed = startedAt
        ? Math.round((Date.now() - startedAt) / 1000)
        : 0;
      const data = await requestWithAuth<{
        nextQuestion: CandidateQuestion | null;
        allQuestionsAnswered: boolean;
        progress?: { answered: number; total: number };
      }>(`/candidate/interviews/${interviewId}/answer`, {
        method: "POST",
        body: JSON.stringify({
          answerText: answerText.trim() || null,
          codeAnswer: codeAnswer.trim() || null,
          programmingLanguage: codeAnswer.trim() ? language : null,
          durationSeconds: elapsed,
        }),
      });

      setAnswerText("");
      setCodeAnswer("");
      clearSpeechError();
      if (data.progress) setProgress(data.progress);
      setQuestion(data.nextQuestion);
      setStartedAt(Date.now());
      if (data.allQuestionsAnswered || !data.nextQuestion) {
        setProgress((current) => ({ ...current, answered: current.total }));
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    stopListening();
    setBusy(true);
    setError("");
    try {
      const data = await requestWithAuth<{ interview: InterviewResult }>(
        `/candidate/interviews/${interviewId}/complete`,
        { method: "POST" },
      );
      setResult(data.interview);
      setInterview((current) =>
        current ? { ...current, status: "COMPLETED" } : current,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState label="Preparing interview room" />;
  if (!interview) return <Notice>{error || "Interview not found."}</Notice>;

  if (result) {
    return (
      <div className="page-enter">
        <Link href="/candidate/interviews" className="text-xs font-semibold text-violet-600">
          ← All interviews
        </Link>
        <div className="mt-5 overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-2xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-violet-300">Interview complete</p>
              <h1 className="mt-1.5 text-2xl font-semibold">{result.title}</h1>
            </div>
            <div className="grid size-24 place-items-center rounded-full border-8 border-emerald-400/30 bg-white/5">
              <div className="text-center">
                <p className="text-2xl font-bold">{result.overallScore ?? "—"}</p>
                <p className="text-[9px] uppercase tracking-widest text-slate-400">score</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section className="workspace-card">
            <h2 className="font-semibold">Final feedback</h2>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-600">
              {result.finalFeedback ?? "Feedback is still being prepared."}
            </p>
          </section>
          <section className="workspace-card">
            <h2 className="font-semibold">Evaluation</h2>
            <div className="mt-3 space-y-2">
              {result.evaluationData ? (
                Object.entries(result.evaluationData).map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{titleCase(key)}</p>
                    <p className="mt-1 text-xs text-slate-700">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No detailed evaluation available.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  const allAnswered = !question && interview.status === "IN_PROGRESS";
  const needsAcceptance =
    interview.requiresInvitation && interview.invitation?.status !== "ACCEPTED";
  const canAcceptInvitation =
    needsAcceptance &&
    Boolean(
      interview.invitation &&
        ["PENDING", "SENT", "OPENED"].includes(interview.invitation.status),
    );

  if (needsAcceptance) {
    const invitationUnavailable =
      !interview.invitation ||
      ["REVOKED", "EXPIRED"].includes(interview.invitation.status);

    return (
      <div className="page-enter">
        <Link href="/candidate/interviews" className="text-xs font-semibold text-violet-600">
          ← All interviews
        </Link>
        <section className="invitation-hero mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-white shadow-2xl">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-violet-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-200">Interview invitation</span>
              {interview.invitation && <StatusPill value={interview.invitation.status} />}
            </div>
            <div className="float-gentle mt-5 grid size-12 place-items-center rounded-2xl bg-white/10 text-violet-200 ring-1 ring-white/10 backdrop-blur">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-4xl">{interview.title}</h1>
            <p className="mt-2 text-xs text-slate-300">
              {interview.job?.title ?? "General interview"} · {titleCase(interview.type)} · {interview.durationMinutes} minutes
            </p>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
              {[
                ["Scheduled", formatDate(interview.scheduledAt)],
                ["Questions", interview.questionCount],
                ["Difficulty", titleCase(interview.difficulty)],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-white/[.07] p-3.5 ring-1 ring-white/[.06] transition hover:-translate-y-0.5 hover:bg-white/[.1]">
                  <p className="text-[10px] text-slate-400">{label}</p>
                  <p className="mt-1 text-xs font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <footer className="border-t border-white/10 bg-black/15 p-5 sm:flex sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="text-sm font-semibold">{invitationUnavailable ? "No active invitation is available" : "Accept to unlock this interview"}</p>
              <p className="mt-1 text-xs text-slate-400">{invitationUnavailable ? "Ask the recruiter to send a new invitation." : "You can start at the scheduled time after accepting."}</p>
            </div>
            {canAcceptInvitation && (
              <button className="mt-4 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60 sm:mt-0" onClick={acceptInvitation} disabled={busy}>
                {busy ? "Accepting…" : "Accept invitation"}
              </button>
            )}
          </footer>
        </section>
        {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/candidate/interviews" className="text-xs font-semibold text-violet-600">← All interviews</Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{interview.title}</h1>
            <StatusPill value={interview.status} />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {titleCase(interview.type)} · {interview.durationMinutes} minutes · Scheduled {formatDate(interview.scheduledAt)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center shadow-sm">
          <p className="text-xl font-semibold text-slate-950">{progress.answered}/{progress.total || interview.questionCount}</p>
          <p className="text-[9px] uppercase tracking-wider text-slate-400">answered</p>
        </div>
      </div>

      {error && <div className="mt-5"><Notice>{error}</Notice></div>}

      {interview.status !== "IN_PROGRESS" ? (
        <section className="invitation-hero mt-6 grid min-h-80 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 text-center text-white">
          <div className="max-w-lg">
            <span className="float-gentle mx-auto grid size-16 place-items-center rounded-2xl bg-white/10 backdrop-blur">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2a10 10 0 1 0 10 10M12 6v6l4 2" /></svg>
            </span>
            <h2 className="mt-5 font-semibold">Ready when you are</h2>
            <p className="mt-2 text-xs leading-5 text-slate-300">Find a quiet space and allow approximately {interview.durationMinutes} minutes. Answers are evaluated as you progress.</p>
            <button className="mt-5 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:-translate-y-0.5 hover:scale-[1.02]" onClick={start} disabled={busy}>
              {busy ? "Starting…" : "Start interview"}
            </button>
          </div>
        </section>
      ) : allAnswered ? (
        <section className="mt-6 grid min-h-72 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-600 text-xl text-white">✓</span>
            <h2 className="mt-4 font-semibold text-emerald-950">All questions answered</h2>
            <p className="mt-1.5 text-xs text-emerald-800">Submit the interview to generate your score and feedback.</p>
            <button className="solid-button mt-5" onClick={complete} disabled={busy}>{busy ? "Evaluating…" : "Complete interview"}</button>
          </div>
        </section>
      ) : question ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <form className="workspace-card" onSubmit={submit}>
            <div className="flex items-center justify-between gap-4">
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">Question {question.number}</span>
              <span className="text-[10px] font-medium text-slate-400">{titleCase(question.difficulty)} · {titleCase(question.type)}</span>
            </div>
            <h2 className="mt-5 font-semibold leading-7 text-slate-950">{question.question}</h2>

            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="interview-answer" className="workspace-label mb-0">Your answer</label>
                {isSpeechSupported ? (
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`mic-button ${isListening ? "mic-button-listening" : ""}`}
                    aria-pressed={isListening}
                  >
                    <span className="relative grid size-6 place-items-center rounded-full bg-current/10">
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></svg>
                      {isListening && <span className="absolute inset-0 rounded-full border border-rose-400 mic-ripple" />}
                    </span>
                    {isListening ? "Stop listening" : "Answer with microphone"}
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400">Voice input unavailable in this browser</span>
                )}
              </div>
              <textarea
                id="interview-answer"
                className={`workspace-textarea mt-2 min-h-44 ${isListening ? "border-rose-300 ring-4 ring-rose-100/70" : ""}`}
                value={answerText}
                onChange={(event) => {
                  setAnswerText(event.target.value);
                  clearSpeechError();
                }}
                placeholder="Type your answer or use the microphone to speak."
              />

              {isListening && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2.5 text-xs text-rose-800">
                  <span className="mt-1 flex gap-0.5">
                    {[0, 1, 2].map((bar) => <span key={bar} className="voice-bar block w-0.5 rounded-full bg-rose-500" style={{ animationDelay: `${bar * 120}ms` }} />)}
                  </span>
                  <div><p className="font-semibold">Listening…</p><p className="mt-0.5 text-[10px] text-rose-600">{interimTranscript || "Start speaking clearly. Your words will appear above."}</p></div>
                </div>
              )}

              {speechError && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
                  <span>{speechError}</span>
                  <button type="button" className="font-bold" onClick={clearSpeechError}>Dismiss</button>
                </div>
              )}

              <p className="mt-2 text-[9px] text-slate-400">
                Voice is converted to text by your browser. Audio is not saved by this application.
              </p>
            </div>

            {question.type === "CODING" && (
              <div className="mt-4">
                <label><span className="workspace-label">Language</span><select className="workspace-select" value={language} onChange={(event) => setLanguage(event.target.value)}>{["javascript", "typescript", "python", "java", "cpp", "go"].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="mt-3 block"><span className="workspace-label">Code</span><textarea className="workspace-textarea min-h-52 font-mono text-xs" value={codeAnswer} onChange={(event) => setCodeAnswer(event.target.value)} /></label>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              {isListening ? <p className="text-[10px] font-medium text-rose-600">Stop listening before submitting.</p> : <span />}
              <button className="solid-button min-w-32" disabled={busy || isListening || (!answerText.trim() && !codeAnswer.trim())}>
                {busy ? "Evaluating…" : "Submit answer"}
              </button>
            </div>
          </form>

          <aside className="workspace-card self-start">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Interview progress</p>
            <div className="mt-3 h-1.5 rounded-full bg-slate-100">
              <div className="progress-shimmer h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600" style={{ width: `${Math.max(4, (progress.answered / (progress.total || interview.questionCount)) * 100)}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Take a moment to think. Clear reasoning and specific examples matter more than speed.</p>
            <div className="mt-4 rounded-xl bg-violet-50 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-violet-500">Voice tip</p>
              <p className="mt-1 text-[10px] leading-4 text-violet-700">Speak in short, complete sentences and review the transcript before submitting.</p>
            </div>
          </aside>
        </div>
      ) : (
        <LoadingState label="Loading current question" />
      )}
    </div>
  );
}
