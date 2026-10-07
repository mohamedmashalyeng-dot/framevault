import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { getDb } from "@/db";
import { entitlement, order, orderItem, paymentEvent, product, type OrderStatus } from "@/db/schema";
import { decideAccess, hasAllAccess } from "./access";
import { env } from "./env";
import { newId } from "./ids";
import { getActiveProvider, getProvider, WebhookVerificationError, type PaymentEvent, type ProviderName } from "./payments";
import { buildSimulatedWebhook } from "./payments/simulated";
import { getAllAccessSettings } from "./settings";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type CheckoutTarget = { type: "product"; slug: string } | { type: "all_access" };

export type CheckoutResult =
  | { ok: true; url: string; orderId: string }
  | { ok: false; code: "not_found" | "not_for_sale" | "already_owned" | "provider_error"; message: string };

/**
 * Starts a checkout. The amount, currency and product come exclusively from
 * the database; the client only names what it wants to buy.
 */
export async function startCheckout(
  buyer: { id: string; email: string; role: "customer" | "admin" },
  target: CheckoutTarget,
): Promise<CheckoutResult> {
  const db = getDb();
  const { STORE_CURRENCY, APP_URL } = env();
  await expireStaleSimulatedOrders();

  let kind: "product" | "all_access";
  let items: { productId: string | null; title: string; description: string; amountCents: number }[];

  if (target.type === "product") {
    const decision = await decideAccess(buyer, target.slug);
    const p = decision.product;
    if (!p || p.status !== "published") return { ok: false, code: "not_found", message: "This product is not available." };
    if (p.priceCents <= 0) return { ok: false, code: "not_for_sale", message: "This product is free; no purchase needed." };
    if (decision.allowed) return { ok: false, code: "already_owned", message: "You already have access to this product." };
    kind = "product";
    items = [{ productId: p.id, title: p.title, description: "Single product licence", amountCents: p.priceCents }];
  } else {
    const settings = await getAllAccessSettings();
    if (!settings.enabled) return { ok: false, code: "not_for_sale", message: "All-access is not currently offered." };
    if (await hasAllAccess(buyer.id)) return { ok: false, code: "already_owned", message: "You already have all-access." };
    kind = "all_access";
    items = [{ productId: null, title: "All-access pass", description: "Every product in the catalogue, including future releases", amountCents: settings.priceCents }];
  }

  const provider = getActiveProvider();
  const orderId = newId("ord");
  const totalCents = items.reduce((sum, i) => sum + i.amountCents, 0);

  await db.transaction(async (tx) => {
    await tx.insert(order).values({
      id: orderId,
      userId: buyer.id,
      status: "pending",
      kind,
      provider: provider.name,
      currency: STORE_CURRENCY,
      totalCents,
    });
    await tx.insert(orderItem).values(
      items.map((i) => ({
        id: newId("itm"),
        orderId,
        productId: i.productId,
        kind,
        titleSnapshot: i.title,
        unitPriceCents: i.amountCents,
      })),
    );
  });

  try {
    const session = await provider.createCheckoutSession({
      orderId,
      currency: STORE_CURRENCY,
      customerEmail: buyer.email,
      items: items.map((i) => ({ name: i.title, description: i.description, amountCents: i.amountCents, productId: i.productId })),
      successUrl: `${APP_URL}/checkout/success?order=${orderId}`,
      cancelUrl: `${APP_URL}/checkout/cancelled?order=${orderId}`,
    });
    await db.update(order).set({ providerSessionId: session.sessionId }).where(eq(order.id, orderId));
    return { ok: true, url: session.url, orderId };
  } catch (error) {
    console.error("[checkout] provider error", error);
    await db
      .update(order)
      .set({ status: "failed", statusReason: "checkout_session_failed" })
      .where(eq(order.id, orderId));
    return { ok: false, code: "provider_error", message: "We could not start checkout. Please try again in a moment." };
  }
}

/* -------------------------------------------------------------------------- */
/* Webhook processing                                                         */
/* -------------------------------------------------------------------------- */

export type ProcessResult = {
  duplicate: boolean;
  outcome: string;
  orderId: string | null;
  status: OrderStatus | null;
};

/** Verifies a raw webhook and processes it. Used by the webhook routes. */
export async function receiveWebhook(providerName: ProviderName, rawBody: string, headers: Headers) {
  const provider = getProvider(providerName);
  const event = await provider.verifyWebhook(rawBody, headers);
  return processPaymentEvent(event);
}

