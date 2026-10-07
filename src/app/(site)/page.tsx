import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import { MediaImage, PosterPlaceholder } from "@/components/MediaImage";
import { PriceTag, ProductCard } from "@/components/ProductCard";
import { BRAND } from "@/config/brand";
import { formatPrice } from "@/lib/money";
import { cachedFacets, cachedFeatured, cachedRecent, cachedStoreSettings } from "@/server/catalogue/cached";
import type { ProductSummary } from "@/server/catalogue/queries";

const FAQ = [
  {
    q: "What exactly do I get when I buy a product?",
    a: "Each product page lists its deliverables precisely. Code products include a versioned ZIP with the full source, configuration, a README with install and run steps, a licence file and an environment example where one is needed. Products with a prompt include the full prompt text, which you can copy from your library. Prompt-only products are clearly labelled and do not include source files.",
  },
  {
    q: "Can I try a product before buying it?",
    a: "Yes. Every product has a live, interactive preview that runs in an isolated sandbox. You can switch between desktop, tablet and mobile widths or open the demo in a new tab.",
  },
  {
    q: "How do downloads work?",
    a: "After purchase, the product appears in your library. Downloads use short-lived links that are created for your account when you click, so you always get the current version.",
  },
  {
    q: "Can I use products in client work?",
    a: "Yes. The standard licence covers unlimited personal and commercial projects, including work for clients. You may not resell or redistribute the source files or prompts themselves. See the licence page for the full terms.",
  },
  {
    q: "Do free products need an account?",
    a: "No. You can copy free prompts and download free source code straight away. If you are signed in, free products are also saved to your library.",
  },
  {
    q: "What if a payment fails or I change my mind at checkout?",
    a: "Nothing is unlocked until the payment provider confirms the payment. If you cancel or the payment fails, you are not charged and you can try again at any time.",
  },
];

