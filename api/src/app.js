import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import { Loan, Payment, Settings, User } from "./models.js";
import { calculateEmi, calculateEndDate, currentMonthEnd, paymentSummary } from "./helpers.js";
import { errorHandler, requireAuth } from "./middleware.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env.local", import.meta.url)) });
dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const app = express();
const mongoUri = process.env.MONGO_URI;
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
if (!mongoUri) throw new Error("MONGO_URI must be set before starting the API.");
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
}
if (process.env.SESSION_SECRET === "replace-this-with-a-long-random-secret") {
  throw new Error("Replace the example SESSION_SECRET with a unique random value.");
}

app.use(helmet());
app.use(
  cors({
    origin: webOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin && origin !== webOrigin) {
      return res.status(403).json({ message: "Request origin is not allowed." });
    }
  }
  return next();
});
app.use(
  session({
    name: "loan_sathi.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: "sessions",
      ttl: 72 * 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 72 * 60 * 60 * 1000,
    },
  }),
);

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please try again later." },
});

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Use a valid date.");
const loanSchema = z.object({
  loanName: z.string().trim().min(1).max(120),
  nickname: z.string().trim().max(80).default(""),
  lenderName: z.string().trim().min(1).max(120),
  accountNumber: z.string().trim().max(80).default(""),
  loanType: z.string().trim().min(1).max(60),
  principal: z.coerce.number().finite().positive(),
  annualRate: z.coerce.number().finite().min(0).max(100),
  tenureMonths: z.coerce.number().int().min(1).max(1200),
  emiAmount: z.coerce.number().finite().min(0).default(0),
  startDate: dateSchema,
  paymentDay: z.coerce.number().int().min(1).max(31),
  status: z.enum(["active", "paused", "closed"]).default("active"),
  notes: z.string().trim().max(2000).default(""),
});
const paymentSchema = z.object({
  paymentDate: dateSchema,
  emiNumber: z.coerce.number().int().min(1),
  paymentAmount: z.coerce.number().finite().positive(),
  extraCharge: z.coerce.number().finite().min(0).default(0),
  paymentMode: z.string().trim().min(1).max(40),
  referenceNumber: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(1000).default(""),
});
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record identifier.");
const settingsSchema = z.object({
  sessionIdleMinutes: z.coerce.number().int().min(5).max(240),
  sessionMaxHours: z.coerce.number().int().min(1).max(72),
});

function publicLoan(loan, summary) {
  return {
    ...loan,
    ...summary,
    outstanding: Math.max(0, loan.principal - summary.principalPaid),
  };
}

async function getLoanWithSummary(loanId) {
  const loan = await Loan.findById(loanId).lean();
  if (!loan) return null;
  const payments = await Payment.find({ loanId }).sort({ paymentDate: -1 }).lean();
  return { loan: publicLoan(loan, paymentSummary(payments)), payments };
}

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/auth/login", loginLimit, async (req, res) => {
  const input = z
    .object({
      username: z.string().trim().min(1).max(100),
      password: z.string().min(1).max(200),
    })
    .parse(req.body);
  const user = await User.findOne({
    username: input.username,
    isActive: true,
  });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return res.status(401).json({ message: "Username or password is incorrect." });
  }

  await new Promise((resolve, reject) =>
    req.session.regenerate((error) => (error ? reject(error) : resolve())),
  );
  req.session.userId = user.id;
  req.session.startedAt = Date.now();
  req.session.lastActivityAt = Date.now();
  user.lastLogin = new Date();
  await user.save();
  return res.json({ user: { name: user.name, username: user.username } });
});

app.post("/api/auth/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("loan_sathi.sid", { httpOnly: true, sameSite: "lax" });
    return res.status(204).end();
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: { name: req.user.name, username: req.user.username } });
});

