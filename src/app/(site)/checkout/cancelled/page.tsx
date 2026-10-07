import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CancelOrder } from "./CancelOrder";

export const metadata: Metadata = { title: "Checkout cancelled", robots: { index: false } };

export default function CheckoutCancelledPage({ searchParams }: PageProps<"/checkout/cancelled">) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <div className="rounded-2xl border border-line bg-graphite-900 p-8">
        <Suspense fallback={<div className="h-40 rounded-xl skeleton" />}>
          <Cancelled searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Cancelled({ searchParams }: Pick<PageProps<"/checkout/cancelled">, "searchParams">) {
  const params = await searchParams;
  const orderId = typeof params.order === "string" ? params.order : null;
  const declined = params.reason === "declined";
  return (
    <>
      <p className="eyebrow">{declined ? "Payment declined" : "Checkout cancelled"}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {declined ? "Your payment was declined." : "No problem — nothing was charged."}
      </h1>
      <p className="mt-2 text-muted">
        {declined
          ? "The payment provider declined the payment, so you have not been charged and nothing was unlocked."
          : "You left checkout before paying. The product is still available whenever you're ready."}
      </p>
      {orderId && !declined && <CancelOrder orderId={orderId} />}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/catalogue" className="btn btn-primary">
          Back to the catalogue
        </Link>
        <Link href="/account/orders" className="btn btn-secondary">
          View orders
        </Link>
      </div>
    </>
  );
}
