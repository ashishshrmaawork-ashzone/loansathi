"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ApiError } from "@/lib/api";

const navItems = [
  { href: "/", label: "Overview", icon: "▦" },
  { href: "/loans", label: "Loan accounts", icon: "▤" },
  { href: "/loans/new", label: "Add new loan", icon: "+" },
];

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="loading-screen">Loading your workspace…</div>;
  }

  async function handleLogout() {
    setLogoutError("");
    try {
      await logout();
    } catch (reason) {
      setLogoutError(
        reason instanceof ApiError ? reason.message : "Could not sign out. Please try again.",
      );
    }
  }

  return (
    <div className="app-layout">
      {mobileOpen && <button className="backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Link className="brand" href="/">
            <span className="brand-mark">₹</span>
            <span>Loan <strong>Sathi</strong></span>
          </Link>
          <button className="mobile-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}>×</button>
        </div>
        <nav className="side-nav">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={active ? "nav-link active" : "nav-link"}
              >
                <span className="nav-icon">{item.icon}</span>{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="eyebrow">YOUR FINANCES</span>
            <p>Every repayment, in one clear view.</p>
          </div>
          <Link className={pathname === "/security" ? "nav-link active" : "nav-link"} href="/security">
            <span className="nav-icon">◇</span>Security
          </Link>
          <button className="nav-link signout" onClick={() => void handleLogout()}>
            <span className="nav-icon">↪</span>Sign out
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}>☰</button>
          <div>
            <h1>{title}</h1>
            <p>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <div className="topbar-user">
            <span className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <span>{user.name}</span>
          </div>
        </header>
        <div className="page-content">
          {logoutError && <div className="notice notice-bad">{logoutError}</div>}
          {children}
        </div>
      </main>
    </div>
  );
}
