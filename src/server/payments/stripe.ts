import Stripe from "stripe";
import { stripeEnv } from "../env";
import {
  WebhookVerificationError,
  type CheckoutRequest,
  type PaymentEvent,
  type PaymentProvider,
} from "./types";

/**
 * Stripe Checkout (hosted). Prices are sent as inline `price_data` computed on
 * the server from the database, so the browser never supplies an amount.
 * Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET on Stripe code paths.
 */
export class StripeProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  private client: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.client = new Stripe(secretKey, { maxNetworkRetries: 2, appInfo: { name: "framevault-store" } });
    this.webhookSecret = webhookSecret;
  }

  static fromEnv(): StripeProvider {
    const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = stripeEnv();
    return new StripeProvider(STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET);
  }

  async createCheckoutSession(request: CheckoutRequest) {
    const session = await this.client.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: request.orderId,
        customer_email: request.customerEmail,
        metadata: { orderId: request.orderId },
        payment_intent_data: { metadata: { orderId: request.orderId } },
        line_items: request.items.map((item) => ({
          quantity: 1,
          price_data: {
            currency: request.currency.toLowerCase(),
            unit_amount: item.amountCents,
            product_data: {
              name: item.name,
              description: item.description || undefined,
              metadata: item.productId ? { productId: item.productId } : undefined,
            },
          },
        })),
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      { idempotencyKey: `checkout-${request.orderId}` },
    );
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { sessionId: session.id, url: session.url };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent> {
    const signature = headers.get("stripe-signature");
    if (!signature) throw new WebhookVerificationError("Missing Stripe-Signature header");
    let event: Stripe.Event;
    try {
      event = await this.client.webhooks.constructEventAsync(rawBody, signature, this.webhookSecret);
    } catch {
      throw new WebhookVerificationError("Invalid Stripe webhook signature");
    }
    return normaliseStripeEvent(event);
  }

  async expireSession(sessionId: string) {
    const session = await this.client.checkout.sessions.retrieve(sessionId);
    if (session.status === "open") await this.client.checkout.sessions.expire(sessionId);
  }

  async refund(order: { providerPaymentId: string | null }) {
    if (!order.providerPaymentId) throw new Error("Order has no Stripe payment to refund");
    await this.client.refunds.create({ payment_intent: order.providerPaymentId });
  }
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function normaliseStripeEvent(event: Stripe.Event): PaymentEvent {
  const base: PaymentEvent = {
    id: event.id,
    provider: "stripe",
    rawType: event.type,
    type: "ignored",
    orderId: null,
    sessionId: null,
    paymentId: null,
    paymentStatus: null,
    amountTotal: null,
    currency: null,
    refundedFully: false,
  };

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const type =
        event.type === "checkout.session.completed"
          ? "checkout.completed"
          : event.type === "checkout.session.async_payment_succeeded"
            ? "payment.succeeded"
            : event.type === "checkout.session.async_payment_failed"
              ? "payment.failed"
              : "checkout.expired";
      return {
        ...base,
        type,
        orderId: session.client_reference_id ?? session.metadata?.orderId ?? null,
        sessionId: session.id,
        paymentId: idOf(session.payment_intent),
        paymentStatus: (["paid", "unpaid", "no_payment_required"] as const).find((s) => s === session.payment_status) ?? null,
        amountTotal: session.amount_total,
        currency: session.currency ? session.currency.toUpperCase() : null,
      };
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      return {
        ...base,
        type: "payment.refunded",
        orderId: charge.metadata?.orderId ?? null,
        paymentId: idOf(charge.payment_intent),
        amountTotal: charge.amount,
        currency: charge.currency.toUpperCase(),
        refundedFully: charge.refunded,
      };
    }
    default:
      return base;
  }
}