export default async function HomePage() {
  const [featured, recent, facets, settings] = await Promise.all([
    cachedFeatured(5),
    cachedRecent(6),
    cachedFacets(),
    cachedStoreSettings(),
  ]);
  const currency = settings.currency;
  const [lead, ...rest] = featured;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:pb-20">
          <div className="animate-fade-up">
            <p className="eyebrow">Templates · Components · Sections · AI prompts</p>
            <h1 className="mt-5 max-w-3xl text-display font-semibold">
              Interfaces that look <span className="text-mint">finished</span> on day one.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Preview every product live, buy only what you need, then copy its prompt or download versioned source code.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/catalogue" className="btn btn-primary">
                Explore templates <ArrowRight />
              </Link>
              <Link href="#how-it-works" className="btn btn-ghost">
                How it works
              </Link>
            </div>
          </div>
          {lead && <LeadFeature product={lead} currency={currency} />}
        </div>
      </section>

      {/* Category shortcuts */}
      <section aria-labelledby="categories-title" className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="categories-title" className="sr-only">
            Browse by category
          </h2>
          <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-0">
            {facets.categories.map((c) => (
              <li key={c.slug} className="border-b border-line lg:border-b-0 lg:border-r lg:last:border-r-0 lg:first:[&>a]:pl-0">
                <Link
                  href={`/catalogue?category=${c.slug}`}
                  className="group flex h-full items-center justify-between gap-3 py-6 transition-colors hover:text-mint lg:px-5"
                >
                  <span>
                    <span className="block font-medium tracking-tight">{c.name}</span>
                    <span className="mt-1 block font-mono text-xs text-subtle">
                      {c.count} {c.count === 1 ? "product" : "products"}
                    </span>
                  </span>
                  <ArrowUpRight className="shrink-0 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-mint" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Featured */}
      {rest.length > 0 && (
        <section aria-labelledby="featured-title" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <SectionHeading id="featured-title" eyebrow="Featured" title="Hand-picked this month" href="/catalogue" linkLabel="View all" />
          <div className="mt-10 grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <ProductCard key={p.id} product={p} currency={currency} />
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="how-title" className="border-y border-line bg-graphite-900/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="mt-3 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            Preview, purchase, then copy or download.
          </h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
            {[
              ["01", "Preview it live", "Open the interactive demo in a sandbox, switch device widths and read exactly what is included before you pay."],
              ["02", "Purchase once", "Checkout is handled by the payment provider. Access unlocks only after the payment is confirmed."],
              ["03", "Copy and download", "Copy the prompt into your AI tool or download the versioned source ZIP from your library, whenever you need it."],
            ].map(([n, title, body]) => (
              <li key={n} className="bg-graphite-950 p-7 md:p-8">
                <span className="font-mono text-sm text-mint">{n}</span>
                <h3 className="mt-6 text-lg font-medium tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Recently added */}
      {recent.length > 0 && (
        <section aria-labelledby="recent-title" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <SectionHeading
            id="recent-title"
            eyebrow="Recently added"
            title="New in the catalogue"
            href="/catalogue?sort=newest"
            linkLabel="Browse newest"
          />
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {recent.map((p) => (
              <RecentRow key={p.id} product={p} currency={currency} />
            ))}
          </ul>
        </section>
      )}

      {/* All-access */}
      {settings.allAccess.enabled && (
        <section aria-labelledby="all-access-title" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 md:pb-20">
          <div className="flex flex-col gap-6 rounded-2xl border border-line bg-graphite-900 p-7 md:flex-row md:items-center md:justify-between md:p-10">
            <div>
              <p className="eyebrow">One-time purchase</p>
              <h2 id="all-access-title" className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                All-access: every product, including future releases.
              </h2>
              <p className="mt-2 max-w-xl text-muted">
                One payment of {formatPrice(settings.allAccess.priceCents, currency)} unlocks every prompt and download in the store.
                {settings.demoPricing && " (Demo pricing.)"}
              </p>
            </div>
            <Link href="/all-access" className="btn btn-secondary shrink-0">
              See what&rsquo;s included <ArrowRight />
            </Link>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-title" className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-title" className="mt-3 text-3xl font-semibold tracking-tight">
              Questions, answered.
            </h2>
            <p className="mt-3 text-muted">
              Anything else? Email{" "}
              <a href={`mailto:${BRAND.supportEmail}`} className="text-paper underline decoration-line-strong underline-offset-4">
                {BRAND.supportEmail}
              </a>
              .
            </p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden className="font-mono text-lg text-subtle transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  id: string;
  eyebrow: string;
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          {title}
        </h2>
      </div>
      <Link href={href} className="group inline-flex items-center gap-1.5 text-sm text-paper-dim hover:text-paper">
        {linkLabel} <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function LeadFeature({ product, currency }: { product: ProductSummary; currency: string }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-line bg-graphite-900 transition-colors hover:border-line-strong"
    >
      {product.poster ? (
        <MediaImage
          media={product.poster}
          priority
          sizes="(min-width: 1024px) 560px, 92vw"
          className="aspect-[16/10] w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
        />
      ) : (
        <PosterPlaceholder title={product.title} />
      )}
      <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow">Featured · {product.category.name}</p>
          <p className="mt-1.5 truncate font-medium tracking-tight">{product.title}</p>
        </div>
        <PriceTag cents={product.priceCents} currency={currency} className="shrink-0" />
      </div>
    </Link>
  );
}

function RecentRow({ product, currency }: { product: ProductSummary; currency: string }) {
  return (
    <li>
      <Link
        href={`/products/${product.slug}`}
        className="group grid grid-cols-[5.5rem_1fr_auto] items-center gap-4 py-4 transition-colors hover:bg-white/[0.02] sm:grid-cols-[7.5rem_1fr_auto_auto] sm:gap-6"
      >
        <div className="overflow-hidden rounded-md border border-line">
          {product.poster ? (
            <MediaImage media={product.poster} sizes="120px" className="aspect-[16/10] w-full object-cover object-top" alt="" />
          ) : (
            <div className="aspect-[16/10] bg-graphite-850" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium tracking-tight group-hover:text-mint">{product.title}</p>
          <p className="mt-0.5 truncate text-sm text-muted">{product.tagline}</p>
        </div>
        <span className="hidden text-sm text-subtle sm:block">{product.category.name}</span>
        <PriceTag cents={product.priceCents} currency={currency} />
      </Link>
    </li>
  );
}
