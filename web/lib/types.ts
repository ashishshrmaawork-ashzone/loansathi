export type User = { name: string; username: string };

export type Loan = {
  _id: string;
  loanName: string;
  nickname: string;
  lenderName: string;
  accountNumber: string;
  loanType: string;
  principal: number;
  annualRate: number;
  tenureMonths: number;
  emiAmount: number;
  startDate: string;
  endDate: string;
  paymentDay: number;
  status: "active" | "paused" | "closed";
  notes: string;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
  paymentsCount: number;
  lastPayment: string | null;
  lastEmiNumber: number;
  outstanding: number;
};

export type Payment = {
  _id: string;
  paymentDate: string;
  emiNumber: number;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  extraCharge: number;
  paymentMode: string;
  referenceNumber: string;
  notes: string;
};
