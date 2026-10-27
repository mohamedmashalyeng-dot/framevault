"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { mediaFallback } from "@/lib/media";
import { formatPrice } from "@/lib/money";
import type { ProductSummary } from "@/server/catalogue/queries";
import { Close } from "../icons";
import { MediaImage, PosterPlaceholder } from "../MediaImage";
import { PremiumBadge } from "../PremiumBadge";
import { BuyButton } from "./BuyButton";
import { CopyPromptButton } from "./CopyPromptButton";

/**
 * Quick-view pop-up opened from a product card: a larger preview plus the
 * one action that matters, copying the prompt of a free product or buying a
 * premium one. Content mounts only while open, so closed cards load nothing.
 */
export function QuickView({
  product,
  currency,
  open,
  onClose,
}: {
  product: ProductSummary;
  currency: string;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const premium = product.priceCents > 0;
  const titleId = `quick-view-${product.id}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby={titleId}
      className="m-auto max-h-[92vh] w-[min(94vw,960px)] overflow-y-auto rounded-2xl border border-line-strong bg-graphite-900 p-0 text-paper backdrop:bg-black/75 [&:not([open])]:hidden"
    >
      {open && (
        <>
          <div className="relative bg-black">
            {product.video ? (
              <video
                src={product.video}
                poster={product.poster ? mediaFallback(product.poster) : undefined}
                autoPlay
                muted
                loop
                playsInline
                controls
                className="aspect-video w-full object-contain"
              />
            ) : product.poster ? (
              <MediaImage media={product.poster} sizes="(min-width: 1024px) 960px, 94vw" className="aspect-[16/10] w-full object-cover object-top" />
            ) : (
              <PosterPlaceholder title={product.title} />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-graphite-950/80 text-paper-dim backdrop-blur hover:text-paper"
            >
              <Close size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {premium ? (
                  <PremiumBadge />
                ) : (
                  <span className="font-mono font-medium uppercase tracking-wider text-mint">Free</span>
                )}
                <span>{product.category.name}</span>
              </p>
              <h2 id={titleId} className="mt-2 text-xl font-semibold tracking-tight">
                {product.title}
              </h2>
              {product.excerpt && <p className="mt-2 line-clamp-3 max-w-xl text-sm leading-relaxed text-muted">{product.excerpt}</p>}
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-64">
              {premium ? (
                <BuyButton target={{ type: "product", slug: product.slug }} label={`Buy now · ${formatPrice(product.priceCents, currency)}`} />
              ) : product.hasPrompt ? (
                <CopyPromptButton slug={product.slug} />
              ) : (
                <Link href={`/products/${product.slug}`} className="btn btn-primary w-full">
                  Get it free
                </Link>
              )}
              <Link href={`/products/${product.slug}`} className="btn btn-secondary w-full">
                View details
              </Link>
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}
