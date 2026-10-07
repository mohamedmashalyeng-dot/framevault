import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { entitlement, order } from "@/db/schema";
import { decideAccess } from "@/server/access";
import { processPaymentEvent, receiveWebhook, refundOrder, startCheckout } from "@/server/orders";
import { buildSimulatedWebhook, SIMULATED_SIGNATURE_HEADER } from "@/server/payments/simulated";
import { WebhookVerificationError } from "@/server/payments/types";
import { saveAllAccessSettings } from "@/server/settings";
import { createTestProduct, createUser, setupDatabase } from "./helpers";

beforeAll(setupDatabase);

async function checkout(priceCents = 2900) {
  const product = await createTestProduct({ priceCents });
  const buyer = await createUser();
  const result = await startCheckout({ ...buyer, role: "customer" }, { type: "product", slug: product.slug });
  if (!result.ok) throw new Error(result.message);
  const [row] = await getDb().select().from(order).where(eq(order.id, result.orderId));
  return { product, buyer, order: row };
}

function event(o: typeof order.$inferSelect, type: Parameters<typeof buildSimulatedWebhook>[0]["type"], extra: Partial<Parameters<typeof buildSimulatedWebhook>[0]> = {}) {
  return buildSimulatedWebhook({
    type,
    orderId: o.id,
    sessionId: o.providerSessionId!,
    paymentId: `pi_${o.id}`,
    amountTotal: o.totalCents,
    currency: o.currency,
    paymentStatus: "paid",
    ...extra,
  });
}

describe("checkout", () => {
  it("prices orders on the server and starts pending", async () => {
    const { order: o, buyer } = await checkout(2900);
    expect(o).toMatchObject({ status: "pending", totalCents: 2900, currency: "USD", provider: "simulated", userId: buyer.id });
    expect(o.providerSessionId).toMatch(/^sim_cs_/);
  });

  it("refuses free, unknown and already-owned products", async () => {
    const buyer = { ...(await createUser()), role: "customer" as const };
    const free = await createTestProduct({ priceCents: 0 });
    expect(await startCheckout(buyer, { type: "product", slug: free.slug })).toMatchObject({ ok: false, code: "not_for_sale" });
    expect(await startCheckout(buyer, { type: "product", slug: "missing" })).toMatchObject({ ok: false, code: "not_found" });
  });
});

