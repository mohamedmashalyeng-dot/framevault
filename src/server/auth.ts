import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { BRAND } from "@/config/brand";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "./email";
import { env } from "./env";

function createAuth() {
  const { APP_URL, BETTER_AUTH_SECRET, APP_ENV } = env();

  return betterAuth({
    appName: BRAND.name,
    baseURL: APP_URL,
    secret: BETTER_AUTH_SECRET,
    trustedOrigins: [APP_URL],
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    user: {
      additionalFields: {
        // Never accepted from sign-up input; changed only by administrators.
        role: { type: "string", required: false, defaultValue: "customer", input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: `Reset your ${BRAND.name} password`,
          text: [
            `Hi ${user.name || "there"},`,
            "",
            `Someone (hopefully you) asked to reset the password for your ${BRAND.name} account.`,
            "Open this link within the next hour to choose a new password:",
            "",
            url,
            "",
            "If you did not request this, you can ignore this email; your password will not change.",
          ].join("\n"),
        });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: APP_ENV !== "test",
      window: 60,
      max: 120,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 5 },
      },
    },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { __framevaultAuth?: Auth };

export function getAuth(): Auth {
  globalForAuth.__framevaultAuth ??= createAuth();
  return globalForAuth.__framevaultAuth;
}
