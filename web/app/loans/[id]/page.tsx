"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { dateLabel, money, StatusBadge } from "@/components/ui";
import { api, ApiError, jsonBody } from "@/lib/api";
import type { Loan, Payment } from "@/lib/types";

type LoanDetail = { loan: Loan; payments: Payment[] };

function getNextDueDate(loan: Loan) {
  if (!loan.lastPayment) return loan.startDate.slice(0, 10);
  const lastDate = new Date(`${loan.lastPayment.slice(0, 10)}T00:00:00`);
  const nextMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1);
  const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  nextMonth.setDate(Math.min(loan.paymentDay, lastDay));
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-${String(nextMonth.getDate()).padStart(2, "0")}`;
}

export default function LoanDetailsPage() {
  const params = useParams<{ id: string }>();
  const loanId = params?.id;
  const router = useRouter();
  const [data, setData] = useState<LoanDetail | null>(null);
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    emiNumber: "1",
    paymentAmount: "",
    extraCharge: "0",
    paymentMode: "Bank Auto-debit",
    referenceNumber: "",
    notes: "",
  });

  const load = useCallback(async () => {
    if (!loanId) return;
    const result = await api<LoanDetail>(`/loans/${loanId}`);
    setData(result);
    setPayment((current) => ({
      ...current,
      paymentDate: getNextDueDate(result.loan),
      emiNumber: String(Math.max(1, result.loan.lastEmiNumber + 1)),
      paymentAmount: String(result.loan.emiAmount),
    }));
  }, [loanId]);

  useEffect(() => {
    if (!loanId) return;
    load().catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : "Could not load loan details."));
  }, [load, loanId]);

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !loanId) return;
    setSaving(true);
    setError("");
    try {
      await api(`/loans/${loanId}/payments`, {
        method: "POST",
        body: jsonBody({
          ...payment,
          emiNumber: Number(payment.emiNumber),
          paymentAmount: Number(payment.paymentAmount),
          extraCharge: Number(payment.extraCharge),
        }),
      });
      setShowPayment(false);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not save payment.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(paymentId: string) {
    if (!loanId) return;
    if (!window.confirm("Delete this payment record?")) return;
    try {
      await api(`/loans/${loanId}/payments/${paymentId}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not delete payment.");
    }
  }

  async function deleteLoan() {
    if (!loanId) return;
    if (!window.confirm("Delete this loan and all its payment history?")) return;
    try {
      await api(`/loans/${loanId}`, { method: "DELETE" });
      router.replace("/loans");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not delete loan.");
    }
  }

  if (!loanId || !data) return <AppShell title="Loan details">{error ? <div className="notice notice-bad">{error}</div> : <div className="loading-panel">Loading loan details…</div>}</AppShell>;
  const { loan, payments } = data;
  const progress = loan.principal ? Math.min(100, (loan.principalPaid / loan.principal) * 100) : 0;

  return (
    <AppShell title="Loan details">
      {error && <div className="notice notice-bad">{error}</div>}
      <section className="detail-heading panel">
        <div><div className="detail-title"><span className="loan-avatar large">{(loan.nickname || loan.loanName).slice(0, 1).toUpperCase()}</span><div><h2>{loan.nickname || loan.loanName}</h2><p>{loan.loanName} · {loan.lenderName} · {loan.loanType}</p></div></div><StatusBadge status={loan.status} /></div>
        <div className="detail-actions"><Link className="button button-secondary" href={`/loans/${loan._id}/edit`}>Edit loan</Link><button className="button" onClick={() => setShowPayment(true)}>＋ Record EMI</button><button className="button button-danger" onClick={() => void deleteLoan()}>Delete</button></div>
      </section>
      <section className="stats-grid detail-stats">
        <article className="stat-card"><div><span className="muted">Original amount</span><strong>{money(loan.principal)}</strong><small>Principal borrowed</small></div></article>
        <article className="stat-card"><div><span className="muted">Outstanding principal</span><strong>{money(loan.outstanding)}</strong><small>{Math.round(progress)}% principal repaid</small></div></article>
        <article className="stat-card"><div><span className="muted">Monthly EMI</span><strong>{money(loan.emiAmount)}</strong><small>{loan.annualRate}% annual interest</small></div></article>
        <article className="stat-card"><div><span className="muted">Interest paid</span><strong>{money(loan.interestPaid)}</strong><small>{payments.length} recorded payment(s)</small></div></article>
      </section>
      <section className="panel loan-facts">
        <div className="panel-heading"><div><h2>Account information</h2><p>Loan terms and repayment status</p></div></div>
        <div className="facts-grid"><div><small>Account number</small><strong>{loan.accountNumber || "—"}</strong></div><div><small>Start date</small><strong>{dateLabel(loan.startDate)}</strong></div><div><small>Expected end date</small><strong>{dateLabel(loan.endDate)}</strong></div><div><small>Tenure</small><strong>{loan.tenureMonths} months</strong></div><div><small>Payment day</small><strong>{loan.paymentDay} of each month</strong></div><div><small>Total paid</small><strong>{money(loan.totalPaid)}</strong></div></div>
        {loan.notes && <p className="loan-notes">{loan.notes}</p>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Payment history</h2><p>Principal and interest split for each payment</p></div><button className="button button-secondary" onClick={() => setShowPayment(true)}>Record payment</button></div>
        <div className="table-scroll"><table><thead><tr><th>Date</th><th>EMI #</th><th>Principal</th><th>Interest</th><th>Charges</th><th>Total</th><th>Mode</th><th /></tr></thead>
          <tbody>{payments.map((item) => <tr key={item._id}><td>{dateLabel(item.paymentDate)}</td><td>{item.emiNumber}</td><td>{money(item.principalPaid)}</td><td>{money(item.interestPaid)}</td><td>{money(item.extraCharge)}</td><td><strong>{money(item.amount)}</strong></td><td>{item.paymentMode}</td><td><button className="row-action danger-text" aria-label="Delete payment" onClick={() => void deletePayment(item._id)}>×</button></td></tr>)}</tbody>
        </table>{payments.length === 0 && <div className="empty-state compact"><h3>No payments recorded</h3><p>Record the first EMI to start tracking progress.</p></div>}</div>
      </section>
      {showPayment && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPayment(false); }}>
        <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="payment-title">
          <button className="modal-close" aria-label="Close" onClick={() => setShowPayment(false)}>×</button>
          <span className="eyebrow">LOAN REPAYMENT</span><h2 id="payment-title">Record payment</h2><p className="muted">Outstanding principal: {money(loan.outstanding)}</p>
          <form onSubmit={submitPayment} className="form-grid">
            <label>Payment date *<input type="date" required value={payment.paymentDate} onChange={(event) => setPayment({ ...payment, paymentDate: event.target.value })} /></label>
            <label>EMI number *<input type="number" min="1" max={loan.tenureMonths} required value={payment.emiNumber} onChange={(event) => setPayment({ ...payment, emiNumber: event.target.value })} /></label>
            <label>EMI amount (₹) *<input type="number" min="0.01" step="0.01" required value={payment.paymentAmount} onChange={(event) => setPayment({ ...payment, paymentAmount: event.target.value })} /></label>
            <label>Extra charges (₹)<input type="number" min="0" step="0.01" value={payment.extraCharge} onChange={(event) => setPayment({ ...payment, extraCharge: event.target.value })} /></label>
            <label>Payment mode<select value={payment.paymentMode} onChange={(event) => setPayment({ ...payment, paymentMode: event.target.value })}>{["Bank Auto-debit", "UPI", "Bank Transfer", "Cash", "Cheque"].map((mode) => <option key={mode}>{mode}</option>)}</select></label>
            <label>Reference number<input value={payment.referenceNumber} onChange={(event) => setPayment({ ...payment, referenceNumber: event.target.value })} /></label>
            <label className="full-width">Notes<textarea rows={2} value={payment.notes} onChange={(event) => setPayment({ ...payment, notes: event.target.value })} /></label>
            {error && <div className="notice notice-bad full-width">{error}</div>}
            <div className="form-actions full-width"><button className="button" disabled={saving}>{saving ? "Saving…" : "Save payment"}</button><button type="button" className="button button-secondary" onClick={() => setShowPayment(false)}>Cancel</button></div>
          </form>
        </section>
      </div>}
    </AppShell>
  );
}
