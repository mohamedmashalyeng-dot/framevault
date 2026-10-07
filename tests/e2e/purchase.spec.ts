import { expect, test, type Page } from "@playwright/test";
import { ADMIN, db, orderBySession, postSimulatedWebhook, signIn, signUp } from "./helpers";

async function startCheckout(page: Page, slug: string) {
  await page.goto(`/products/${slug}`);
  await page.getByRole("button", { name: /Buy now/ }).click();
  await page.waitForURL(/\/checkout\/simulated\/sim_cs_/);
  await expect(page.getByText("Simulated payment provider · development only")).toBeVisible();
  const sessionId = new URL(page.url()).pathname.split("/").pop()!;
  return { sessionId, order: await orderBySession(sessionId) };
}

test.describe("purchases", () => {
  test("a confirmed payment unlocks the product, a redirect alone does not", async ({ page }) => {
    await signUp(page, "Buyer One");
    const { sessionId, order } = await startCheckout(page, "signalboard");
    expect(order).toMatchObject({ status: "pending", total_cents: 2900, currency: "USD" });

    // Visiting the success URL without a confirmed payment unlocks nothing.
    await page.goto(`/checkout/success?order=${order.id}`);
    await expect(page.getByRole("heading", { name: "Confirming your payment…" })).toBeVisible();
    await page.goto("/products/signalboard");
    await expect(page.getByRole("button", { name: /Buy now/ })).toBeVisible();

    await page.goto(`/checkout/simulated/${sessionId}`);
    await page.getByRole("button", { name: /simulate success/ }).click();
    await expect(page.getByRole("heading", { name: "Payment confirmed." })).toBeVisible();

    await page.goto("/products/signalboard");
    await expect(page.getByText("You own this product. It is in your library.")).toBeVisible();
    await page.getByRole("button", { name: "View & copy prompt" }).click();
    await expect(page.getByRole("dialog")).toContainText('Build "Signalboard"');
    await page.getByRole("button", { name: "Close prompt" }).click();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download source/ }).click()]);
    expect(download.suggestedFilename()).toBe("signalboard-v1.0.0.zip");

    await page.goto("/account");
    await expect(page.getByRole("link", { name: "Signalboard SaaS Landing" })).toBeVisible();
    await page.goto("/account/orders");
    await expect(page.getByText("Paid", { exact: true })).toBeVisible();
  });

  test("duplicate and forged webhooks are handled safely", async ({ page }) => {
    await signUp(page, "Buyer Two");
    const { sessionId, order } = await startCheckout(page, "tally-pricing");
    const event = {
      id: `evt_dup_${order.id}`,
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          object: "checkout.session",
          id: sessionId,
          client_reference_id: order.id,
          metadata: { orderId: order.id },
          payment_intent: `pi_${order.id}`,
          payment_status: "paid",
          amount_total: order.total_cents,
          currency: "usd",
        },
      },
    };

    const forged = await fetch(`${new URL(page.url()).origin}/api/webhooks/simulated`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-simulated-signature": `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}` },
      body: JSON.stringify(event),
    });
    expect(forged.status).toBe(400);
    expect((await orderBySession(sessionId)).status).toBe("pending");

    const first = await postSimulatedWebhook(event);
    const second = await postSimulatedWebhook(event);
    expect(first).toEqual({ status: 200, json: expect.objectContaining({ duplicate: false, outcome: "paid" }) });
    expect(second).toEqual({ status: 200, json: expect.objectContaining({ duplicate: true }) });

    const grants = await db.execute({ sql: "select count(*) as n from entitlement where order_id = ?", args: [order.id] });
    expect(Number(grants.rows[0].n)).toBe(1);
    await page.goto("/products/tally-pricing");
    await expect(page.getByText("You own this product. It is in your library.")).toBeVisible();
  });

  test("cancelled and declined checkouts show clear states and charge nothing", async ({ page }) => {
    await signUp(page, "Buyer Three");
    let { order } = await startCheckout(page, "meridian-studio");
    await page.getByRole("link", { name: "Cancel and return to the store" }).click();
    await expect(page.getByRole("heading", { name: /nothing was charged/ })).toBeVisible();
    await expect.poll(async () => (await db.execute({ sql: `select status from "order" where id = ?`, args: [order.id] })).rows[0].status).toBe("cancelled");

    ({ order } = await startCheckout(page, "meridian-studio"));
    await page.getByRole("button", { name: "Simulate declined payment" }).click();
    await expect(page.getByRole("heading", { name: "Your payment was declined." })).toBeVisible();
    expect((await db.execute({ sql: `select status from "order" where id = ?`, args: [order.id] })).rows[0].status).toBe("failed");

    await page.goto("/products/meridian-studio");
    await expect(page.getByRole("button", { name: /Buy now/ })).toBeVisible();
    await page.goto("/account/orders");
    await expect(page.getByText("Checkout was cancelled. You were not charged.")).toBeVisible();
    await expect(page.getByText("The payment did not go through. You were not charged.")).toBeVisible();
  });

  test("delayed payments stay pending until they clear", async ({ page }) => {
    await signUp(page, "Buyer Four");
    await startCheckout(page, "terminal-folio");
    await page.getByRole("button", { name: /delayed payment/ }).click();
    await expect(page.getByRole("heading", { name: "Confirming your payment…" })).toBeVisible();
    await page.getByRole("button", { name: "Payment clears" }).click();
    await expect(page.getByRole("heading", { name: "Payment confirmed." })).toBeVisible();
  });

  test("an admin refund revokes access", async ({ page, browser }) => {
    const buyer = await signUp(page, "Refund Buyer");
    const { sessionId } = await startCheckout(page, "meridian-studio");
    await page.getByRole("button", { name: /simulate success/ }).click();
    await expect(page.getByRole("heading", { name: "Payment confirmed." })).toBeVisible();
    const order = await orderBySession(sessionId);

    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await signIn(admin, ADMIN, "/admin");
    await admin.goto(`/admin/orders?q=${order.id}`);
    admin.once("dialog", (d) => d.accept());
    await admin.getByRole("button", { name: "Refund" }).click();
    await expect(admin.locator("tr", { hasText: order.id }).getByText("Refunded", { exact: true })).toBeVisible();
    await adminContext.close();

    await page.goto("/products/meridian-studio");
    await expect(page.getByRole("button", { name: /Buy now/ })).toBeVisible();
    await page.goto("/account/orders");
    await expect(page.getByText("Refunded. Access granted by this order has been removed.")).toBeVisible();
    expect(buyer.email).toContain("@e2e.test");
  });

  test("all-access unlocks every product", async ({ page }) => {
    await signUp(page, "Bundle Buyer");
    await page.goto("/all-access");
    await page.getByRole("button", { name: /Get all-access/ }).click();
    await page.waitForURL(/\/checkout\/simulated\//);
    await page.getByRole("button", { name: /simulate success/ }).click();
    await expect(page.getByText("All-access is now active on your account.")).toBeVisible();
    await page.goto("/products/meridian-studio");
    await expect(page.getByText("Included with your all-access pass.")).toBeVisible();
  });
});
