import type { Express } from "express";

declare module "@/server/app.js" {
  const app: Express;
  export default app;
  export function initializeApp(): Promise<void>;
}
