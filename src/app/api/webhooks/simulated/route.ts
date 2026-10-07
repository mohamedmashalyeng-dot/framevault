import { isNonProduction } from "@/server/env";
import { receiveWebhook, WebhookVerificationError } from "@/server/orders";

/**
 * SIMULATED provider webhook (development and test only). Events are signed
 * with SIMULATED_WEBHOOK_SECRET and processed by the same pipeline as Stripe.
 */
export async function POST(request: Request) {
  if (!isNonProduction()) return new Response("Not found", { status: 404 });
  const body = await request.text();
  try {
    const result = await receiveWebhook("simulated", body, request.headers);
    return Response.json({ received: true, duplicate: result.duplicate, outcome: result.outcome, status: result.status });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return Response.json({ error: "invalid_signature" }, { status: 400 });
    }
    console.error("[webhook:simulated] processing failed", error);
    return Response.json({ error: "processing_failed" }, { status: 500 });
  }
}
