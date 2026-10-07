import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Check, Close, Search } from "@/components/icons";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import {
  catalogueHref,
  hasActiveFilters,
  parseCatalogueParams,
  type CatalogueQuery,
} from "@/lib/catalogue-params";
import { cachedFacets, cachedSearch, cachedStoreSettings } from "@/server/catalogue/cached";
import type { CatalogueFacets } from "@/server/catalogue/queries";
import { SortSelect } from "./SortSelect";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Search and filter website templates, landing pages, components, sections, backgrounds and AI prompts.",
  alternates: { canonical: "/catalogue" },
};

export default function CataloguePage({ searchParams }: PageProps<"/catalogue">) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6 md:pt-14">
      <header className="max-w-2xl">
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Find your starting point</h1>
        <p className="mt-3 text-muted">Every product has a live preview. Filter by category, price, technology and visual style.</p>
      </header>
      <Suspense fallback={<CatalogueSkeleton />}>
        <CatalogueResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CatalogueResults({ searchParams }: Pick<PageProps<"/catalogue">, "searchParams">) {
  const query = parseCatalogueParams(await searchParams);
  const [result, facets, settings] = await Promise.all([cachedSearch(query), cachedFacets(), cachedStoreSettings()]);
  const activeCount = [query.category, query.price, ...query.tech, ...query.style].filter(Boolean).length;

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr]">
      {/* Filters: always visible on large screens, collapsible on small ones. */}
      <aside aria-label="Filters" className="lg:sticky lg:top-24 lg:self-start">
        <details className="group rounded-xl border border-line lg:border-0" open={false}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium lg:hidden [&::-webkit-details-marker]:hidden">
            Filters{activeCount > 0 && <span className="text-mint">{activeCount} active</span>}
            <span aria-hidden className="text-subtle transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="border-t border-line px-4 pb-4 lg:hidden">
            <FilterPanel query={query} facets={facets} />
          </div>
        </details>
        <div className="hidden lg:block">
          <FilterPanel query={query} facets={facets} />
        </div>
      </aside>

      <section aria-labelledby="results-heading" className="min-w-0">
        <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
          <SearchField query={query} />
          <SortSelect query={query} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <h2 id="results-heading" className="mr-2 text-sm text-muted" aria-live="polite">
            {result.total === 0 ? "No products" : `${result.total} ${result.total === 1 ? "product" : "products"}`}
            {query.q && (
              <>
                {" "}
                for <span className="text-paper">&ldquo;{query.q}&rdquo;</span>
              </>
            )}
          </h2>
          <ActiveFilters query={query} facets={facets} />
        </div>

        {result.items.length === 0 ? (
          <EmptyState query={query} facets={facets} />
        ) : (
          <>
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  currency={settings.currency}
                  priority={i < 3}
                  headingLevel="h3"
                  sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 92vw"
                />
              ))}
            </div>
            <Pagination query={query} page={result.page} pageCount={result.pageCount} />
          </>
        )}
      </section>
    </div>
  );
}

function SearchField({ query }: { query: CatalogueQuery }) {
  return (
    <Form action="/catalogue" role="search" className="relative w-full sm:max-w-sm">
      {query.category && <input type="hidden" name="category" value={query.category} />}
      {query.price && <input type="hidden" name="price" value={query.price} />}
      {query.tech.length > 0 && <input type="hidden" name="tech" value={query.tech.join(",")} />}
      {query.style.length > 0 && <input type="hidden" name="style" value={query.style.join(",")} />}
      {query.sort !== "newest" && <input type="hidden" name="sort" value={query.sort} />}
      <label htmlFor="catalogue-q" className="sr-only">
        Search by title, description or tag
      </label>
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
      <input
        id="catalogue-q"
        name="q"
        type="search"
        defaultValue={query.q}
        maxLength={80}
        placeholder="Search title, description or tag"
        className="field rounded-full pl-10"
      />
    </Form>
  );
}

type Option = { key: string; label: string; count?: number; active: boolean; href: string };

