import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Check, FileCode, Sparkle } from "@/components/icons";
import { Gallery } from "@/components/product/Gallery";
import { PreviewFrame } from "@/components/product/PreviewFrame";
import { ProductCard } from "@/components/ProductCard";
import { formatBytes, formatDate } from "@/lib/format";
import { ogImageUrl } from "@/lib/media";
import { cachedProductDetail, cachedRelated, cachedStoreSettings } from "@/server/catalogue/cached";
import type { ProductDetail } from "@/server/catalogue/queries";
import { demoUrlFor } from "@/server/demo-url";
import { PurchasePanel, PurchasePanelSkeleton } from "./PurchasePanel";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await cachedProductDetail(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const title = product.title;
  const description = product.tagline || product.description.slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    robots: product.status === "archived" ? { index: false } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/products/${product.slug}`,
      images: product.poster ? [{ url: ogImageUrl(product.poster.key), width: 1200, height: 630, alt: product.poster.alt }] : undefined,
    },
  };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductView params={params} />
    </Suspense>
  );
}

async function ProductView({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([cachedProductDetail(slug), cachedStoreSettings()]);
  if (!product) notFound();
  const version = product.version;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/catalogue" className="hover:text-paper">
              Catalogue
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/catalogue?category=${product.category.slug}`} className="hover:text-paper">
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-paper-dim">
            {product.title}
          </li>
        </ol>
      </nav>

      {/* Mobile order: header, preview, purchase panel, details. Desktop: panel in a sticky side column. */}
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-x-14">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <header>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{product.title}</h1>
            {product.tagline && <p className="mt-3 max-w-2xl text-lg text-muted">{product.tagline}</p>}
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Technologies and styles">
              {product.technologies.map((t) => (
                <li key={t.slug}>
                  <Link href={`/catalogue?tech=${t.slug}`} className="chip hover:border-line-strong hover:text-paper">
                    {t.name}
                  </Link>
                </li>
              ))}
              {product.styles.map((s) => (
                <li key={s.slug}>
                  <Link href={`/catalogue?style=${s.slug}`} className="chip border-dashed hover:border-line-strong hover:text-paper">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </header>

          <div className="mt-8">
            <PreviewFrame title={product.title} slug={product.slug} demoUrl={demoUrlFor(version?.demoKey)} poster={product.poster} />
          </div>
        </div>

        <aside
          className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
          aria-label="Purchase and access"
        >
          <PurchaseColumn product={product} />
        </aside>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          {product.screenshots.length > 0 && (
            <section aria-labelledby="screens-title">
              <h2 id="screens-title" className="text-lg font-medium tracking-tight">
                Screenshots
              </h2>
              <div className="mt-4">
                <Gallery images={product.screenshots} />
              </div>
            </section>
          )}

          <section aria-labelledby="about-title" className="mt-12">
            <h2 id="about-title" className="text-lg font-medium tracking-tight">
              About this product
            </h2>
            <div className="prose-store mt-4 max-w-3xl leading-relaxed text-paper-dim">
              {product.description.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          <WhatYouGet product={product} />
          <TechnicalDetails product={product} />
        </div>
      </div>

      <Suspense fallback={null}>
        <Related productId={product.id} currency={settings.currency} />
      </Suspense>
    </div>
  );
}

/** Purchase panel plus version, licence and category facts. */
function PurchaseColumn({ product }: { product: ProductDetail }) {
  const version = product.version;
  return (
    <>
      <Suspense fallback={<PurchasePanelSkeleton />}>
        <PurchasePanel product={product} />
      </Suspense>
      <dl className="mt-6 divide-y divide-line rounded-2xl border border-line text-sm">
        {[
          ["Version", version ? `v${version.version}` : "—"],
          ["Last updated", formatDate(version?.releasedAt ?? product.updatedAt)],
          ["Category", product.category.name],
          ["Licence", product.licenceType === "free" ? "Free licence" : "Standard licence"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 rounded-2xl border border-line p-4 text-sm">
        <h2 className="font-medium">Licence summary</h2>
        <p className="mt-2 leading-relaxed text-muted">{product.licenceSummary}</p>
        <Link href="/licence" className="mt-3 inline-block text-paper-dim underline decoration-line-strong underline-offset-4 hover:text-paper">
          Read the full licence
        </Link>
      </div>
    </>
  );
}

/** Lists only deliverables that actually exist on the current version. */
function WhatYouGet({ product }: { product: ProductDetail }) {
  const v = product.version;
  if (!v) return null;
  const m = v.archiveManifest;
  const items: { icon: "code" | "prompt" | "check"; title: string; detail?: string }[] = [];
  if (v.hasSource && m) {
    items.push({
      icon: "code",
      title: `Source code ZIP (${v.archiveFileName ?? "archive"})`,
      detail: `${m.fileCount} files${v.archiveSize ? `, ${formatBytes(v.archiveSize)}` : ""}. Top level: ${m.topLevel.join(", ")}`,
    });
    if (m.hasReadme) items.push({ icon: "check", title: "README with install, run and build instructions" });
    if (m.hasPackageJson) items.push({ icon: "check", title: "package.json with ready-to-run scripts" });
    if (m.hasEnvExample) items.push({ icon: "check", title: ".env.example documenting every environment variable" });
    if (m.hasLicence) items.push({ icon: "check", title: "LICENCE file with your usage rights" });
  }
  if (v.hasPrompt) {
    items.push({
      icon: "prompt",
      title: `AI prompt (${v.promptWords.toLocaleString("en-GB")} words)`,
      detail: v.hasSource ? "Recreate or adapt the product with your AI coding tool." : "Paste it into your AI coding tool to generate the result shown in the preview.",
    });
  }
  items.push({ icon: "check", title: "Free updates", detail: "Your access always serves the latest released version from your library." });

  return (
    <section aria-labelledby="included-title" className="mt-12">
      <h2 id="included-title" className="text-lg font-medium tracking-tight">
        What you get
      </h2>
      {!v.hasSource && (
        <p className="mt-3 rounded-xl border border-line bg-graphite-900 px-4 py-3 text-sm text-paper-dim">
          Prompt only: this product does not include downloadable source code.
        </p>
      )}
      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
        {items.map((item) => (
          <li key={item.title} className="flex gap-3.5 px-4 py-3.5">
            <span className="mt-0.5 text-mint">
              {item.icon === "code" ? <FileCode size={17} /> : item.icon === "prompt" ? <Sparkle size={17} /> : <Check size={17} />}
            </span>
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              {item.detail && <p className="mt-0.5 text-sm text-muted">{item.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TechnicalDetails({ product }: { product: ProductDetail }) {
  const v = product.version;
  if (!v) return null;
  const runtime = v.dependencies.filter((d) => !d.dev);
  const dev = v.dependencies.filter((d) => d.dev);

  return (
    <section aria-labelledby="tech-title" className="mt-12">
      <h2 id="tech-title" className="text-lg font-medium tracking-tight">
        Technology and setup
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line p-5">
          <h3 className="eyebrow">Technology</h3>
          <p className="mt-3 text-sm">{product.technologies.map((t) => t.name).join(", ") || "—"}</p>
          {v.technologyNotes && <p className="mt-2 text-sm leading-relaxed text-muted">{v.technologyNotes}</p>}
        </div>
        <div className="rounded-2xl border border-line p-5">
          <h3 className="eyebrow">Setup requirements</h3>
          <ul className="mt-3 space-y-1.5 text-sm">
            {v.requirements.length ? v.requirements.map((r) => <li key={r}>{r}</li>) : <li className="text-muted">None</li>}
          </ul>
        </div>
      </div>
      {v.hasSource && (
        <div className="mt-4 rounded-2xl border border-line p-5">
          <h3 className="eyebrow">Dependencies</h3>
          {v.dependencies.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No package dependencies. Runs as plain files in the browser.</p>
          ) : (
            <div className="mt-3 grid gap-6 sm:grid-cols-2">
              {[
                ["Runtime", runtime],
                ["Development", dev],
              ].map(([label, list]) =>
                (list as typeof runtime).length ? (
                  <div key={label as string}>
                    <p className="text-xs text-subtle">{label as string}</p>
                    <ul className="mt-2 space-y-1 font-mono text-[0.8rem]">
                      {(list as typeof runtime).map((d) => (
                        <li key={d.name} className="flex justify-between gap-4">
                          <span className="truncate text-paper-dim">{d.name}</span>
                          <span className="text-subtle">{d.version}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </div>
      )}
      {product.history.length > 0 && (
        <div className="mt-4 rounded-2xl border border-line p-5">
          <h3 className="eyebrow">Version history</h3>
          <ol className="mt-3 space-y-3 text-sm">
            {product.history.map((h) => (
              <li key={h.version} className="grid grid-cols-[5rem_1fr] gap-4">
                <span className="font-mono text-paper-dim">v{h.version}</span>
                <span>
                  <span className="text-muted">{h.releasedAt ? formatDate(h.releasedAt) : "Unreleased"}</span>
                  {h.changelog && <span className="mt-0.5 block text-paper-dim">{h.changelog}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

async function Related({ productId, currency }: { productId: string; currency: string }) {
  const related = await cachedRelated(productId);
  if (related.length === 0) return null;
  return (
    <section aria-labelledby="related-title" className="mt-20 border-t border-line pt-12">
      <h2 id="related-title" className="text-2xl font-semibold tracking-tight">
        You might also like
      </h2>
      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} currency={currency} />
        ))}
      </div>
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6" aria-busy="true" aria-label="Loading product">
      <div className="h-4 w-56 rounded skeleton" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="h-12 w-2/3 rounded skeleton" />
          <div className="mt-4 h-5 w-1/2 rounded skeleton" />
          <div className="mt-8 aspect-[16/10] w-full rounded-2xl skeleton" />
        </div>
        <PurchasePanelSkeleton />
      </div>
    </div>
  );
}
