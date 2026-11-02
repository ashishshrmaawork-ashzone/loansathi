import dotenv from "dotenv";
import { DatabaseSync } from "node:sqlite";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Loan, Payment } from "../src/models.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env.local", import.meta.url)) });
dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) throw new Error("Set MONGO_URI before running the migration.");

const sourcePath = process.env.SQLITE_PATH
  ? resolve(process.env.SQLITE_PATH)
  : fileURLToPath(new URL("../../data/loans.sqlite", import.meta.url));
const source = new DatabaseSync(sourcePath, { readOnly: true });

try {
  await mongoose.connect(mongoUri);
  const [loanCount, paymentCount] = await Promise.all([
    Loan.countDocuments(),
    Payment.countDocuments(),
  ]);
  if (loanCount || paymentCount) {
    throw new Error(
      `Migration stopped: MongoDB already contains ${loanCount} loan(s) and ${paymentCount} payment(s).`,
    );
  }

  const oldLoans = source.prepare("SELECT * FROM loans ORDER BY id").all();
  const oldPayments = source.prepare("SELECT * FROM payments ORDER BY id").all();
  const missingLoanReference = oldPayments.find(
    (row) => !oldLoans.some((loan) => loan.id === row.loan_id),
  );
  if (missingLoanReference) {
    throw new Error(`Payment ${missingLoanReference.id} refers to a loan that is missing from SQLite.`);
  }
  const loans = oldLoans.map((row) => ({
    legacyId: row.id,
    loanName: row.loan_name,
    nickname: row.nickname ?? "",
    lenderName: row.lender_name,
    accountNumber: row.account_number ?? "",
    loanType: row.loan_type,
    principal: row.principal,
    annualRate: row.annual_rate,
    tenureMonths: row.tenure_months,
    emiAmount: row.emi_amount,
    startDate: row.start_date,
    endDate: row.end_date,
    paymentDay: row.payment_day,
    status: row.status,
    notes: row.notes ?? "",
  }));
  const insertedLoans = oldLoans.length ? await Loan.insertMany(loans, { ordered: true }) : [];
  try {
    const loanIds = new Map(oldLoans.map((row, index) => [row.id, insertedLoans[index]._id]));
    const payments = oldPayments.map((row) => ({
      legacyId: row.id,
      loanId: loanIds.get(row.loan_id),
      paymentDate: row.payment_date,
      paymentMonth: row.payment_date.slice(0, 7),
      emiNumber: row.emi_number,
      amount: row.amount,
      principalPaid: row.principal_paid,
      interestPaid: row.interest_paid,
      extraCharge: row.extra_charge,
      paymentMode: row.payment_mode,
      referenceNumber: row.reference_number ?? "",
      notes: row.notes ?? "",
    }));
    if (payments.length) await Payment.insertMany(payments, { ordered: true });
    console.info(`Imported ${insertedLoans.length} loan(s) and ${payments.length} payment(s).`);
  } catch (error) {
    const insertedIds = insertedLoans.map((loan) => loan._id);
    if (insertedIds.length) {
      await Payment.deleteMany({ loanId: { $in: insertedIds } });
      await Loan.deleteMany({ _id: { $in: insertedIds } });
    }
    throw error;
  }
} finally {
  source.close();
  await mongoose.disconnect();
}