async function findOrderForEvent(tx: Tx, event: PaymentEvent) {
  if (event.orderId) {
    const [row] = await tx.select().from(order).where(eq(order.id, event.orderId));
    if (row) return row;
  }
  if (event.sessionId) {
    const [row] = await tx.select().from(order).where(eq(order.providerSessionId, event.sessionId));
    if (row) return row;
  }
  if (event.paymentId) {
    const [row] = await tx.select().from(order).where(eq(order.providerPaymentId, event.paymentId));
    if (row) return row;
  }
  return null;
}

async function grantEntitlements(tx: Tx, orderRow: typeof order.$inferSelect) {
  const items = await tx.select().from(orderItem).where(eq(orderItem.orderId, orderRow.id));
  for (const item of items) {
    await tx
      .insert(entitlement)
      .values({
        id: newId("ent"),
        userId: orderRow.userId,
        scope: item.kind === "all_access" ? "all_access" : "product",
        productId: item.kind === "all_access" ? null : item.productId,
        source: "purchase",
        orderId: orderRow.id,
      })
      .onConflictDoNothing();
  }
}

/**
 * Applies a verified provider event. Idempotent: the provider event id is
 * stored in the same transaction as its effects, so a retried or duplicated
 * webhook is acknowledged without being applied twice. Access is granted only
 * on a confirmed successful payment whose amount matches the order.
 */
export async function processPaymentEvent(event: PaymentEvent): Promise<ProcessResult> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(paymentEvent)
      .values({ id: event.id, provider: event.provider, type: event.rawType, orderId: event.orderId, outcome: "received" })
      .onConflictDoNothing()
      .returning({ id: paymentEvent.id });
    if (inserted.length === 0) {
      const [seen] = await tx.select().from(paymentEvent).where(eq(paymentEvent.id, event.id));
      return { duplicate: true, outcome: seen?.outcome ?? "duplicate", orderId: seen?.orderId ?? null, status: null };
    }

    const finish = async (outcome: string, orderId: string | null, status: OrderStatus | null) => {
      await tx.update(paymentEvent).set({ outcome, orderId }).where(eq(paymentEvent.id, event.id));
      return { duplicate: false, outcome, orderId, status };
    };

    if (event.type === "ignored") return finish("ignored", event.orderId, null);

    const current = await findOrderForEvent(tx, event);
    if (!current) return finish("unknown_order", event.orderId, null);
    if (current.provider !== event.provider) return finish("provider_mismatch", current.id, current.status);

    const markPaid = async () => {
      if (current.status === "paid" || current.status === "refunded") {
        return finish(`noop_${current.status}`, current.id, current.status);
      }
      if (event.amountTotal !== null && event.amountTotal !== current.totalCents) {
        await tx.update(order).set({ status: "failed", statusReason: "amount_mismatch" }).where(eq(order.id, current.id));
        return finish("amount_mismatch", current.id, "failed");
      }
      if (event.currency && event.currency !== current.currency) {
        await tx.update(order).set({ status: "failed", statusReason: "currency_mismatch" }).where(eq(order.id, current.id));
        return finish("currency_mismatch", current.id, "failed");
      }
      await tx
        .update(order)
        .set({
          status: "paid",
          statusReason: null,
          paidAt: new Date(),
          providerPaymentId: event.paymentId ?? current.providerPaymentId,
          providerSessionId: event.sessionId ?? current.providerSessionId,
        })
        .where(eq(order.id, current.id));
      await grantEntitlements(tx, current);
      return finish("paid", current.id, "paid");
    };

    switch (event.type) {
      case "checkout.completed": {
        if (event.paymentStatus === "paid" || event.paymentStatus === "no_payment_required") return markPaid();
        // Delayed payment methods: the session completed but money has not arrived yet.
        await tx
          .update(order)
          .set({ statusReason: "awaiting_payment", providerPaymentId: event.paymentId ?? current.providerPaymentId })
          .where(and(eq(order.id, current.id), eq(order.status, "pending")));
        return finish("awaiting_payment", current.id, current.status);
      }
      case "payment.succeeded":
        return markPaid();
      case "payment.failed": {
        if (current.status !== "pending") return finish(`noop_${current.status}`, current.id, current.status);
        await tx.update(order).set({ status: "failed", statusReason: "payment_failed" }).where(eq(order.id, current.id));
        return finish("failed", current.id, "failed");
      }
      case "checkout.expired": {
        if (current.status !== "pending") return finish(`noop_${current.status}`, current.id, current.status);
        await tx.update(order).set({ status: "expired", statusReason: "session_expired" }).where(eq(order.id, current.id));
        return finish("expired", current.id, "expired");
      }
      case "payment.refunded": {
        if (current.status !== "paid") return finish(`noop_${current.status}`, current.id, current.status);
        if (!event.refundedFully) return finish("partial_refund_recorded", current.id, current.status);
        await tx
          .update(order)
          .set({ status: "refunded", refundedAt: new Date(), statusReason: "refunded" })
          .where(eq(order.id, current.id));
        await tx
          .update(entitlement)
          .set({ revokedAt: new Date(), revokedReason: "refunded" })
          .where(and(eq(entitlement.orderId, current.id), isNull(entitlement.revokedAt)));
        return finish("refunded", current.id, "refunded");
      }
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Customer-facing order helpers                                              */
/* -------------------------------------------------------------------------- */

export async function getOrderForUser(userId: string, orderId: string) {
  const [row] = await getDb()
    .select()
    .from(order)
    .where(and(eq(order.id, orderId), eq(order.userId, userId)));
  if (!row) return null;
  const items = await getDb()
    .select({
      kind: orderItem.kind,
      title: orderItem.titleSnapshot,
      unitPriceCents: orderItem.unitPriceCents,
      productSlug: product.slug,
    })
    .from(orderItem)
    .leftJoin(product, eq(product.id, orderItem.productId))
    .where(eq(orderItem.orderId, orderId));
  return { ...row, items };
}

export async function getOrderBySession(sessionId: string) {
  const [row] = await getDb().select().from(order).where(eq(order.providerSessionId, sessionId));
  if (!row) return null;
  const items = await getDb()
    .select({ title: orderItem.titleSnapshot, unitPriceCents: orderItem.unitPriceCents })
    .from(orderItem)
    .where(eq(orderItem.orderId, row.id));
  return { ...row, items };
}

export async function listOrdersForUser(userId: string, limit = 50) {
  const rows = await getDb()
    .select()
    .from(order)
    .where(eq(order.userId, userId))
    .orderBy(desc(order.createdAt))
    .limit(limit);
  if (rows.length === 0) return [];
  const items = await getDb()
    .select({ orderId: orderItem.orderId, title: orderItem.titleSnapshot, productSlug: product.slug })
    .from(orderItem)
    .leftJoin(product, eq(product.id, orderItem.productId))
    .where(inArray(orderItem.orderId, rows.map((r) => r.id)));
  return rows.map((r) => ({ ...r, items: items.filter((i) => i.orderId === r.id) }));
}

/** The buyer abandoned checkout. Closes the provider session so it cannot be paid later. */
export async function cancelPendingOrder(userId: string, orderId: string) {
  const current = await getOrderForUser(userId, orderId);
  if (!current) return null;
  if (current.status === "pending") {
    if (current.providerSessionId) {
      try {
        await getProvider(current.provider).expireSession(current.providerSessionId);
      } catch (error) {
        console.warn("[checkout] could not expire session", error);
      }
    }
    await getDb()
      .update(order)
      .set({ status: "cancelled", statusReason: "cancelled_by_customer" })
      .where(and(eq(order.id, orderId), eq(order.status, "pending")));
  }
  return getOrderForUser(userId, orderId);
}

async function expireStaleSimulatedOrders() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await getDb()
    .update(order)
    .set({ status: "expired", statusReason: "session_expired" })
    .where(and(eq(order.status, "pending"), eq(order.provider, "simulated"), lt(order.createdAt, cutoff)));
}

