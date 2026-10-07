import Link from "next/link";
import { formatPrice } from "@/lib/money";
import type { ProductSummary } from "@/server/catalogue/queries";
import { MediaImage, PosterPlaceholder } from "./MediaImage";

export function PriceTag({ cents, currency, className = "" }: { cents: number; currency: string; className?: string }) {
  return cents === 0 ? (
    <span className={`font-mono text-xs font-medium uppercase tracking-wider text-mint ${className}`}>Free</span>
  ) : (
    <span className={`font-mono text-sm tabular-nums text-paper ${className}`}>{formatPrice(cents, currency)}</span>
  );
}

/** Lightweight catalogue card: poster, title, category, technology, price. */
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
  const Heading = headingLevel;
  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-xl border border-line bg-graphite-900 transition-colors duration-300 group-hover:border-line-strong">
        {product.poster ? (
          <MediaImage
            media={product.poster}
            sizes={sizes}
            priority={priority}
            className="aspect-[16/10] w-full object-cover object-top transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.025]"
          />
        ) : (
          <PosterPlaceholder title={product.title} />
        )}
        <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-line-strong bg-graphite-950/80 px-2.5 py-1 text-[0.7rem] text-paper-dim backdrop-blur">
          {product.category.name}
        </span>
        {!product.hasSource && product.hasPrompt && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-graphite-950/80 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-paper-dim backdrop-blur">
            Prompt only
          </span>
        )}
      </div>
      <div className="mt-3.5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Heading className="truncate text-[0.97rem] font-medium tracking-tight">
            <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
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
