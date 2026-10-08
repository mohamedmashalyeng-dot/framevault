import { afterEach, describe, expect, it, vi } from "vitest";

const baselineEnv: Record<string, string | undefined> = { ...process.env };

function replaceEnv(values: Record<string, string | undefined>) {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, values);
}

afterEach(() => {
  replaceEnv(baselineEnv);
  vi.resetModules();
});

describe("environment scopes", () => {
  it("validates database settings for migrations without requiring Stripe", async () => {
    replaceEnv({
      APP_ENV: "production",
      DATABASE_URL: "file:./data/migration-test.db",
      DATABASE_AUTH_TOKEN: "",
    });

    const { databaseEnv } = await import("@/server/env");
    expect(databaseEnv()).toEqual({
      DATABASE_URL: "file:./data/migration-test.db",
      DATABASE_AUTH_TOKEN: "",
    });
  });

  it("still rejects Stripe code paths when Stripe credentials are missing", async () => {
    replaceEnv({
      APP_ENV: "production",
      APP_URL: "https://example.com",
      DATABASE_URL: "file:./data/test.db",
      DATABASE_AUTH_TOKEN: "",
      BETTER_AUTH_SECRET: "test-better-auth-secret-0123456789abcdef",
      DOWNLOAD_TOKEN_SECRET: "test-download-token-secret-0123456789abcdef",
      STORAGE_DIR: "./storage",
      STORE_CURRENCY: "USD",
      DEMO_PRICING: "false",
      PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
    });

    const { getProvider } = await import("@/server/payments");
    expect(() => getProvider("stripe")).toThrow("Stripe is selected but STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are not set.");
  });
});
