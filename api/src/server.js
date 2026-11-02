import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../.env.local", import.meta.url)) });
dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const { startServer } = await import("./app.js");

startServer().catch((error) => {
  console.error("API startup failed:", error);
  process.exitCode = 1;
});
