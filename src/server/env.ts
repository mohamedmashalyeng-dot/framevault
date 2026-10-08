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

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid server environment:\n${issues}\nSee .env.example.`);
  }
  const value = parsed.data;

  if (value.APP_ENV === "production") {
    if (value.PAYMENT_PROVIDER === "simulated") {
      throw new Error("PAYMENT_PROVIDER=simulated is not allowed when APP_ENV=production.");
    }
    if (!value.STRIPE_SECRET_KEY || !value.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required in production.");
    }
  }
  cached = value;
  return value;
}

/** True only outside production. Gates every simulated/dev-only surface. */
export function isNonProduction() {
  return env().APP_ENV !== "production";
}
