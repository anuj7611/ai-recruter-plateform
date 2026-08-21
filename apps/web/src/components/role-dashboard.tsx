"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import { StatusMessage } from "./auth/form-controls";

type WorkspaceKind = "recruiter" | "organization" | "admin";

const content = {
  recruiter: {
    eyebrow: "Recruiter workspace",
    title: "Build stronger interview loops.",
    description: "Coordinate candidates, interviews, and evidence from one focused workspace.",
    cards: [
      ["Candidate pipeline", "Keep every candidate moving through a consistent, visible process."],
      ["Interview plans", "Create structured interview loops and assign the right interviewers."],
      ["Evaluation quality", "Bring feedback together before making a hiring decision."],
    ],
  },
  organization: {
    eyebrow: "Organization administration",
    title: "Keep your hiring team aligned.",
    description: "Manage recruiter access and maintain a secure operating foundation.",
    cards: [
      ["Team access", "Invite recruiters through secure, expiring account links."],
      ["Hiring operations", "Establish consistent access and interview workflows across your team."],
      ["Account security", "Review device sessions and remove access immediately when needed."],
    ],
  },
  admin: {
    eyebrow: "Super administration",
    title: "Control the platform securely.",
    description: "Provision privileged access and oversee the authentication foundation.",
    cards: [
      ["Role provisioning", "Invite organization admins, recruiters, or additional super admins."],
      ["Access boundaries", "Every privileged operation is checked against the authenticated role."],
      ["Session security", "Token rotation, lockouts, and device revocation protect every role."],
    ],
  },
} as const;

export function RoleDashboard({ kind }: { kind: WorkspaceKind }) {
  const { user, resendVerification } = useAuth();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const page = content[kind];
  const canInvite = kind === "organization" || kind === "admin";

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

  return (
    <div>
      {!user?.emailVerifiedAt && (
        <div className="mb-7 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-amber-950">Verify your email address</p>
            <p className="mt-1 text-sm text-amber-800">Verification protects this privileged workspace.</p>
          </div>
          <button className="secondary-button shrink-0" onClick={resend} disabled={sending}>{sending ? "Sending…" : "Resend email"}</button>
        </div>
      )}
      {notice && <StatusMessage tone="success">{notice}</StatusMessage>}
      {error && <StatusMessage>{error}</StatusMessage>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-600">{page.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{page.title}</h1>
          <p className="mt-2 max-w-2xl text-slate-500">{page.description}</p>
        </div>
        {canInvite && <Link href="/access/invitations" className="secondary-button">Invite a team member</Link>}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {page.cards.map(([title, description], index) => (
          <article key={title} className={`workspace-card ${index === 0 ? "md:col-span-2" : ""}`}>
            <span className="card-icon bg-violet-100 text-violet-700">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M12 5v14"/><circle cx="12" cy="12" r="9"/></svg>
            </span>
            <h2 className="mt-6 text-xl font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            <span className="mt-6 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Authentication ready</span>
          </article>
        ))}
      </div>
    </div>
  );
}
