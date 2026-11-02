"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { api, ApiError } from "@/lib/api";
import type { Loan } from "@/lib/types";
import { money, StatusBadge } from "@/components/ui";

type DashboardData = {
  summary: {
    totalBorrowed: number;
    outstanding: number;
    monthlyEmi: number;
    interestPaid: number;
    loanCount: number;
    activeCount: number;
  };
  loans: Loan[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardData>("/dashboard")
      .then(setData)
      .catch((reason: unknown) =>
        setError(reason instanceof ApiError ? reason.message : "Could not load dashboard."),
      );
  }, []);

  return (
    <AppShell title="Overview">
      {error && <div className="notice notice-bad">{error}</div>}
      <section className="hero">
        <div>
          <span className="eyebrow">FINANCIAL SNAPSHOT</span>
          <h2>Keep every loan under control.</h2>
          <p>Track balances, EMIs and interest from one clear workspace.</p>
          <Link className="button button-light" href="/loans/new">Add a loan <span>→</span></Link>
        </div>
        <div className="hero-art" aria-hidden="true">₹<span>↗</span></div>
      </section>
      {!data ? <div className="loading-panel">Loading your loan summary…</div> : (
        <>
          <section className="stats-grid">
            <article className="stat-card"><span className="stat-icon blue">▤</span><div><span className="muted">Total borrowed</span><strong>{money(data.summary.totalBorrowed)}</strong><small>{data.summary.loanCount} accounts</small></div></article>
            <article className="stat-card"><span className="stat-icon orange">◷</span><div><span className="muted">Outstanding principal</span><strong>{money(data.summary.outstanding)}</strong><small>{data.summary.activeCount} active loans</small></div></article>
            <article className="stat-card"><span className="stat-icon green">▣</span><div><span className="muted">Monthly EMI load</span><strong>{money(data.summary.monthlyEmi)}</strong><small>Current commitments</small></div></article>
            <article className="stat-card"><span className="stat-icon purple">%</span><div><span className="muted">Interest paid</span><strong>{money(data.summary.interestPaid)}</strong><small>Lifetime interest</small></div></article>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div><h2>Loan accounts</h2><p>Current repayment status at a glance</p></div>
              <Link className="text-link" href="/loans">View all →</Link>
            </div>
            {data.loans.length === 0 ? (
              <div className="empty-state"><span>▤</span><h3>No loan accounts yet</h3><p>Add your first loan to start tracking repayments.</p><Link className="button" href="/loans/new">Add first loan</Link></div>
            ) : (
              <div className="loan-list">
                {data.loans.map((loan) => {
                  const progress = loan.principal ? Math.min(100, (loan.principalPaid / loan.principal) * 100) : 0;
                  return (
                    <Link className="loan-row" key={loan._id} href={`/loans/${loan._id}`}>
                      <span className="loan-avatar">{(loan.nickname || loan.loanName).slice(0, 1).toUpperCase()}</span>
                      <span className="loan-main">
                        <strong>{loan.nickname || loan.loanName}</strong>
                        <small>{loan.loanName} · EMI {money(loan.emiAmount)} · {loan.paymentsCount}/{loan.tenureMonths} paid</small>
                        <span className="progress-track"><span style={{ width: `${progress}%` }} /></span>
                      </span>
                      <span className="loan-balance"><small>Outstanding</small><strong>{money(loan.outstanding)}</strong><StatusBadge status={loan.status} /></span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
