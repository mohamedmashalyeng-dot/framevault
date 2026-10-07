import { createClient } from "@libsql/client";
import { expect, type Page } from "@playwright/test";
import { createHmac, randomBytes } from "node:crypto";
import { BASE_URL, E2E_ENV } from "../../playwright.config";

export const ADMIN = { email: E2E_ENV.SEED_ADMIN_EMAIL, password: E2E_ENV.SEED_ADMIN_PASSWORD };
export const CUSTOMER = { email: E2E_ENV.SEED_CUSTOMER_EMAIL, password: E2E_ENV.SEED_CUSTOMER_PASSWORD };

/** Direct read access to the e2e database, for assertions only. */
export const db = createClient({ url: E2E_ENV.DATABASE_URL });

export async function signIn(page: Page, who: { email: string; password: string }, next = "/account") {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname === next.split("?")[0]);
}

export async function signUp(page: Page, name = "E2E Shopper") {
  const email = `shopper-${randomBytes(4).toString("hex")}@e2e.test`;
  const password = "shopper-password-123";
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/account");
  return { email, password };
}

/** Signs and posts a webhook exactly as the simulated provider would. */
export async function postSimulatedWebhook(payload: object) {
  const body = JSON.stringify(payload);
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", E2E_ENV.SIMULATED_WEBHOOK_SECRET).update(`${t}.${body}`).digest("hex");
  const res = await fetch(`${BASE_URL}/api/webhooks/simulated`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-simulated-signature": `t=${t},v1=${sig}` },
    body,
  });
  return { status: res.status, json: (await res.json()) as { duplicate?: boolean; outcome?: string } };
}

export async function orderBySession(sessionId: string) {
  const rs = await db.execute({ sql: `select * from "order" where provider_session_id = ?`, args: [sessionId] });
  return rs.rows[0] as unknown as { id: string; status: string; total_cents: number; currency: string; user_id: string };
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
