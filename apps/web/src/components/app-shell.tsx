"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { BrandMark } from "./auth/brand-mark";
import { ProtectedPage } from "./auth/protected-page";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "grid" },
  { href: "/settings/security", label: "Security", icon: "shield" },
] as const;

function NavIcon({ name }: { name: "grid" | "shield" }) {
  return name === "grid" ? (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>
  ) : (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 4.5 6v5.2c0 4.6 3.1 8.8 7.5 9.8 4.4-1 7.5-5.2 7.5-9.8V6L12 3Z"/><path d="m9.2 12 1.8 1.8 4-4"/></svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-[#f5f6fa] lg:grid lg:grid-cols-[250px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white px-5 py-6 lg:flex lg:flex-col">
          <BrandMark />
          <nav className="mt-10 space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={`nav-link ${pathname === item.href ? "nav-link-active" : ""}`}>
                <NavIcon name={item.icon} /> {item.label}
              </Link>
            ))}
          </nav>
          <button className="nav-link mt-auto" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sign out
          </button>
        </aside>
        <div>
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
            <div className="lg:hidden"><BrandMark compact /></div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.role.replaceAll("_", " ").toLowerCase()}</p>
              </div>
              <span className="grid size-10 place-items-center overflow-hidden rounded-full bg-violet-100 font-semibold text-violet-700">
                {user?.avatarUrl ? <Image src={user.avatarUrl} alt="" width={40} height={40} className="size-full object-cover" /> : user?.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
          </header>
          <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            {navItems.map((item) => <Link key={item.href} href={item.href} className={`mobile-nav-link ${pathname === item.href ? "mobile-nav-link-active" : ""}`}>{item.label}</Link>)}
            <button className="mobile-nav-link ml-auto" onClick={handleLogout}>Sign out</button>
          </nav>
          <main className="mx-auto max-w-6xl p-5 sm:p-8 lg:p-10">{children}</main>
        </div>
      </div>
    </ProtectedPage>
  );
}
