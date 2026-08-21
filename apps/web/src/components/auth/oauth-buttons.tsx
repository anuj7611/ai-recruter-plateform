import { getOAuthUrl } from "@/lib/auth/api";

export function OAuthButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <a className="oauth-button" href={getOAuthUrl("google")}>
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 3-4.4 3-7.5Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.8V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 3.1 7.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z"/></svg>
        Google
      </a>
      <a className="oauth-button" href={getOAuthUrl("github")}>
        <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true"><path d="M12 .8A11.4 11.4 0 0 0 8.4 23c.6.1.8-.3.8-.6v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.6-1.4-5.6-6a4.7 4.7 0 0 1 1.2-3.2c-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2a4.7 4.7 0 0 1 1.2 3.2c0 4.5-2.9 5.6-5.6 5.9.4.4.8 1.1.8 2.3v3.3c0 .3.2.7.8.6A11.4 11.4 0 0 0 12 .8Z"/></svg>
        GitHub
      </a>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
      <span className="h-px flex-1 bg-slate-200" /> or continue with email <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
