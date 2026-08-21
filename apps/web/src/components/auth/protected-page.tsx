"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";

export function PageLoader({ label = "Preparing your workspace" }: { label?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50">
      <div className="text-center">
        <span className="mx-auto block size-9 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
        <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      </div>
    </main>
  );
}

export function ProtectedPage({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [router, status]);

  if (status !== "authenticated") return <PageLoader />;
  return children;
}
