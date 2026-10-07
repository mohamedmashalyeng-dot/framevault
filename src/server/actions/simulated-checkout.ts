"use server";

import { redirect } from "next/navigation";
import { env, isNonProduction } from "../env";
import { getOrderBySession, getOrderForUser } from "../orders";
import { buildSimulatedWebhook, type SimulatedEventInput } from "../payments/simulated";
import { getSessionUser } from "../session";

/**
 * SIMULATED checkout outcomes (development and test only). Each button sends
 * a signed webhook to /api/webhooks/simulated over HTTP, exactly as a real
 * provider would, then returns the buyer to the store. The store never
 * unlocks anything because of the redirect itself.
 */
type Outcome = "pay" | "pay_delayed" | "decline";

export async function simulateOutcomeAction(sessionId: string, outcome: Outcome) {
  if (!isNonProduction()) throw new Error("Simulated checkout is disabled in production.");
  const user = await getSessionUser();
  const order = await getOrderBySession(sessionId);
  if (!user || !order || order.userId !== user.id || order.provider !== "simulated") {
    redirect("/account/orders");
  }

  const base: Omit<SimulatedEventInput, "type"> = {
    orderId: order.id,
    sessionId,
    paymentId: `sim_pi_${order.id.slice(4)}`,
    amountTotal: order.totalCents,
    currency: order.currency,
  };

  const events: SimulatedEventInput[] =
    outcome === "pay"
      ? [{ ...base, type: "checkout.session.completed", paymentStatus: "paid" }]
      : outcome === "pay_delayed"
        ? [{ ...base, type: "checkout.session.completed", paymentStatus: "unpaid" }]
        : [{ ...base, type: "checkout.session.async_payment_failed", paymentStatus: "unpaid" }];

  for (const input of events) {
    const { body, headers } = buildSimulatedWebhook(input);
    const response = await fetch(`${env().APP_URL}/api/webhooks/simulated`, { method: "POST", body, headers });
    if (!response.ok) console.error("[simulated] webhook delivery failed", response.status, await response.text());
  }

  redirect(outcome === "decline" ? `/checkout/cancelled?order=${order.id}&reason=declined` : `/checkout/success?order=${order.id}`);
}

/** Completes a delayed ("pending") simulated payment, as a bank transfer clearing would. */
export async function settleDelayedPaymentAction(orderId: string, succeed: boolean) {
  if (!isNonProduction()) throw new Error("Simulated checkout is disabled in production.");
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const order = await getOrderForUser(user.id, orderId);
  if (!order || order.provider !== "simulated" || order.status !== "pending" || !order.providerSessionId) return;
  const { body, headers } = buildSimulatedWebhook({
    type: succeed ? "checkout.session.async_payment_succeeded" : "checkout.session.async_payment_failed",
    orderId: order.id,
    sessionId: order.providerSessionId,
    paymentId: order.providerPaymentId,
    amountTotal: order.totalCents,
    currency: order.currency,
    paymentStatus: succeed ? "paid" : "unpaid",
  });
  await fetch(`${env().APP_URL}/api/webhooks/simulated`, { method: "POST", body, headers });
}
