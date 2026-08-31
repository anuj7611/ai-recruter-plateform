"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { errorMessage } from "@/lib/auth/api";
import type { CandidateProfileDetails, CandidateProfileResponse } from "@/lib/workspace-types";
import { LoadingState, Notice, PageHeader } from "@/components/workspace-ui";

const emptyProfile: CandidateProfileDetails = { id: "", headline: "", bio: "", currentRole: "", targetRole: "", experienceYears: 0, experienceLevel: null, location: "", linkedinUrl: "", githubUrl: "", portfolioUrl: "" };

export default function CandidateProfilePage() {
  const { status, requestWithAuth } = useAuth();
  const [profile, setProfile] = useState(emptyProfile);
  const [identity, setIdentity] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try { const data = await requestWithAuth<{ profile: CandidateProfileResponse }>("/candidate/profile"); setProfile(data.profile.candidateProfile); setIdentity({ name: data.profile.name, email: data.profile.email }); }
    catch (caught) { setError(errorMessage(caught)); } finally { setLoading(false); }
  }, [requestWithAuth]);
  useEffect(() => { if (status !== "authenticated") return; const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load, status]);

  const update = (field: keyof CandidateProfileDetails, value: string | number | null) => setProfile((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const nullable = (value: string | null) => value?.trim() || null;
    try {
      const data = await requestWithAuth<{ profile: CandidateProfileDetails }>("/candidate/profile", { method: "PATCH", body: JSON.stringify({ headline: nullable(profile.headline), bio: nullable(profile.bio), currentRole: nullable(profile.currentRole), targetRole: nullable(profile.targetRole), experienceYears: Number(profile.experienceYears), experienceLevel: profile.experienceLevel || null, location: nullable(profile.location), linkedinUrl: nullable(profile.linkedinUrl), githubUrl: nullable(profile.githubUrl), portfolioUrl: nullable(profile.portfolioUrl) }) });
      setProfile(data.profile); setNotice("Profile updated successfully.");
    } catch (caught) { setError(errorMessage(caught)); } finally { setSaving(false); }
  };

  if (loading) return <LoadingState label="Loading your profile" />;
  return <div>
    <PageHeader eyebrow="Candidate profile" title="Tell your professional story" description="Keep your experience and career goals current so interviews can be tailored to you." />
    <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="workspace-card card-rise self-start text-center"><span className="mx-auto grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-700 text-2xl font-semibold text-white shadow-xl shadow-violet-200">{identity.name.slice(0,1).toUpperCase()}</span><h2 className="mt-4 font-semibold text-slate-950">{identity.name}</h2><p className="mt-1 text-sm text-slate-500">{identity.email}</p><div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Profile strength</p><div className="mt-3 h-2 rounded-full bg-slate-200"><div className="progress-shimmer h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${Math.min(100, 35 + Object.values(profile).filter(Boolean).length * 6)}%` }} /></div></div></aside>
      <form className="workspace-card card-rise space-y-6" onSubmit={submit}>
        {error && <Notice>{error}</Notice>}{notice && <Notice tone="success">{notice}</Notice>}
        <div className="grid gap-5 sm:grid-cols-2">
          <label><span className="workspace-label">Professional headline</span><input className="workspace-input" value={profile.headline ?? ""} onChange={(e) => update("headline", e.target.value)} placeholder="Frontend engineer focused on accessible products" /></label>
          <label><span className="workspace-label">Location</span><input className="workspace-input" value={profile.location ?? ""} onChange={(e) => update("location", e.target.value)} placeholder="Bengaluru, India" /></label>
          <label><span className="workspace-label">Current role</span><input className="workspace-input" value={profile.currentRole ?? ""} onChange={(e) => update("currentRole", e.target.value)} /></label>
          <label><span className="workspace-label">Target role</span><input className="workspace-input" value={profile.targetRole ?? ""} onChange={(e) => update("targetRole", e.target.value)} /></label>
          <label><span className="workspace-label">Years of experience</span><input className="workspace-input" type="number" min="0" max="60" value={profile.experienceYears} onChange={(e) => update("experienceYears", Number(e.target.value))} /></label>
          <label><span className="workspace-label">Experience level</span><select className="workspace-select" value={profile.experienceLevel ?? ""} onChange={(e) => update("experienceLevel", e.target.value || null)}><option value="">Select level</option>{["FRESHER","JUNIOR","MID_LEVEL","SENIOR","LEAD"].map((level) => <option key={level}>{level}</option>)}</select></label>
        </div>
        <label><span className="workspace-label">Bio</span><textarea className="workspace-textarea" value={profile.bio ?? ""} onChange={(e) => update("bio", e.target.value)} placeholder="Share what you build, how you work, and what you want to do next." /></label>
        <div className="grid gap-5 sm:grid-cols-3">{(["linkedinUrl","githubUrl","portfolioUrl"] as const).map((field) => <label key={field}><span className="workspace-label">{field === "linkedinUrl" ? "LinkedIn" : field === "githubUrl" ? "GitHub" : "Portfolio"}</span><input className="workspace-input" type="url" value={profile[field] ?? ""} onChange={(e) => update(field, e.target.value)} placeholder="https://" /></label>)}</div>
        <div className="flex justify-end"><button className="solid-button min-w-36" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></div>
      </form>
    </div>
  </div>;
}
