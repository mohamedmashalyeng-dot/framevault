import { receiveWebhook, WebhookVerificationError } from "@/server/orders";

/** Stripe webhook endpoint. The raw body is required for signature checks. */
export async function POST(request: Request) {
  const body = await request.text();
  try {
    const result = await receiveWebhook("stripe", body, request.headers);
    return Response.json({ received: true, duplicate: result.duplicate, outcome: result.outcome });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return Response.json({ error: "invalid_signature" }, { status: 400 });
    }
    console.error("[webhook:stripe] processing failed", error);
    // A 5xx makes Stripe retry; idempotency makes the retry safe.
    return Response.json({ error: "processing_failed" }, { status: 500 });
  }
}