app.get("/api/dashboard", requireAuth, async (req, res) => {
  const loans = await Loan.find().sort({ status: 1, createdAt: -1 }).lean();
  const paymentGroups = await Payment.aggregate([
    {
      $group: {
        _id: "$loanId",
        totalPaid: { $sum: "$amount" },
        principalPaid: { $sum: "$principalPaid" },
        interestPaid: { $sum: "$interestPaid" },
        chargesPaid: { $sum: "$extraCharge" },
        emiNumbers: { $addToSet: "$emiNumber" },
        lastPayment: { $max: "$paymentDate" },
        lastEmiNumber: { $max: "$emiNumber" },
      },
    },
  ]);
  const summaries = new Map(
    paymentGroups.map(({ _id, emiNumbers, ...summary }) => [
      String(_id),
      { ...summary, paymentsCount: emiNumbers.length },
    ]),
  );
  const records = loans.map((loan) =>
    publicLoan(
      loan,
      summaries.get(String(loan._id)) ?? paymentSummary([]),
    ),
  );
  const activeLoans = records.filter((loan) => loan.status === "active");

  res.json({
    summary: {
      totalBorrowed: records.reduce((sum, loan) => sum + loan.principal, 0),
      outstanding: records.reduce((sum, loan) => sum + loan.outstanding, 0),
      monthlyEmi: activeLoans.reduce((sum, loan) => sum + loan.emiAmount, 0),
      interestPaid: records.reduce((sum, loan) => sum + loan.interestPaid, 0),
      loanCount: records.length,
      activeCount: activeLoans.length,
    },
    loans: records,
  });
});

app.get("/api/loans", requireAuth, async (req, res) => {
  const loans = await Loan.find().sort({ createdAt: -1 }).lean();
  const summaries = await Payment.aggregate([
    {
      $group: {
        _id: "$loanId",
        totalPaid: { $sum: "$amount" },
        principalPaid: { $sum: "$principalPaid" },
        interestPaid: { $sum: "$interestPaid" },
        chargesPaid: { $sum: "$extraCharge" },
        emiNumbers: { $addToSet: "$emiNumber" },
        lastPayment: { $max: "$paymentDate" },
        lastEmiNumber: { $max: "$emiNumber" },
      },
    },
  ]);
  const summaryMap = new Map(
    summaries.map(({ _id, emiNumbers, ...item }) => [
      String(_id),
      { ...item, paymentsCount: emiNumbers.length },
    ]),
  );
  res.json({
    loans: loans.map((loan) =>
      publicLoan(loan, summaryMap.get(String(loan._id)) ?? paymentSummary([])),
    ),
  });
});

app.get("/api/loans/:id", requireAuth, async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const result = await getLoanWithSummary(id);
  if (!result) return res.status(404).json({ message: "Loan account not found." });
  return res.json({
    loan: result.loan,
    payments: result.payments,
  });
});

app.post("/api/loans", requireAuth, async (req, res) => {
  const input = loanSchema.parse(req.body);
  const loan = await Loan.create({
    ...input,
    emiAmount: input.emiAmount || calculateEmi(input.principal, input.annualRate, input.tenureMonths),
    endDate: calculateEndDate(input.startDate, input.tenureMonths),
  });
  return res.status(201).json({ loan: loan.toObject() });
});

app.put("/api/loans/:id", requireAuth, async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const input = loanSchema.parse(req.body);
  const loan = await Loan.findByIdAndUpdate(
    id,
    {
      ...input,
      emiAmount: input.emiAmount || calculateEmi(input.principal, input.annualRate, input.tenureMonths),
      endDate: calculateEndDate(input.startDate, input.tenureMonths),
    },
    { new: true, runValidators: true },
  ).lean();
  if (!loan) return res.status(404).json({ message: "Loan account not found." });
  return res.json({ loan });
});

app.delete("/api/loans/:id", requireAuth, async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const loan = await Loan.findByIdAndDelete(id);
  if (!loan) return res.status(404).json({ message: "Loan account not found." });
  await Payment.deleteMany({ loanId: id });
  return res.status(204).end();
});

