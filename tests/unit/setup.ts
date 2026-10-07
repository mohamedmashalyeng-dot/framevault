import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";

/**
 * Every test file gets its own throwaway SQLite database and storage folder,
 * and fixed test-only secrets. Nothing touches the development database.
 */
const id = randomBytes(6).toString("hex");
const dir = path.join(os.tmpdir(), `framevault-test-${id}`);

Object.assign(process.env, {
  APP_ENV: "test",
  APP_URL: "http://localhost:3999",
  DATABASE_URL: `file:${path.join(dir, "test.db").replace(/\\/g, "/")}`,
  DATABASE_AUTH_TOKEN: "",
  STORAGE_DIR: path.join(dir, "storage"),
  BETTER_AUTH_SECRET: "test-better-auth-secret-0123456789abcdef",
  DOWNLOAD_TOKEN_SECRET: "test-download-token-secret-0123456789abcdef",
  SIMULATED_WEBHOOK_SECRET: "test-simulated-webhook-secret-0123456789",
  PAYMENT_PROVIDER: "simulated",
  STORE_CURRENCY: "USD",
  DEMO_PRICING: "true",
  RESEND_API_KEY: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
});
