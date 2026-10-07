import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MediaImage } from "@/components/MediaImage";
import { DownloadButton } from "@/components/product/DownloadButton";
import { PromptViewer } from "@/components/product/PromptViewer";
import { getLibraryState } from "@/server/access";
import { getProductSummariesByIds } from "@/server/catalogue/queries";
import { requireUser } from "@/server/session";
import { ListSkeleton } from "./ListSkeleton";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Library />
    </Suspense>
  );
}

async function Library() {
  const user = await requireUser("/account");
  const state = await getLibraryState(user.id);
  const products = await getProductSummariesByIds(state.productIds);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-muted">Products you have bought or collected. Downloads always serve the latest version.</p>
        </div>
      </div>

      {state.allAccess && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-mint/30 bg-mint/[0.06] px-5 py-4">
          <p className="text-sm">
            <span className="font-medium text-mint">All-access is active.</span>{" "}
            <span className="text-paper-dim">Every product in the catalogue is unlocked for you, including new releases.</span>
          </p>
          <Link href="/catalogue" className="btn btn-secondary btn-sm">
            Browse everything
          </Link>
        </div>
      )}

      {products.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
          <p className="font-medium">Your library is empty.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Buy a product, or copy a prompt or download from any free product while signed in, and it will appear here.
          </p>
          <Link href="/catalogue" className="btn btn-primary btn-sm mt-6">
            Explore the catalogue
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {products.map((p) => (
            <li key={p.id} className="grid gap-4 p-4 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
              <Link href={`/products/${p.slug}`} aria-hidden tabIndex={-1} className="block overflow-hidden rounded-lg border border-line">
                {p.poster ? (
                  <MediaImage media={p.poster} sizes="144px" className="aspect-[16/10] w-full object-cover object-top" alt="" />
                ) : (
                  <div className="aspect-[16/10] bg-graphite-850" />
                )}
              </Link>
              <div className="min-w-0">
                <Link href={`/products/${p.slug}`} className="font-medium hover:text-mint">
                  {p.title}
                </Link>
                <p className="mt-0.5 text-sm text-muted">
                  {p.category.name} · {p.priceCents === 0 ? "Free" : "Purchased"}
                  {!p.hasSource && p.hasPrompt ? " · Prompt only" : ""}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:w-56">
                {p.hasPrompt && <PromptViewer slug={p.slug} label="Copy prompt" className="btn btn-primary btn-sm w-full" />}
                {p.hasSource && <DownloadButton slug={p.slug} label="Download ZIP" className="btn btn-secondary btn-sm w-full" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
