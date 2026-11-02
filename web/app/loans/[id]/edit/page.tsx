"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoanForm } from "@/components/loan-form";

export default function EditLoanPage() {
  const params = useParams<{ id: string }>();
  return <AppShell title="Edit loan"><LoanForm loanId={params.id} /></AppShell>;
}
