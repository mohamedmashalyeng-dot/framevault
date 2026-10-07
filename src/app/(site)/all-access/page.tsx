import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Check } from "@/components/icons";
import { BuyButton } from "@/components/product/BuyButton";
import { formatPrice } from "@/lib/money";
import { hasAllAccess } from "@/server/access";
import { cachedFacets } from "@/server/catalogue/cached";
import { getStoreSettings } from "@/server/settings";
import { getSessionUser } from "@/server/session";

export const metadata: Metadata = {
  title: "All-access",
  description: "One payment unlocks every prompt and source download in the store, including future releases.",
  alternates: { canonical: "/all-access" },
};

export default async function AllAccessPage() {
  const facets = await cachedFacets();
  const total = facets.categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-24">
      <p className="eyebrow">All-access</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">Everything in the store, one payment.</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Unlock every prompt and every source download, including products added after you buy. No subscription.
      </p>

      <div className="mt-12 grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <ul className="space-y-4">
          {[
            `All ${total} published products today, across ${facets.categories.filter((c) => c.count > 0).length} categories`,
            "Every product added in the future, at no extra cost",
            "Copy every prompt and download every source ZIP from your library",
            "The same standard licence as individual purchases",
            "Access unlocks automatically once the payment is confirmed",
          ].map((line) => (
            <li key={line} className="flex gap-3">
              <Check size={18} className="mt-0.5 shrink-0 text-mint" />
              <span className="text-paper-dim">{line}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl border border-line bg-graphite-900 p-6">
          <Suspense fallback={<div className="h-40 rounded-xl skeleton" />}>
            <Offer />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/** Live price and availability, so the offer never lags behind admin changes. */
async function Offer() {
  await connection();
  const settings = await getStoreSettings();
  const price = formatPrice(settings.allAccess.priceCents, settings.currency);
  if (!settings.allAccess.enabled) {
    return (
      <>
        <p className="font-medium">All-access is not offered right now.</p>
        <p className="mt-2 text-sm text-muted">You can still buy products individually from the catalogue.</p>
        <Link href="/catalogue" className="btn btn-secondary mt-6 w-full">
          Browse the catalogue
        </Link>
      </>
    );
  }
  return (
    <>
      <div className="flex items-baseline justify-between">
        <p className="text-4xl font-semibold tracking-tight">{price}</p>
        {settings.demoPricing && (
          <span className="rounded-full border border-warning/40 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-warning">
            Demo pricing
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">One-time payment</p>
      <div className="mt-6">
        <AllAccessAction price={price} />
      </div>
    </>
  );
}

async function AllAccessAction({ price }: { price: string }) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <Link href="/sign-in?next=%2Fall-access" className="btn btn-primary w-full">
        Sign in to buy · {price}
      </Link>
    );
  }
  if (await hasAllAccess(user.id)) {
    return (
      <div>
        <p className="rounded-lg bg-mint/10 px-3 py-2 text-sm text-mint">Your all-access pass is active.</p>
        <Link href="/account" className="btn btn-secondary mt-3 w-full">
          Go to your library
        </Link>
      </div>
    );
  }
  return <BuyButton target={{ type: "all_access" }} label={`Get all-access · ${price}`} />;
}
