import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatPrice } from "@/lib/money";
import { isNonProduction } from "@/server/env";
import { getOrderForUser } from "@/server/orders";
import { requireUser } from "@/server/session";
import { DelayedPaymentControls, StatusPoller } from "./StatusPoller";

export const metadata: Metadata = { title: "Order status", robots: { index: false } };

export default function CheckoutSuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <Suspense fallback={<div className="h-72 rounded-2xl skeleton" />}>
        <OrderStatus searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OrderStatus({ searchParams }: Pick<PageProps<"/checkout/success">, "searchParams">) {
  const params = await searchParams;
  const orderId = typeof params.order === "string" ? params.order : "";
  const user = await requireUser(`/checkout/success?order=${encodeURIComponent(orderId)}`);
  const order = /^ord_[A-Za-z0-9_-]{8,40}$/.test(orderId) ? await getOrderForUser(user.id, orderId) : null;

  if (!order) {
    return (
      <div className="rounded-2xl border border-line p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Order not found</h1>
        <p className="mt-2 text-muted">We couldn&rsquo;t find that order on your account.</p>
        <Link href="/account/orders" className="btn btn-secondary btn-sm mt-6">
          View your orders
        </Link>
      </div>
    );
  }

  const first = order.items[0];
  const destination = first?.productSlug ? `/products/${first.productSlug}` : "/account";

  return (
    <div className="rounded-2xl border border-line bg-graphite-900 p-8">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">Order {order.id}</p>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.status === "paid" && (
        <>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Payment confirmed.</h1>
          <p className="mt-2 text-muted">
            {order.kind === "all_access"
              ? "All-access is now active on your account. Every product is unlocked."
              : `${first?.title ?? "Your product"} is now in your library.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={order.kind === "all_access" ? "/catalogue" : destination} className="btn btn-primary">
              {order.kind === "all_access" ? "Browse the catalogue" : "Open product"}
            </Link>
            <Link href="/account" className="btn btn-secondary">
              Go to library
            </Link>
          </div>
        </>
      )}

      {order.status === "pending" && (
        <>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Confirming your payment…</h1>
          <p className="mt-2 text-muted">
            {order.statusReason === "awaiting_payment"
              ? "Your payment method takes a little longer to clear. We'll unlock the product as soon as the payment provider confirms it."
              : "We're waiting for the payment provider to confirm your payment. This usually takes a few seconds."}
          </p>
          <StatusPoller active />
          {isNonProduction() && order.provider === "simulated" && order.statusReason === "awaiting_payment" && (
            <DelayedPaymentControls orderId={order.id} />
          )}
        </>
      )}

      {(order.status === "failed" || order.status === "expired" || order.status === "cancelled") && (
        <>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {order.status === "failed" ? "The payment didn't go through." : "Checkout wasn't completed."}
          </h1>
          <p className="mt-2 text-muted">You have not been charged and nothing was unlocked. You can try again at any time.</p>
          <Link href={destination === "/account" ? "/all-access" : destination} className="btn btn-primary mt-6">
            Try again
          </Link>
        </>
      )}

      {order.status === "refunded" && (
        <>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">This order was refunded.</h1>
          <p className="mt-2 text-muted">Access granted by this order has been removed.</p>
        </>
      )}

      <dl className="mt-8 divide-y divide-line border-t border-line text-sm">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between gap-4 py-3">
            <dt>{item.title}</dt>
            <dd className="font-mono">{formatPrice(item.unitPriceCents, order.currency)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
