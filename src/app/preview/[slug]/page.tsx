import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatPrice } from "@/lib/money";
import { cachedProductDetail, cachedStoreSettings } from "@/server/catalogue/cached";
import { demoUrlFor } from "@/server/demo-url";
import { FullPreview } from "./FullPreview";

export async function generateMetadata({ params }: PageProps<"/preview/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await cachedProductDetail(slug);
  return {
    title: product ? `${product.title} live demo` : "Demo not found",
    robots: { index: false },
    alternates: product ? { canonical: `/products/${product.slug}` } : undefined,
  };
}

export default function PreviewPage({ params }: PageProps<"/preview/[slug]">) {
  return (
    <Suspense fallback={<div className="h-dvh skeleton" aria-label="Loading demo" />}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: Pick<PageProps<"/preview/[slug]">, "params">) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([cachedProductDetail(slug), cachedStoreSettings()]);
  const demoUrl = demoUrlFor(product?.version?.demoKey);
  if (!product || !demoUrl) notFound();
  return (
    <FullPreview
      title={product.title}
      slug={product.slug}
      demoUrl={demoUrl}
      price={product.priceCents === 0 ? "Get it free" : `Buy · ${formatPrice(product.priceCents, settings.currency)}`}
    />
  );
}
