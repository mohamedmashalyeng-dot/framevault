"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { mediaFallback } from "@/lib/media";
import { formatPrice } from "@/lib/money";
import type { ProductSummary } from "@/server/catalogue/queries";
import { MediaImage, PosterPlaceholder } from "./MediaImage";
import { PremiumBadge } from "./PremiumBadge";
import { QuickView } from "./product/QuickView";

export function PriceTag({ cents, currency, className = "" }: { cents: number; currency: string; className?: string }) {
  return cents === 0 ? (
    <span className={`font-mono text-xs font-medium uppercase tracking-wider text-mint ${className}`}>Free</span>
  ) : (
    <span className={`font-mono text-sm tabular-nums text-paper ${className}`}>{formatPrice(cents, currency)}</span>
  );
}

/**
 * Muted looping preview that only plays while it is on screen, so a grid of
 * cards never decodes more clips than the visitor can see. Visitors who ask
 * for reduced motion get the poster frame instead.
 */
function CardVideo({ src, poster, className }: { src: string; poster: string | undefined; className: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.muted = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload="none" aria-hidden tabIndex={-1} className={className} />;
}

/**
 * Catalogue card: preview clip (or poster), title, category, technology,
 * price. Clicking it opens a quick view; modified clicks and visitors
 * without JavaScript follow the link to the product page.
 */
export function ProductCard({
  product,
  currency,
  sizes = "(min-width: 1280px) 400px, (min-width: 768px) 45vw, 92vw",
  priority = false,
  headingLevel = "h3",
}: {
  product: ProductSummary;
  currency: string;
  sizes?: string;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const [open, setOpen] = useState(false);
  const Heading = headingLevel;
  const media = "aspect-[16/10] w-full object-cover object-top transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.025]";

  return (
    <>
      <article className="group relative flex flex-col">
        <div className="relative overflow-hidden rounded-xl border border-line bg-graphite-900 transition-colors duration-300 group-hover:border-line-strong">
          {product.video ? (
            <CardVideo src={product.video} poster={product.poster ? mediaFallback(product.poster) : undefined} className={media} />
          ) : product.poster ? (
            <MediaImage media={product.poster} sizes={sizes} priority={priority} className={media} />
          ) : (
            <PosterPlaceholder title={product.title} />
          )}
          <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-line-strong bg-graphite-950/80 px-2.5 py-1 text-[0.7rem] text-paper-dim backdrop-blur">
            {product.category.name}
          </span>
          <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-1.5">
            {product.priceCents > 0 && <PremiumBadge />}
            {!product.hasSource && product.hasPrompt && (
              <span className="rounded-full bg-graphite-950/80 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-paper-dim backdrop-blur">
                Prompt only
              </span>
            )}
          </div>
        </div>
        <div className="mt-3.5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Heading className="truncate text-[0.97rem] font-medium tracking-tight">
              <Link
                href={`/products/${product.slug}`}
                aria-haspopup="dialog"
                onClick={(e) => {
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  setOpen(true);
                }}
                className="after:absolute after:inset-0 focus-visible:outline-none"
              >
                {product.title}
              </Link>
            </Heading>
            <p className="mt-1 truncate text-sm text-muted">{product.technologies.join(" · ") || product.tagline}</p>
          </div>
          <PriceTag cents={product.priceCents} currency={currency} className="mt-0.5 shrink-0" />
        </div>
        {/* Keyboard focus ring for the whole card (the link covers it). */}
        <span className="pointer-events-none absolute -inset-1.5 rounded-2xl ring-mint group-has-[a:focus-visible]:ring-2" aria-hidden />
      </article>
      <QuickView product={product} currency={currency} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-[16/10] w-full rounded-xl" />
      <div className="mt-3.5 h-4 w-2/3 rounded skeleton" />
      <div className="mt-2 h-3.5 w-1/3 rounded skeleton" />
    </div>
  );
}
