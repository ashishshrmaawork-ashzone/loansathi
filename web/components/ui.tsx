import Link from "next/link";

export function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Notice({
  children,
  bad = false,
}: {
  children: React.ReactNode;
  bad?: boolean;
}) {
  return <div className={bad ? "notice notice-bad" : "notice"}>{children}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

export function LoanLink({ id, children }: { id: string; children: React.ReactNode }) {
  return <Link href={`/loans/${id}`}>{children}</Link>;
}
