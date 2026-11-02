"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge, money } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Loan } from "@/lib/types";

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ loans: Loan[] }>("/loans")
      .then((result) => setLoans(result.loans))
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : "Could not load loan accounts."));
  }, []);

  const filtered = useMemo(
    () => loans.filter((loan) => {
      const matchesSearch = `${loan.loanName} ${loan.nickname} ${loan.lenderName} ${loan.accountNumber}`.toLowerCase().includes(search.toLowerCase());
      return matchesSearch && (status === "all" || loan.status === status);
    }),
    [loans, search, status],
  );

  return (
    <AppShell title="Loan accounts">
      {error && <div className="notice notice-bad">{error}</div>}
      <section className="panel">
        <div className="panel-heading">
          <div><h2>All accounts</h2><p>Search and filter your loan portfolio</p></div>
          <Link className="button" href="/loans/new">＋ Add loan</Link>
        </div>
        <div className="table-filters">
          <input aria-label="Search loans" placeholder="Search loans or lenders…" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="closed">Closed</option>
          </select>
        </div>
        <div className="table-scroll">
          <table><thead><tr><th>Loan</th><th>Original amount</th><th>EMI / Rate</th><th>Principal paid</th><th>Outstanding</th><th>Status</th><th /></tr></thead>
            <tbody>{filtered.map((loan) => <tr key={loan._id}>
              <td><Link className="table-loan-name" href={`/loans/${loan._id}`}>{loan.nickname || loan.loanName}</Link><small>{loan.lenderName} · {loan.loanType}</small></td>
              <td>{money(loan.principal)}</td><td>{money(loan.emiAmount)}<small>{loan.annualRate}% p.a.</small></td>
              <td>{money(loan.principalPaid)}<small>{loan.paymentsCount} payment(s)</small></td>
              <td><strong>{money(loan.outstanding)}</strong></td><td><StatusBadge status={loan.status} /></td>
              <td><Link className="row-action" href={`/loans/${loan._id}`} aria-label={`View ${loan.loanName}`}>→</Link></td>
            </tr>)}</tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state compact"><h3>No matching loans</h3><p>Try changing your search or status filter.</p></div>}
        </div>
      </section>
    </AppShell>
  );
}
