import { User, Settings } from "./models.js";

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

export async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please sign in to continue." });
  }

  const [user, settings] = await Promise.all([
    User.findById(req.session.userId).select("name username isActive"),
    Settings.findOne().lean(),
  ]);
  if (!user || !user.isActive) {
    await destroySession(req);
    return res.status(401).json({ message: "Your session is no longer valid." });
  }

  const now = Date.now();
  const idleMs = (settings?.sessionIdleMinutes ?? 30) * 60_000;
  const maxMs = (settings?.sessionMaxHours ?? 8) * 3_600_000;
  const expired =
    now - (req.session.lastActivityAt ?? now) >= idleMs ||
    now - (req.session.startedAt ?? now) >= maxMs;
  if (expired) {
    await destroySession(req);
    return res.status(401).json({ message: "Your session expired. Please sign in again." });
  }

  req.session.lastActivityAt = now;
  req.user = user;
  return next();
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error?.name === "ZodError") {
    return res.status(400).json({
      message: "Please check the submitted information.",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ message: "A record for this month already exists." });
  }
  if (error?.name === "CastError") {
    return res.status(400).json({ message: "Invalid record identifier." });
  }

  console.error(error);
  return res.status(500).json({ message: "An unexpected server error occurred." });
}
