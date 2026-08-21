"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  endAdornment?: ReactNode;
}

export function Field({ label, hint, endAdornment, id, ...props }: FieldProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
        {label}
        {endAdornment}
      </span>
      <input id={inputId} className="form-input" {...props} />
      {hint && <span className="mt-2 block text-xs leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}

export function PasswordField(props: Omit<FieldProps, "type" | "endAdornment">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Field {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="absolute right-3 top-[2.55rem] grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.3A10.6 10.6 0 0 1 12 4c5.5 0 9 6 9 6a15 15 0 0 1-2.1 2.8M6.2 6.2C4.2 7.6 3 10 3 10s3.5 6 9 6c1.1 0 2.1-.2 3-.5" strokeLinecap="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
        )}
      </button>
    </div>
  );
}

export function StatusMessage({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success" | "info";
}) {
  return <div className={`status-message status-${tone}`}>{children}</div>;
}

export function SubmitButton({
  children,
  loading,
}: {
  children: ReactNode;
  loading?: boolean;
}) {
  return (
    <button type="submit" className="primary-button" disabled={loading}>
      {loading && <span className="button-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