describe("webhook processing", () => {
  it("grants access only after a verified paid event, idempotently", async () => {
    const { order: o, buyer, product } = await checkout();
    expect((await decideAccess(buyer, product.slug)).allowed).toBe(false);

    const { body, headers } = event(o, "checkout.session.completed");
    const first = await receiveWebhook("simulated", body, headers);
    const second = await receiveWebhook("simulated", body, headers);
    expect(first).toMatchObject({ duplicate: false, outcome: "paid", status: "paid" });
    expect(second).toMatchObject({ duplicate: true, outcome: "paid" });

    const grants = await getDb().select().from(entitlement).where(eq(entitlement.orderId, o.id));
    expect(grants).toHaveLength(1);
    expect((await decideAccess(buyer, product.slug)).reason).toBe("owned");

    // A different event id for the same payment (provider retry) is also harmless.
    const again = await receiveWebhook("simulated", ...(Object.values(event(o, "checkout.session.async_payment_succeeded")).slice(0, 2) as [string, Headers]));
    expect(again.outcome).toBe("noop_paid");
    expect(await getDb().select().from(entitlement).where(eq(entitlement.orderId, o.id))).toHaveLength(1);
  });

  it("rejects unsigned, tampered and stale webhooks", async () => {
    const { order: o } = await checkout();
    const { body, headers } = event(o, "checkout.session.completed");
    await expect(receiveWebhook("simulated", body.replace('"paid"', '"paid" '), headers)).rejects.toBeInstanceOf(WebhookVerificationError);
    await expect(receiveWebhook("simulated", body, new Headers())).rejects.toBeInstanceOf(WebhookVerificationError);
    const stale = new Headers(headers);
    stale.set(SIMULATED_SIGNATURE_HEADER, headers.get(SIMULATED_SIGNATURE_HEADER)!.replace(/t=\d+/, "t=1000"));
    await expect(receiveWebhook("simulated", body, stale)).rejects.toBeInstanceOf(WebhookVerificationError);
    const [row] = await getDb().select().from(order).where(eq(order.id, o.id));
    expect(row.status).toBe("pending");
  });

  it("fails the order when the paid amount does not match", async () => {
    const { order: o, buyer, product } = await checkout(4900);
    const { body, headers } = event(o, "checkout.session.completed", { amountTotal: 100 });
    expect((await receiveWebhook("simulated", body, headers)).outcome).toBe("amount_mismatch");
    expect((await decideAccess(buyer, product.slug)).allowed).toBe(false);
  });

  it("keeps delayed payments pending until they clear, and handles failure", async () => {
    const delayed = await checkout();
    let r = event(delayed.order, "checkout.session.completed", { paymentStatus: "unpaid" });
    expect((await receiveWebhook("simulated", r.body, r.headers)).outcome).toBe("awaiting_payment");
    expect((await decideAccess(delayed.buyer, delayed.product.slug)).allowed).toBe(false);
    r = event(delayed.order, "checkout.session.async_payment_succeeded");
    expect((await receiveWebhook("simulated", r.body, r.headers)).status).toBe("paid");
    expect((await decideAccess(delayed.buyer, delayed.product.slug)).allowed).toBe(true);

    const failing = await checkout();
    r = event(failing.order, "checkout.session.async_payment_failed", { paymentStatus: "unpaid" });
    expect((await receiveWebhook("simulated", r.body, r.headers)).status).toBe("failed");
    const expired = await checkout();
    r = event(expired.order, "checkout.session.expired", { paymentStatus: "unpaid" });
    expect((await receiveWebhook("simulated", r.body, r.headers)).status).toBe("expired");
  });

  it("revokes access on a full refund", async () => {
    const { order: o, buyer, product } = await checkout();
    const paid = event(o, "checkout.session.completed");
    await receiveWebhook("simulated", paid.body, paid.headers);
    const [row] = await getDb().select().from(order).where(eq(order.id, o.id));
    const result = await refundOrder(row.id);
    expect(result.ok).toBe(true);
    const [after] = await getDb().select().from(order).where(eq(order.id, o.id));
    expect(after.status).toBe("refunded");
    expect((await decideAccess(buyer, product.slug)).allowed).toBe(false);
  });

  it("ignores events for unknown orders and other providers", async () => {
    const result = await processPaymentEvent({
      id: "evt_unknown_1",
      provider: "simulated",
      rawType: "checkout.session.completed",
      type: "checkout.completed",
      orderId: "ord_does_not_exist",
      sessionId: null,
      paymentId: null,
      paymentStatus: "paid",
      amountTotal: 100,
      currency: "USD",
      refundedFully: false,
    });
    expect(result.outcome).toBe("unknown_order");
  });

  it("sells the all-access bundle at the configured price", async () => {
    await saveAllAccessSettings({ enabled: true, priceCents: 12300 });
    const buyer = { ...(await createUser()), role: "customer" as const };
    const result = await startCheckout(buyer, { type: "all_access" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [o] = await getDb().select().from(order).where(eq(order.id, result.orderId));
    expect(o).toMatchObject({ kind: "all_access", totalCents: 12300 });
    const paid = event(o, "checkout.session.completed");
    await receiveWebhook("simulated", paid.body, paid.headers);
    const anyProduct = await createTestProduct({ priceCents: 9900 });
    expect((await decideAccess(buyer, anyProduct.slug)).reason).toBe("all_access");

    await saveAllAccessSettings({ enabled: false, priceCents: 12300 });
    const other = { ...(await createUser()), role: "customer" as const };
    expect(await startCheckout(other, { type: "all_access" })).toMatchObject({ ok: false, code: "not_for_sale" });
  });
});
