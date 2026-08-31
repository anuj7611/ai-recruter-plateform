"use client";

import type { ReactNode } from "react";

export const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not scheduled";

export const titleCase = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-enter flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.12em] text-violet-600">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function StatusPill({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const tone =
    ["READY", "ACTIVE", "SENT", "COMPLETED", "ACCEPTED", "ANALYZED", "QUALIFIED", "VERIFIED", "HEALTHY"].includes(normalized)
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
      : ["FAILED", "EXPIRED", "CANCELLED", "REVOKED", "SUSPENDED", "DEACTIVATED", "ATTENTION"].includes(normalized)
        ? "bg-rose-50 text-rose-700 ring-rose-600/10"
        : ["IN_PROGRESS", "PROCESSING", "PARSING", "EMBEDDING"].includes(normalized)
          ? "bg-sky-50 text-sky-700 ring-sky-600/10"
          : "bg-amber-50 text-amber-700 ring-amber-600/10";

  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${tone}`}>{titleCase(value)}</span>;
}

export function LoadingState({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
      <div className="text-center">
        <span className="mx-auto block size-9 animate-spin rounded-full border-[3px] border-violet-100 border-t-violet-600" />
        <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state grid min-h-52 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center backdrop-blur">
      <div className="max-w-sm">
        <span className="float-gentle mx-auto grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/></svg>
        </span>
        <h2 className="mt-4 text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section className={`modal-panel my-5 w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-2xl border border-white/60 bg-white p-5 shadow-2xl sm:p-6`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-slate-950">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}</div>
          <button type="button" className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 hover:rotate-90 hover:bg-slate-200 hover:text-slate-900" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}

export function MetricCard({ label, value, detail, accent = "violet" }: { label: string; value: string | number; detail: string; accent?: "violet" | "emerald" | "sky" | "amber" }) {
  const colors = { violet: "from-violet-500 to-indigo-600", emerald: "from-emerald-400 to-teal-600", sky: "from-sky-400 to-blue-600", amber: "from-amber-400 to-orange-500" };
  return <article className="workspace-card card-rise relative overflow-hidden"><span className={`absolute -right-7 -top-7 size-24 rounded-full bg-gradient-to-br ${colors[accent]} opacity-15 blur-xl ambient-orb`} /><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>;
}

export function Notice({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  const styles = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "info" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-rose-200 bg-rose-50 text-rose-800";
  return <div className={`rounded-xl border px-3.5 py-2.5 text-xs shadow-sm ${styles}`}>{children}</div>;
}
