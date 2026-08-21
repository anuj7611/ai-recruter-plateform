"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { BrandMark } from "./auth/brand-mark";
import { PageLoader, ProtectedPage } from "./auth/protected-page";
import { getRoleHome, getRoleLabel } from "@/lib/auth/role-routing";
import type { UserRole } from "@/lib/auth/types";

type NavIconName = "grid" | "shield" | "briefcase" | "building" | "users" | "admin";

const getNavItems = (role: UserRole) => {
  const security = { href: "/settings/security", label: "Security", icon: "shield" as const };
  switch (role) {
    case "RECRUITER":
      return [{ href: "/recruiter", label: "Recruiter workspace", icon: "briefcase" as const }, security];
    case "ORGANIZATION_ADMIN":
      return [{ href: "/organization", label: "Organization", icon: "building" as const }, { href: "/access/invitations", label: "Team access", icon: "users" as const }, security];
    case "SUPER_ADMIN":
      return [{ href: "/admin", label: "Platform admin", icon: "admin" as const }, { href: "/access/invitations", label: "Access control", icon: "users" as const }, security];
    default:
      return [{ href: "/dashboard", label: "Overview", icon: "grid" as const }, security];
  }
};

function NavIcon({ name }: { name: NavIconName }) {
  const paths: Record<NavIconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    shield: <><path d="M12 3 4.5 6v5.2c0 4.6 3.1 8.8 7.5 9.8 4.4-1 7.5-5.2 7.5-9.8V6L12 3Z"/><path d="m9.2 12 1.8 1.8 4-4"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2"/></>,
    building: <><path d="M4 21V5l8-3 8 3v16M9 21v-4h6v4M8 7h1M15 7h1M8 11h1M15 11h1"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
    admin: <><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0M18 4l1 1 2-2"/></>,
  };
  return <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const isRouteAllowed = (pathname: string, role: UserRole) => {
  if (pathname.startsWith("/settings/security")) return true;
  if (pathname.startsWith("/access/invitations")) return role === "ORGANIZATION_ADMIN" || role === "SUPER_ADMIN";
  if (pathname.startsWith("/recruiter")) return role === "RECRUITER";
  if (pathname.startsWith("/organization")) return role === "ORGANIZATION_ADMIN";
  if (pathname.startsWith("/admin")) return role === "SUPER_ADMIN";
  if (pathname.startsWith("/dashboard")) return role === "CANDIDATE";
  return true;
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const navItems = user ? getNavItems(user.role) : [];
  const routeAllowed = user ? isRouteAllowed(pathname, user.role) : true;

  useEffect(() => {
    if (user && !routeAllowed) router.replace(getRoleHome(user.role));
  }, [routeAllowed, router, user]);

  if (user && !routeAllowed) {
    return <PageLoader label="Opening your role workspace" />;
  }

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
                <p className="text-xs capitalize text-slate-500">{user ? getRoleLabel(user.role) : ""}</p>
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
