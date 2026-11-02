import type { NextConfig } from "next";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });
config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

if (process.env.NODE_ENV === "production") {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && !["http:", "https:"].includes(new URL(apiUrl).protocol)) {
    throw new Error("NEXT_PUBLIC_API_URL must use HTTP or HTTPS.");
  }
}

const nextConfig: NextConfig = {};

export default nextConfig;