/**
 * Admin refund. Stripe refunds are issued through the API and access is
 * revoked when Stripe's charge.refunded webhook arrives. Simulated refunds
 * emit the equivalent signed event through the same pipeline.
 */
export async function refundOrder(orderId: string): Promise<{ ok: boolean; message: string }> {
  const [current] = await getDb().select().from(order).where(eq(order.id, orderId));
  if (!current) return { ok: false, message: "Order not found." };
  if (current.status !== "paid") return { ok: false, message: `Only paid orders can be refunded (status: ${current.status}).` };

  if (current.provider === "simulated") {
    const { body, headers } = buildSimulatedWebhook({
      type: "charge.refunded",
      orderId: current.id,
      sessionId: current.providerSessionId ?? "",
      paymentId: current.providerPaymentId,
      amountTotal: current.totalCents,
      currency: current.currency,
    });
    const result = await receiveWebhook("simulated", body, headers);
    return { ok: result.outcome === "refunded", message: `Simulated refund processed (${result.outcome}).` };
  }

  await getProvider("stripe").refund(current);
  return { ok: true, message: "Refund requested from Stripe. Access is revoked when Stripe confirms it." };
}

export async function countOrdersByStatus() {
  return getDb()
    .select({ status: order.status, count: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${order.totalCents}), 0)` })
    .from(order)
    .groupBy(order.status);
}

export { WebhookVerificationError };
