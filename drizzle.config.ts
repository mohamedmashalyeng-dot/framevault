import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: process.env.DATABASE_AUTH_TOKEN ? "turso" : "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/framevault.db",
    ...(process.env.DATABASE_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN } : {}),
  },
});
