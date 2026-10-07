export type ProviderName = "stripe" | "simulated";

/** Provider-neutral event, produced only after a webhook signature is verified. */
export type PaymentEvent = {
  id: string;
  provider: ProviderName;
  rawType: string;
  type:
    | "checkout.completed"
    | "payment.succeeded"
    | "payment.failed"
    | "checkout.expired"
    | "payment.refunded"
    | "ignored";
  orderId: string | null;
  sessionId: string | null;
  paymentId: string | null;
  paymentStatus: "paid" | "unpaid" | "no_payment_required" | null;
  amountTotal: number | null;
  currency: string | null;
  refundedFully: boolean;
};

export type CheckoutLineItem = {
  name: string;
  description: string;
  amountCents: number;
  productId: string | null;
};

export type CheckoutRequest = {
  orderId: string;
  currency: string;
  customerEmail: string;
  items: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
};

export interface PaymentProvider {
  readonly name: ProviderName;
  /** Creates a hosted checkout session priced entirely on the server. */
  createCheckoutSession(request: CheckoutRequest): Promise<{ sessionId: string; url: string }>;
  /** Verifies the signature and normalises the event. Throws on any doubt. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
  /** Best effort: prevents a cancelled session from being paid later. */
  expireSession(sessionId: string): Promise<void>;
  refund(order: { id: string; providerPaymentId: string | null; providerSessionId: string | null; totalCents: number; currency: string }): Promise<void>;
}

export class WebhookVerificationError extends Error {}
