import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    loanName: { type: String, required: true, trim: true },
    nickname: { type: String, trim: true, default: "" },
    lenderName: { type: String, required: true, trim: true },
    accountNumber: { type: String, trim: true, default: "" },
    loanType: { type: String, required: true, trim: true },
    principal: { type: Number, required: true, min: 0 },
    annualRate: { type: Number, required: true, min: 0 },
    tenureMonths: { type: Number, required: true, min: 1 },
    emiAmount: { type: Number, required: true, min: 0 },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    paymentDay: { type: Number, required: true, min: 1, max: 31 },
    status: {
      type: String,
      enum: ["active", "paused", "closed"],
      default: "active",
    },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

const paymentSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
      required: true,
      index: true,
    },
    paymentDate: { type: String, required: true },
    paymentMonth: { type: String, required: true },
    emiNumber: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    principalPaid: { type: Number, required: true, min: 0 },
    interestPaid: { type: Number, required: true, min: 0 },
    extraCharge: { type: Number, required: true, min: 0, default: 0 },
    paymentMode: { type: String, required: true },
    referenceNumber: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
paymentSchema.index({ loanId: 1, paymentMonth: 1 }, { unique: true });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true },
);

const settingsSchema = new mongoose.Schema({
  sessionIdleMinutes: { type: Number, default: 30, min: 5, max: 240 },
  sessionMaxHours: { type: Number, default: 8, min: 1, max: 72 },
});

export const Loan = mongoose.model("Loan", loanSchema);
export const Payment = mongoose.model("Payment", paymentSchema);
export const User = mongoose.model("User", userSchema);
export const Settings = mongoose.model("Settings", settingsSchema);
