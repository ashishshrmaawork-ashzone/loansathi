import test from "node:test";
import assert from "node:assert/strict";
import { calculateEmi, calculateEndDate, paymentSummary } from "../src/helpers.js";

test("calculates fixed-rate EMIs and zero-interest installments", () => {
  assert.equal(calculateEmi(120_000, 0, 12), 10_000);
  assert.ok(Math.abs(calculateEmi(100_000, 12, 12) - 8_884.8789) < 0.01);
});

test("calculates a tenure end date without overflowing short months", () => {
  assert.equal(calculateEndDate("2024-01-31", 2), "2024-02-29");
  assert.equal(calculateEndDate("2025-03-15", 1), "2025-03-15");
});

test("summarizes payment totals and distinct EMI numbers", () => {
  const summary = paymentSummary([
    { emiNumber: 1, paymentDate: "2025-01-10", amount: 110, principalPaid: 90, interestPaid: 20, extraCharge: 0 },
    { emiNumber: 1, paymentDate: "2025-01-20", amount: 55, principalPaid: 50, interestPaid: 5, extraCharge: 0 },
    { emiNumber: 2, paymentDate: "2025-02-10", amount: 120, principalPaid: 100, interestPaid: 18, extraCharge: 2 },
  ]);
  assert.equal(summary.totalPaid, 285);
  assert.equal(summary.principalPaid, 240);
  assert.equal(summary.interestPaid, 43);
  assert.equal(summary.chargesPaid, 2);
  assert.equal(summary.paymentsCount, 2);
  assert.equal(summary.lastPayment, "2025-02-10");
  assert.equal(summary.lastEmiNumber, 2);
});
