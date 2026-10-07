import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FavouriteButton } from "@/components/product/FavouriteButton";
import { ProductCard } from "@/components/ProductCard";
import { cachedStoreSettings } from "@/server/catalogue/cached";
import { getProductSummariesByIds } from "@/server/catalogue/queries";
import { listFavouriteIds } from "@/server/favourites";
import { requireUser } from "@/server/session";
import { ListSkeleton } from "../ListSkeleton";

export const metadata: Metadata = { title: "Favourites" };

export default function FavouritesPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Favourites />
    </Suspense>
  );
}

async function Favourites() {
  const user = await requireUser("/account/favourites");
  const [ids, settings] = await Promise.all([listFavouriteIds(user.id), cachedStoreSettings()]);
  const products = await getProductSummariesByIds(ids);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Favourites</h1>
      <p className="mt-1 text-muted">Products you have saved for later.</p>
      {products.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
          <p className="font-medium">No favourites yet.</p>
          <p className="mt-2 text-sm text-muted">Use “Add to favourites” on any product page to save it here.</p>
          <Link href="/catalogue" className="btn btn-primary btn-sm mt-6">
            Explore the catalogue
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="relative">
              <ProductCard product={p} currency={settings.currency} headingLevel="h2" />
              <div className="relative z-10 mt-2">
                <FavouriteButton productId={p.id} initial signedIn returnTo="/account/favourites" compact />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
