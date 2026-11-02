import { startServer } from "./app.js";

startServer().catch((error) => {
  console.error("API startup failed:", error);
  process.exitCode = 1;
});
