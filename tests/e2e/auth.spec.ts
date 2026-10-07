import { expect, test } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { E2E_ENV } from "../../playwright.config";
import { ADMIN, CUSTOMER, signIn, signUp } from "./helpers";

test.describe("accounts and permissions", () => {
  test("sign up, sign out and sign back in", async ({ page }) => {
    const account = await signUp(page);
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    await expect(page.getByText("Your library is empty.")).toBeVisible();

    await page.goto("/account/settings");
    await page.getByRole("main").getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/");
    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount/);

    await signIn(page, account);
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  });

  test("validates auth forms and rejects wrong passwords", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(CUSTOMER.email);
    await page.getByLabel("Password", { exact: true }).fill("wrong-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email and password don't match an account.")).toBeVisible();
  });

  test("password recovery through the emailed link", async ({ page }) => {
    const account = await signUp(page, "Forgetful Shopper");
    await page.context().clearCookies();

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(account.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/a reset link is on its way/)).toBeVisible();

    const outbox = path.resolve(E2E_ENV.STORAGE_DIR, "outbox");
    let link: string | undefined;
    await expect(async () => {
      for (const file of (await readdir(outbox)).sort().reverse()) {
        const message = JSON.parse(await readFile(path.join(outbox, file), "utf8"));
        if (message.to === account.email) link = message.text.match(/https?:\/\/\S+/)?.[0];
        if (link) break;
      }
      expect(link).toBeTruthy();
    }).toPass({ timeout: 10_000 });

    await page.goto(link!);
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    await page.getByLabel("New password", { exact: true }).fill("a-brand-new-password");
    await page.getByLabel("Confirm new password").fill("a-brand-new-password");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText(/Your password has been changed/)).toBeVisible();

    await signIn(page, { email: account.email, password: "a-brand-new-password" });
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  });

  test("customers cannot reach the admin area or admin actions", async ({ page }) => {
    await signIn(page, CUSTOMER);
    await page.goto("/admin");
    await expect(page.getByText("This page doesn’t exist.")).toBeVisible();
    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "Products" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });

  test("administrators can open the admin area", async ({ page }) => {
    await signIn(page, ADMIN, "/admin");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Products" }).click();
    await expect(page.getByText("Demo inventory").first()).toBeVisible();
  });

  test("favourites persist across sessions", async ({ page }) => {
    const account = await signUp(page, "Collector");
    await page.goto("/products/contour-field");
    await page.getByRole("button", { name: "Add to favourites" }).click();
    await expect(page.getByRole("button", { name: "Saved to favourites" })).toBeVisible();

    await page.context().clearCookies();
    await signIn(page, account, "/account/favourites");
    await expect(page.getByRole("heading", { level: 2, name: "Contour Field Background" })).toBeVisible();
  });
});
