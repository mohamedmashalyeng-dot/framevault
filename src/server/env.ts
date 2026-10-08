import { z } from "zod";

/**
 * Server-only environment. Every secret is read here and nowhere else, so the
 * rest of the code base never touches `process.env` directly.
 */
const bool = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1).default("file:./data/framevault.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  DOWNLOAD_TOKEN_SECRET: z.string().min(32, "DOWNLOAD_TOKEN_SECRET must be at least 32 characters"),

  STORAGE_DIR: z.string().default("./storage"),
  DEMO_ORIGIN: z.string().optional(),

  STORE_CURRENCY: z
    .string()
    .regex(/^[A-Za-z]{3}$/)
    .default("USD")
    .transform((v) => v.toUpperCase()),
  DEMO_PRICING: bool,

  PAYMENT_PROVIDER: z.enum(["stripe", "simulated"]).default("simulated"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SIMULATED_WEBHOOK_SECRET: z.string().optional(),

  EMAIL_FROM: z.string().default("FRAMEVAULT <no-reply@framevault.local>"),
  RESEND_API_KEY: z.string().optional(),

  SEED_ADMIN_EMAIL: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_CUSTOMER_EMAIL: z.string().optional(),
  SEED_CUSTOMER_PASSWORD: z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;
export type DatabaseEnv = Pick<ServerEnv, "DATABASE_URL" | "DATABASE_AUTH_TOKEN">;
export type PaymentEnv = Pick<ServerEnv, "APP_ENV" | "PAYMENT_PROVIDER">;
export type StripeEnv = Pick<ServerEnv, "APP_ENV"> & {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
};

let cached: ServerEnv | null = null;
let cachedDatabase: DatabaseEnv | null = null;

function formatIssues(error: z.ZodError) {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server environment:\n${formatIssues(parsed.error)}\nSee .env.example.`);
  }
  const value = parsed.data;

  if (value.APP_ENV === "production") {
    if (value.PAYMENT_PROVIDER === "simulated") {
      throw new Error("PAYMENT_PROVIDER=simulated is not allowed when APP_ENV=production.");
    }
  }
  cached = value;
  return value;
}

/** Minimal environment for database clients and migrations. */
export function databaseEnv(): DatabaseEnv {
  if (cachedDatabase) return cachedDatabase;
  const parsed = schema.pick({ DATABASE_URL: true, DATABASE_AUTH_TOKEN: true }).safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid database environment:\n${formatIssues(parsed.error)}\nSee .env.example.`);
  }
  cachedDatabase = parsed.data;
  return cachedDatabase;
}

/** Payment selection without provider-specific secrets. */
export function paymentEnv(): PaymentEnv {
  const { APP_ENV, PAYMENT_PROVIDER } = env();
  return { APP_ENV, PAYMENT_PROVIDER };
}

/** Stripe-only environment. Call this only from Stripe code paths. */
export function stripeEnv(): StripeEnv {
  const { APP_ENV, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = env();
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe is selected but STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are not set.");
  }
  if (APP_ENV !== "production" && STRIPE_SECRET_KEY.startsWith("sk_live_")) {
    throw new Error("Refusing to use a live Stripe key outside production. Use a test-mode key (sk_test_...).");
  }
  return { APP_ENV, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET };
}

/** True only outside production. Gates every simulated/dev-only surface. */
export function isNonProduction() {
  return env().APP_ENV !== "production";
}
