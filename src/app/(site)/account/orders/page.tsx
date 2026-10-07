import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDateTime } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { listOrdersForUser } from "@/server/orders";
import { requireUser } from "@/server/session";
import { ListSkeleton } from "../ListSkeleton";

export const metadata: Metadata = { title: "Orders" };

const NOTES: Record<string, string> = {
  pending: "Waiting for the payment provider to confirm. Nothing is unlocked until then.",
  failed: "The payment did not go through. You were not charged.",
  cancelled: "Checkout was cancelled. You were not charged.",
  expired: "The checkout session expired before payment. You were not charged.",
  refunded: "Refunded. Access granted by this order has been removed.",
};

export default function OrdersPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Orders />
    </Suspense>
  );
}

async function Orders() {
  const user = await requireUser("/account/orders");
  const orders = await listOrdersForUser(user.id);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
      <p className="mt-1 text-muted">Every checkout you have started, with its payment status.</p>
      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
          <p className="font-medium">No orders yet.</p>
          <Link href="/catalogue" className="btn btn-primary btn-sm mt-6">
            Explore the catalogue
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {orders.map((o) => (
            <li key={o.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="font-medium">
                  {o.items.map((i, idx) => (
                    <span key={idx}>
                      {idx > 0 && ", "}
                      {i.productSlug ? (
                        <Link href={`/products/${i.productSlug}`} className="hover:text-mint">
                          {i.title}
                        </Link>
                      ) : (
                        i.title
                      )}
                    </span>
                  ))}
                </p>
                <p className="mt-0.5 font-mono text-xs text-subtle">
                  {formatDateTime(o.createdAt)} · {o.id}
                  {o.provider === "simulated" ? " · simulated payment" : ""}
                </p>
                {NOTES[o.status] && <p className="mt-1.5 text-sm text-muted">{NOTES[o.status]}</p>}
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                <span className="font-mono text-sm">{formatPrice(o.totalCents, o.currency)}</span>
                <OrderStatusBadge status={o.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