function FilterGroup({ title, options, multi }: { title: string; options: Option[]; multi: boolean }) {
  if (options.length === 0) return null;
  return (
    <fieldset className="mt-6 first:mt-4 lg:first:mt-0">
      <legend className="eyebrow">{title}</legend>
      <ul className="mt-3 space-y-0.5">
        {options.map((o) => (
          <li key={o.key}>
            <Link
              href={o.href}
              scroll={false}
              aria-current={o.active ? "true" : undefined}
              className={`group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/[0.04] ${
                o.active ? "text-paper" : "text-paper-dim"
              }`}
            >
              <span
                aria-hidden
                className={`grid size-4 shrink-0 place-items-center border transition-colors ${multi ? "rounded" : "rounded-full"} ${
                  o.active ? "border-mint bg-mint text-mint-ink" : "border-line-strong group-hover:border-paper-dim"
                }`}
              >
                {o.active && <Check size={11} strokeWidth={3} />}
              </span>
              <span className="flex-1">{o.label}</span>
              {o.count !== undefined && <span className="font-mono text-xs text-subtle">{o.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterPanel({ query, facets }: { query: CatalogueQuery; facets: CatalogueFacets }) {
  const base = { ...query, page: 1 };
  return (
    <div>
      <FilterGroup
        title="Category"
        multi={false}
        options={[
          { key: "all", label: "All categories", active: !query.category, href: catalogueHref({ ...base, category: null }) },
          ...facets.categories.map((c) => ({
            key: c.slug,
            label: c.name,
            count: c.count,
            active: query.category === c.slug,
            href: catalogueHref({ ...base, category: query.category === c.slug ? null : c.slug }),
          })),
        ]}
      />
      <FilterGroup
        title="Price"
        multi={false}
        options={[
          { key: "any", label: "Any price", active: !query.price, href: catalogueHref({ ...base, price: null }) },
          { key: "free", label: "Free", active: query.price === "free", href: catalogueHref({ ...base, price: query.price === "free" ? null : "free" }) },
          { key: "paid", label: "Paid", active: query.price === "paid", href: catalogueHref({ ...base, price: query.price === "paid" ? null : "paid" }) },
        ]}
      />
      <FilterGroup
        title="Technology"
        multi
        options={facets.technologies.map((t) => ({
          key: t.slug,
          label: t.name,
          count: t.count,
          active: query.tech.includes(t.slug),
          href: catalogueHref({ ...base, tech: toggle(query.tech, t.slug) }),
        }))}
      />
      <FilterGroup
        title="Visual style"
        multi
        options={facets.styles.map((s) => ({
          key: s.slug,
          label: s.name,
          count: s.count,
          active: query.style.includes(s.slug),
          href: catalogueHref({ ...base, style: toggle(query.style, s.slug) }),
        }))}
      />
      {hasActiveFilters(query) && (
        <Link href="/catalogue" scroll={false} className="btn btn-ghost btn-sm mt-6 -ml-2">
          Clear all filters
        </Link>
      )}
    </div>
  );
}

function ActiveFilters({ query, facets }: { query: CatalogueQuery; facets: CatalogueFacets }) {
  const base = { ...query, page: 1 };
  const nameOf = (list: { slug: string; name: string }[], slug: string) => list.find((x) => x.slug === slug)?.name ?? slug;
  const chips: { label: string; href: string }[] = [];
  if (query.q) chips.push({ label: `“${query.q}”`, href: catalogueHref({ ...base, q: "" }) });
  if (query.category) chips.push({ label: nameOf(facets.categories, query.category), href: catalogueHref({ ...base, category: null }) });
  if (query.price) chips.push({ label: query.price === "free" ? "Free" : "Paid", href: catalogueHref({ ...base, price: null }) });
  for (const t of query.tech) chips.push({ label: nameOf(facets.technologies, t), href: catalogueHref({ ...base, tech: toggle(query.tech, t) }) });
  for (const s of query.style) chips.push({ label: nameOf(facets.styles, s), href: catalogueHref({ ...base, style: toggle(query.style, s) }) });
  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <li key={c.href + c.label}>
          <Link href={c.href} scroll={false} className="chip hover:border-line-strong hover:text-paper" aria-label={`Remove filter ${c.label}`}>
            {c.label} <Close size={12} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ query, facets }: { query: CatalogueQuery; facets: CatalogueFacets }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="text-lg font-medium">No products match {hasActiveFilters(query) ? "these filters" : "yet"}.</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {query.q
          ? "Try a shorter search or a different spelling, or remove a filter."
          : "Try removing a filter or browse a category below."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {hasActiveFilters(query) && (
          <Link href="/catalogue" className="btn btn-primary btn-sm">
            Clear all filters
          </Link>
        )}
        {facets.categories
          .filter((c) => c.count > 0 && c.slug !== query.category)
          .slice(0, 4)
          .map((c) => (
            <Link key={c.slug} href={catalogueHref({ category: c.slug })} className="btn btn-secondary btn-sm">
              {c.name}
            </Link>
          ))}
      </div>
    </div>
  );
}

function Pagination({ query, page, pageCount }: { query: CatalogueQuery; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const windowStart = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => windowStart + i);

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-between gap-4 border-t border-line pt-6">
      {page > 1 ? (
        <Link href={catalogueHref({ ...query, page: page - 1 })} className="btn btn-secondary btn-sm" rel="prev">
          Previous
        </Link>
      ) : (
        <span className="btn btn-secondary btn-sm" aria-disabled="true">
          Previous
        </span>
      )}
      <ul className="hidden items-center gap-1 sm:flex">
        {pages.map((n) => (
          <li key={n}>
            <Link
              href={catalogueHref({ ...query, page: n })}
              aria-current={n === page ? "page" : undefined}
              className={`grid size-9 place-items-center rounded-full font-mono text-sm ${
                n === page ? "bg-paper text-graphite-950" : "text-paper-dim hover:bg-white/[0.05]"
              }`}
            >
              {n}
            </Link>
          </li>
        ))}
      </ul>
      <span className="font-mono text-xs text-muted sm:hidden">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={catalogueHref({ ...query, page: page + 1 })} className="btn btn-secondary btn-sm" rel="next">
          Next
        </Link>
      ) : (
        <span className="btn btn-secondary btn-sm" aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  );
}

function CatalogueSkeleton() {
  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr]" aria-busy="true" aria-label="Loading catalogue">
      <div className="hidden space-y-3 lg:block">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-5 rounded skeleton" style={{ width: `${55 + ((i * 17) % 40)}%` }} />
        ))}
      </div>
      <div>
        <div className="h-11 max-w-sm rounded-full skeleton" />
        <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
