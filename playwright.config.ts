import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build in an isolated
 * environment: its own port, database, storage and build folder, the
 * simulated payment provider and fixed test accounts. Uses the locally
 * installed Google Chrome (no browser download needed).
 */
const PORT = 3210;
export const BASE_URL = `http://localhost:${PORT}`;

export const E2E_ENV = {
  APP_ENV: "test",
  APP_URL: BASE_URL,
  BETTER_AUTH_URL: BASE_URL,
  DATABASE_URL: "file:./data/e2e.db",
  STORAGE_DIR: "./storage-e2e",
  NEXT_DIST_DIR: ".next-e2e",
  PAYMENT_PROVIDER: "simulated",
  SIMULATED_WEBHOOK_SECRET: "e2e-simulated-webhook-secret-0123456789abcd",
  STORE_CURRENCY: "USD",
  DEMO_PRICING: "true",
  RESEND_API_KEY: "",
  SEED_ADMIN_EMAIL: "admin@e2e.test",
  SEED_ADMIN_PASSWORD: "e2e-admin-password-1234",
  SEED_CUSTOMER_EMAIL: "customer@e2e.test",
  SEED_CUSTOMER_PASSWORD: "e2e-customer-password-1234",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: `npx tsx scripts/e2e-prepare.ts && npx next build && npx next start --port ${PORT}`,
    url: BASE_URL,
    env: E2E_ENV,
    timeout: 600_000,
    reuseExistingServer: false,
    stdout: "pipe",
  },
});
