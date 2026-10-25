import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile("../../.env"); //relative to packages/db
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
