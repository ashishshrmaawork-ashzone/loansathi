import type { NextConfig } from "next";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });
config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
const nextConfig: NextConfig = {};

export default nextConfig;