app.post("/api/loans/:id/payments", requireAuth, async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const input = paymentSchema.parse(req.body);
  const loan = await Loan.findById(id).lean();
  if (!loan) return res.status(404).json({ message: "Loan account not found." });
  if (input.paymentDate > currentMonthEnd()) {
    return res.status(400).json({ message: "Payment date cannot be in a future month." });
  }
  if (input.paymentDate < loan.startDate) {
    return res.status(400).json({ message: "Payment date cannot be before the loan start date." });
  }
  if (input.emiNumber > loan.tenureMonths) {
    return res.status(400).json({ message: "EMI number must be within the loan tenure." });
  }
  const paymentMonth = input.paymentDate.slice(0, 7);
  if (await Payment.exists({ loanId: id, paymentMonth })) {
    return res.status(409).json({
      message: `${paymentMonth} already has a payment recorded. Only one payment is allowed per month.`,
    });
  }

  const summary = paymentSummary(await Payment.find({ loanId: id }).lean());
  const balance = Math.max(0, loan.principal - summary.principalPaid);
  const monthlyInterest = balance * (loan.annualRate / 1200);
  const paymentAmount = Math.min(input.paymentAmount, balance + monthlyInterest);
  const interestPaid = Math.min(paymentAmount, monthlyInterest);
  const principalPaid = Math.min(balance, Math.max(0, paymentAmount - interestPaid));
  const payment = await Payment.create({
    loanId: id,
    paymentDate: input.paymentDate,
    paymentMonth,
    emiNumber: input.emiNumber,
    amount: principalPaid + interestPaid + input.extraCharge,
    principalPaid,
    interestPaid,
    extraCharge: input.extraCharge,
    paymentMode: input.paymentMode,
    referenceNumber: input.referenceNumber,
    notes: input.notes,
  });

  if (summary.principalPaid + principalPaid >= loan.principal) {
    await Loan.updateOne({ _id: id }, { status: "closed" });
  }
  return res.status(201).json({ payment });
});

app.delete("/api/loans/:id/payments/:paymentId", requireAuth, async (req, res) => {
  const loanId = objectIdSchema.parse(req.params.id);
  const paymentId = objectIdSchema.parse(req.params.paymentId);
  const payment = await Payment.findOneAndDelete({ _id: paymentId, loanId });
  if (!payment) return res.status(404).json({ message: "Payment record not found." });
  return res.status(204).end();
});

app.get("/api/settings", requireAuth, async (req, res) => {
  const settings = (await Settings.findOne().lean()) ?? {
    sessionIdleMinutes: 30,
    sessionMaxHours: 8,
  };
  res.json({ settings });
});

app.put("/api/settings", requireAuth, async (req, res) => {
  const input = settingsSchema.parse(req.body);
  const settings = await Settings.findOneAndUpdate({}, input, {
    upsert: true,
    new: true,
    runValidators: true,
  }).lean();
  res.json({ settings });
});

app.put("/api/settings/password", requireAuth, async (req, res) => {
  const input = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(200),
      confirmPassword: z.string().min(1),
    })
    .parse(req.body);
  if (input.newPassword !== input.confirmPassword) {
    return res.status(400).json({ message: "New passwords do not match." });
  }
  const user = await User.findById(req.user.id);
  if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    return res.status(400).json({ message: "Current password is incorrect." });
  }
  user.passwordHash = await bcrypt.hash(input.newPassword, 12);
  await user.save();
  return res.json({ message: "Password changed successfully." });
});

app.use(errorHandler);

export async function startServer() {
  await mongoose.connect(mongoUri);
  await Settings.updateOne(
    {},
    { $setOnInsert: { sessionIdleMinutes: 30, sessionMaxHours: 8 } },
    { upsert: true },
  );
  if ((await User.countDocuments()) === 0) {
    const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_NAME) {
      throw new Error(
        "No administrator exists. Set ADMIN_USERNAME, ADMIN_NAME, and ADMIN_PASSWORD to create the first account.",
      );
    }
    if (ADMIN_PASSWORD.length < 12) {
      throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
    }
    if (ADMIN_PASSWORD.startsWith("replace-with-")) {
      throw new Error("Replace the example ADMIN_PASSWORD before creating the first account.");
    }
    await User.create({
      username: ADMIN_USERNAME.trim(),
      name: ADMIN_NAME.trim(),
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
    });
    console.info(`Created initial administrator "${ADMIN_USERNAME.trim()}".`);
  }
  const port = Number(process.env.API_PORT ?? 4001);
  app.listen(port, () => console.info(`Loan Sathi API listening on port ${port}.`));
}

export default app;
