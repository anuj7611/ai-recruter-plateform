import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="Hirely home">
      <span className="grid size-10 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
          <path d="M7 4v16M17 4v16M7 12h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className="text-xl font-bold tracking-tight text-slate-950">Hirely</span>
      )}
    </Link>
  );
}
