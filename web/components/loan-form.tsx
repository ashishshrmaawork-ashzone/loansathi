"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, jsonBody } from "@/lib/api";
import type { Loan } from "@/lib/types";
import { money } from "@/components/ui";

type LoanFormValue = {
  loanName: string;
  nickname: string;
  lenderName: string;
  accountNumber: string;
  loanType: string;
  principal: string;
  annualRate: string;
  tenureMonths: string;
  emiAmount: string;
  startDate: string;
  paymentDay: string;
  status: Loan["status"];
  notes: string;
};

const emptyForm: LoanFormValue = {
  loanName: "",
  nickname: "",
  lenderName: "",
  accountNumber: "",
  loanType: "Personal Loan",
  principal: "",
  annualRate: "",
  tenureMonths: "",
  emiAmount: "",
  startDate: new Date().toISOString().slice(0, 10),
  paymentDay: "1",
  status: "active",
  notes: "",
};

export function LoanForm({ loanId }: { loanId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<LoanFormValue>(emptyForm);
  const [loading, setLoading] = useState(Boolean(loanId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loanId) return;
    api<{ loan: Loan; payments: unknown[] }>(`/loans/${loanId}`)
      .then(({ loan }) => setForm({
        loanName: loan.loanName,
        nickname: loan.nickname,
        lenderName: loan.lenderName,
        accountNumber: loan.accountNumber,
        loanType: loan.loanType,
        principal: String(loan.principal),
        annualRate: String(loan.annualRate),
        tenureMonths: String(loan.tenureMonths),
        emiAmount: String(loan.emiAmount),
        startDate: loan.startDate.slice(0, 10),
        paymentDay: String(loan.paymentDay),
        status: loan.status,
        notes: loan.notes,
      }))
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : "Could not load loan details."))
      .finally(() => setLoading(false));
  }, [loanId]);

  function update<K extends keyof LoanFormValue>(key: K, value: LoanFormValue[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const principal = Number(form.principal) || 0;
  const rate = (Number(form.annualRate) || 0) / 1200;
  const months = Number(form.tenureMonths) || 0;
  const calculatedEmi = !months ? 0 : rate ? (principal * rate * (1 + rate) ** months) / ((1 + rate) ** months - 1) : principal / months;
  const displayedEmi = Number(form.emiAmount) || calculatedEmi;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const body = {
      ...form,
      principal: Number(form.principal),
      annualRate: Number(form.annualRate),
      tenureMonths: Number(form.tenureMonths),
      emiAmount: Number(form.emiAmount) || 0,
      paymentDay: Number(form.paymentDay),
    };
    try {
      const result = await api<{ loan: Loan }>(loanId ? `/loans/${loanId}` : "/loans", {
        method: loanId ? "PUT" : "POST",
        body: jsonBody(body),
      });
      router.push(`/loans/${result.loan._id}`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not save this loan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading-panel">Loading loan details…</div>;

  return (
    <form className="panel loan-form" onSubmit={submit}>
      {error && <div className="notice notice-bad">{error}</div>}
      <div className="form-section-title"><span className="stat-icon blue">▤</span><div><h2>Loan information</h2><p>Account and repayment details</p></div></div>
      <div className="form-grid">
        <label>Loan name *<input required maxLength={120} value={form.loanName} onChange={(event) => update("loanName", event.target.value)} placeholder="e.g. Home loan" /></label>
        <label>Loan nickname<input maxLength={80} value={form.nickname} onChange={(event) => update("nickname", event.target.value)} placeholder="Optional display name" /></label>
        <label>Bank / lender *<input required maxLength={120} value={form.lenderName} onChange={(event) => update("lenderName", event.target.value)} /></label>
        <label>Account number<input maxLength={80} value={form.accountNumber} onChange={(event) => update("accountNumber", event.target.value)} /></label>
        <label>Loan type *<select value={form.loanType} onChange={(event) => update("loanType", event.target.value)}>{["Personal Loan", "Home Loan", "Car Loan", "Education Loan", "Business Loan", "Gold Loan", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Loan amount (₹) *<input type="number" min="0.01" step="0.01" required value={form.principal} onChange={(event) => update("principal", event.target.value)} /></label>
        <label>Interest rate (% p.a.) *<input type="number" min="0" max="100" step="0.01" required value={form.annualRate} onChange={(event) => update("annualRate", event.target.value)} /></label>
        <label>Tenure (months) *<input type="number" min="1" max="1200" required value={form.tenureMonths} onChange={(event) => update("tenureMonths", event.target.value)} /></label>
        <label>EMI start date *<input type="date" required value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></label>
        <label>EMI payment day *<input type="number" min="1" max="31" required value={form.paymentDay} onChange={(event) => update("paymentDay", event.target.value)} /></label>
        <label>EMI amount (optional)<input type="number" min="0" step="0.01" value={form.emiAmount} onChange={(event) => update("emiAmount", event.target.value)} placeholder="Auto-calculated" /></label>
        <label>Status<select value={form.status} onChange={(event) => update("status", event.target.value as Loan["status"])}><option value="active">Active</option><option value="paused">Paused</option><option value="closed">Closed</option></select></label>
        <label className="full-width">Notes<textarea rows={3} maxLength={2000} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label>
      </div>
      <div className="estimate-grid">
        <div><small>Estimated EMI</small><strong>{money(displayedEmi)}</strong></div>
        <div><small>Estimated interest</small><strong>{money(Math.max(0, displayedEmi * months - principal))}</strong></div>
        <div><small>Total payable</small><strong>{money(displayedEmi * months)}</strong></div>
      </div>
      <div className="form-actions"><button className="button" disabled={submitting}>{submitting ? "Saving…" : "Save loan account"}</button><button type="button" className="button button-secondary" onClick={() => router.back()}>Cancel</button></div>
    </form>
  );
}
