import { createHmac, timingSafeEqual } from "node:crypto";
import { env, isNonProduction } from "../env";
import { randomToken } from "../ids";
import {
  WebhookVerificationError,
  type PaymentEvent,
  type PaymentProvider,
} from "./types";

/**
 * SIMULATED payments for local development only. No money moves. The hosted
 * checkout page is /checkout/simulated/[sessionId]; its buttons emit signed
 * webhook events in Stripe's shape, which go through exactly the same
 * verification and fulfilment pipeline as real Stripe events.
 *
 * This provider refuses to load when APP_ENV=production.
 */
export const SIMULATED_SIGNATURE_HEADER = "x-simulated-signature";
const TOLERANCE_SECONDS = 300;

function secret(): string {
  const value = env().SIMULATED_WEBHOOK_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SIMULATED_WEBHOOK_SECRET (32+ characters) is required for simulated payments.");
  }
  return value;
}

function assertAllowed() {
  if (!isNonProduction()) throw new Error("Simulated payments are disabled in production.");
}

export function signSimulatedPayload(body: string, timestamp = Math.floor(Date.now() / 1000), key = secret()) {
  const signature = createHmac("sha256", key).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

export type SimulatedEventInput = {
  type:
    | "checkout.session.completed"
    | "checkout.session.async_payment_succeeded"
    | "checkout.session.async_payment_failed"
    | "checkout.session.expired"
    | "charge.refunded";
  orderId: string;
  sessionId: string;
  paymentId: string | null;
  amountTotal: number;
  currency: string;
  paymentStatus?: "paid" | "unpaid";
};

/** Builds a signed event body + headers, as a provider would send them. */
export function buildSimulatedWebhook(input: SimulatedEventInput, eventId = `sim_evt_${randomToken(10)}`) {
  assertAllowed();
  const object =
    input.type === "charge.refunded"
      ? {
          object: "charge",
          id: `sim_ch_${randomToken(8)}`,
          payment_intent: input.paymentId,
          amount: input.amountTotal,
          currency: input.currency.toLowerCase(),
          refunded: true,
          metadata: { orderId: input.orderId },
        }
      : {
          object: "checkout.session",
          id: input.sessionId,
          client_reference_id: input.orderId,
          metadata: { orderId: input.orderId },
          payment_intent: input.paymentId,
          payment_status: input.paymentStatus ?? "paid",
          amount_total: input.amountTotal,
          currency: input.currency.toLowerCase(),
        };
  const body = JSON.stringify({ id: eventId, type: input.type, livemode: false, data: { object } });
  const headers = new Headers({
    "content-type": "application/json",
    [SIMULATED_SIGNATURE_HEADER]: signSimulatedPayload(body),
  });
  return { body, headers, eventId };
}

export class SimulatedProvider implements PaymentProvider {
  readonly name = "simulated" as const;

  constructor() {
    assertAllowed();
  }

  async createCheckoutSession() {
    const sessionId = `sim_cs_${randomToken(12)}`;
    const { APP_URL } = env();
    return { sessionId, url: `${APP_URL}/checkout/simulated/${sessionId}` };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent> {
    const header = headers.get(SIMULATED_SIGNATURE_HEADER);
    const match = header?.match(/^t=(\d+),v1=([a-f0-9]{64})$/);
    if (!match) throw new WebhookVerificationError("Missing or malformed simulated signature");
    const timestamp = Number(match[1]);
    if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) {
      throw new WebhookVerificationError("Simulated webhook timestamp outside tolerance");
    }
    const expected = Buffer.from(signSimulatedPayload(rawBody, timestamp).split("v1=")[1]);
    const given = Buffer.from(match[2]);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      throw new WebhookVerificationError("Invalid simulated webhook signature");
    }

    const event = JSON.parse(rawBody) as {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
    };
    const o = event.data.object;
    const base: PaymentEvent = {
      id: event.id,
      provider: "simulated",
      rawType: event.type,
      type: "ignored",
      orderId: (o.metadata as { orderId?: string } | undefined)?.orderId ?? null,
      sessionId: o.object === "checkout.session" ? String(o.id) : null,
      paymentId: (o.payment_intent as string | null) ?? null,
      paymentStatus: (o.payment_status as PaymentEvent["paymentStatus"]) ?? null,
      amountTotal: (o.amount_total as number | undefined) ?? (o.amount as number | undefined) ?? null,
      currency: typeof o.currency === "string" ? o.currency.toUpperCase() : null,
      refundedFully: o.refunded === true,
    };
    const map: Record<string, PaymentEvent["type"]> = {
      "checkout.session.completed": "checkout.completed",
      "checkout.session.async_payment_succeeded": "payment.succeeded",
      "checkout.session.async_payment_failed": "payment.failed",
      "checkout.session.expired": "checkout.expired",
      "charge.refunded": "payment.refunded",
    };
    return { ...base, type: map[event.type] ?? "ignored" };
  }

  async expireSession() {
    // Nothing to do: simulated sessions only exist as the order row.
  }

  async refund() {
    // Refunds are simulated by emitting a charge.refunded event; see orders.refundOrder.
  }
}
