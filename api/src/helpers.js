export function calculateEmi(principal, annualRate, tenureMonths) {
  if (tenureMonths < 1) return 0;
  const monthlyRate = annualRate / 1200;
  if (monthlyRate === 0) return principal / tenureMonths;
  const factor = (1 + monthlyRate) ** tenureMonths;
  return (principal * monthlyRate * factor) / (factor - 1);
}

export function calculateEndDate(startDate, tenureMonths) {
  const [year, month, day] = startDate.split("-").map(Number);
  const targetMonth = month - 1 + tenureMonths - 1;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const endDay = Math.min(
    day,
    new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate(),
  );
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
}

export function currentMonthEnd() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}

export function paymentSummary(payments) {
  const emiNumbers = new Set();
  return payments.reduce(
    (summary, payment) => {
      emiNumbers.add(payment.emiNumber);
      return {
        totalPaid: summary.totalPaid + payment.amount,
        principalPaid: summary.principalPaid + payment.principalPaid,
        interestPaid: summary.interestPaid + payment.interestPaid,
        chargesPaid: summary.chargesPaid + payment.extraCharge,
        paymentsCount: emiNumbers.size,
        lastPayment:
          !summary.lastPayment || payment.paymentDate > summary.lastPayment
            ? payment.paymentDate
            : summary.lastPayment,
        lastEmiNumber: Math.max(summary.lastEmiNumber, payment.emiNumber),
      };
    },
    {
      totalPaid: 0,
      principalPaid: 0,
      interestPaid: 0,
      chargesPaid: 0,
      paymentsCount: 0,
      lastPayment: null,
      lastEmiNumber: 0,
    },
  );
}
