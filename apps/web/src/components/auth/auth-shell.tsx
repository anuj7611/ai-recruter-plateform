import type { ReactNode } from "react";
import { BrandMark } from "./brand-mark";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="Product introduction">
        <div className="auth-grid" />
        <div className="relative z-10 flex h-full flex-col">
          <BrandMark />
          <div className="my-auto max-w-xl py-16">
            <span className="auth-kicker">AI-powered hiring workspace</span>
            <h2 className="mt-7 text-4xl font-semibold leading-tight tracking-[-0.04em] text-white lg:text-6xl">
              Interviews that reveal more than a résumé.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 lg:text-lg">
              Practice with confidence, hire with evidence, and keep every conversation in one secure place.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="flex -space-x-2" aria-hidden="true">
              <span className="avatar-dot bg-amber-200" />
              <span className="avatar-dot bg-sky-200" />
              <span className="avatar-dot bg-emerald-200" />
            </span>
            Trusted by focused teams and ambitious candidates
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><BrandMark /></div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-slate-500">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
