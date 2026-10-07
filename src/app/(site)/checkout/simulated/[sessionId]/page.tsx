import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatPrice } from "@/lib/money";
import { simulateOutcomeAction } from "@/server/actions/simulated-checkout";
import { isNonProduction } from "@/server/env";
import { getOrderBySession } from "@/server/orders";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Simulated checkout", robots: { index: false } };

export default function SimulatedCheckoutPage({ params }: PageProps<"/checkout/simulated/[sessionId]">) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-14">
      <Suspense fallback={<div className="h-96 rounded-2xl skeleton" />}>
        <SimulatedCheckout params={params} />
      </Suspense>
    </div>
  );
}

async function SimulatedCheckout({ params }: Pick<PageProps<"/checkout/simulated/[sessionId]">, "params">) {
  if (!isNonProduction()) notFound();
  const { sessionId } = await params;
  const user = await requireUser(`/checkout/simulated/${sessionId}`);
  const order = await getOrderBySession(sessionId);
  if (!order || order.userId !== user.id || order.provider !== "simulated") notFound();

  const pay = simulateOutcomeAction.bind(null, sessionId, "pay");
  const delayed = simulateOutcomeAction.bind(null, sessionId, "pay_delayed");
  const decline = simulateOutcomeAction.bind(null, sessionId, "decline");

  return (
    <div className="overflow-hidden rounded-2xl border border-warning/40 bg-graphite-900">
      <div className="border-b border-warning/30 bg-warning/10 px-5 py-3">
        <p className="font-mono text-xs uppercase tracking-wider text-warning">Simulated payment provider · development only</p>
        <p className="mt-1 text-sm text-paper-dim">No money moves and no card details are collected. Configure Stripe test mode for a real provider flow.</p>
      </div>
      <div className="p-5">
        <h1 className="text-xl font-semibold tracking-tight">Checkout</h1>
        <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-4 py-3">
              <span>{item.title}</span>
              <span className="font-mono">{formatPrice(item.unitPriceCents, order.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between text-sm">
          <span className="text-muted">Total</span>
          <span className="font-mono font-medium">{formatPrice(order.totalCents, order.currency)}</span>
        </p>

        {order.status !== "pending" ? (
          <div className="mt-6">
            <p className="text-sm text-muted">This checkout session is closed (order status: {order.status}).</p>
            <Link href="/account/orders" className="btn btn-secondary btn-sm mt-4">
              View orders
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-2.5">
            <form action={pay}>
              <button type="submit" className="btn btn-primary w-full">
                Pay {formatPrice(order.totalCents, order.currency)} (simulate success)
              </button>
            </form>
            <form action={delayed}>
              <button type="submit" className="btn btn-secondary w-full">
                Simulate delayed payment (stays pending)
              </button>
            </form>
            <form action={decline}>
              <button type="submit" className="btn btn-danger w-full">
                Simulate declined payment
              </button>
            </form>
            <Link href={`/checkout/cancelled?order=${order.id}`} className="btn btn-ghost w-full">
              Cancel and return to the store
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
