"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoanForm } from "@/components/loan-form";

export default function EditLoanPage() {
  const params = useParams<{ id: string }>();
  if (!params) return <AppShell title="Edit loan"><div className="loading-panel">Loading loan details…</div></AppShell>;
  return <AppShell title="Edit loan"><LoanForm loanId={params.id} /></AppShell>;
}
