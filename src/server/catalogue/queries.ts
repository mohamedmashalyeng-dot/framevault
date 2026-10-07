import { and, asc, desc, eq, gt, inArray, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { category, product, productMedia, productTag, productVersion, tag } from "@/db/schema";
import type { CatalogueQuery } from "@/lib/catalogue-params";
import { PAGE_SIZE } from "@/lib/catalogue-params";
import type { MediaRef } from "@/lib/media";
import { toFtsQuery } from "./search-index";

/**
 * Public catalogue reads. Everything here is safe to cache and to send to any
 * visitor: protected fields (prompt text, archive keys) are never selected.
 */

export type ProductSummary = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  priceCents: number;
  category: { slug: string; name: string };
  technologies: string[];
  styles: string[];
  poster: MediaRef | null;
  hasSource: boolean;
  hasPrompt: boolean;
  publishedAt: string | null;
};

export type CataloguePage = {
  items: ProductSummary[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

const summaryColumns = {
  id: product.id,
  slug: product.slug,
  title: product.title,
  tagline: product.tagline,
  priceCents: product.priceCents,
  publishedAt: product.publishedAt,
  categorySlug: category.slug,
  categoryName: category.name,
  hasSource: sql<number>`(${productVersion.archiveKey} is not null)`,
  hasPrompt: sql<number>`(coalesce(${productVersion.promptWords}, 0) > 0)`,
};

type SummaryRow = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  priceCents: number;
  publishedAt: Date | null;
  categorySlug: string;
  categoryName: string;
  hasSource: number;
  hasPrompt: number;
};

function summaryQuery() {
  return getDb()
    .select(summaryColumns)
    .from(product)
    .innerJoin(category, eq(category.id, product.categoryId))
    .leftJoin(productVersion, eq(productVersion.id, product.currentVersionId));
}

/** Loads tags and posters for a page of products in two bounded queries. */
async function hydrate(rows: SummaryRow[]): Promise<ProductSummary[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const db = getDb();

  const [tagRows, posterRows] = await Promise.all([
    db
      .select({ productId: productTag.productId, kind: tag.kind, name: tag.name })
      .from(productTag)
      .innerJoin(tag, eq(tag.id, productTag.tagId))
      .where(and(inArray(productTag.productId, ids), inArray(tag.kind, ["technology", "style"])))
      .orderBy(asc(tag.name)),
    db
      .select()
      .from(productMedia)
      .where(and(inArray(productMedia.productId, ids), eq(productMedia.kind, "poster")))
      .orderBy(asc(productMedia.sortOrder)),
  ]);

  return rows.map((r) => {
    const poster = posterRows.find((m) => m.productId === r.id);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      tagline: r.tagline,
      priceCents: r.priceCents,
      category: { slug: r.categorySlug, name: r.categoryName },
      technologies: tagRows.filter((t) => t.productId === r.id && t.kind === "technology").map((t) => t.name),
      styles: tagRows.filter((t) => t.productId === r.id && t.kind === "style").map((t) => t.name),
      poster: poster
        ? { key: poster.storageKey, widths: poster.widths, width: poster.width, height: poster.height, alt: poster.alt }
        : null,
      hasSource: Boolean(r.hasSource),
      hasPrompt: Boolean(r.hasPrompt),
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    };
  });
}

function tagFilter(kind: "technology" | "style", slugs: string[]): SQL {
  return inArray(
    product.id,
    getDb()
      .select({ id: productTag.productId })
      .from(productTag)
      .innerJoin(tag, eq(tag.id, productTag.tagId))
      .where(and(eq(tag.kind, kind), inArray(tag.slug, slugs))),
  );
}

export async function searchCatalogue(query: CatalogueQuery): Promise<CataloguePage> {
  const db = getDb();
  const conditions: SQL[] = [eq(product.status, "published")];

  if (query.category) conditions.push(eq(category.slug, query.category));
  if (query.price === "free") conditions.push(eq(product.priceCents, 0));
  if (query.price === "paid") conditions.push(gt(product.priceCents, 0));
  if (query.tech.length) conditions.push(tagFilter("technology", query.tech));
  if (query.style.length) conditions.push(tagFilter("style", query.style));
  if (query.q) {
    const fts = toFtsQuery(query.q);
    if (!fts) return { items: [], total: 0, page: 1, pageCount: 0, pageSize: PAGE_SIZE };
    conditions.push(sql`${product.id} in (select product_id from product_search where product_search match ${fts})`);
  }

  const where = and(...conditions);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(product)
    .innerJoin(category, eq(category.id, product.categoryId))
    .where(where);

  const pageCount = Math.ceil(total / PAGE_SIZE);
  const page = Math.min(query.page, Math.max(pageCount, 1));

  const order =
    query.sort === "price-asc"
      ? [asc(product.priceCents), desc(product.publishedAt)]
      : query.sort === "price-desc"
        ? [desc(product.priceCents), desc(product.publishedAt)]
        : [desc(product.publishedAt), asc(product.title)];

  const rows = total
    ? await summaryQuery()
        .where(where)
        .orderBy(...order)
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE)
    : [];

  return { items: await hydrate(rows), total, page, pageCount, pageSize: PAGE_SIZE };
}

export async function getFeaturedProducts(limit = 6): Promise<ProductSummary[]> {
  const rows = await summaryQuery()
    .where(and(eq(product.status, "published"), eq(product.isFeatured, true)))
    .orderBy(asc(product.featuredRank), desc(product.publishedAt))
    .limit(limit);
  return hydrate(rows);
}

export async function getRecentProducts(limit = 6): Promise<ProductSummary[]> {
  const rows = await summaryQuery()
    .where(eq(product.status, "published"))
    .orderBy(desc(product.publishedAt))
    .limit(limit);
  return hydrate(rows);
}

export async function getProductSummariesByIds(ids: string[]): Promise<ProductSummary[]> {
  if (ids.length === 0) return [];
  const rows = await summaryQuery().where(inArray(product.id, ids.slice(0, 200)));
  const hydrated = await hydrate(rows);
  return ids.map((id) => hydrated.find((p) => p.id === id)).filter((p): p is ProductSummary => Boolean(p));
}

export type Facet = { slug: string; name: string; count: number };
export type CatalogueFacets = { categories: Facet[]; technologies: Facet[]; styles: Facet[] };

export async function getCatalogueFacets(): Promise<CatalogueFacets> {
  const db = getDb();
  const [categories, tags] = await Promise.all([
    db
      .select({
        slug: category.slug,
        name: category.name,
        count: sql<number>`count(${product.id})`,
      })
      .from(category)
      .leftJoin(product, and(eq(product.categoryId, category.id), eq(product.status, "published")))
      .groupBy(category.id)
      .orderBy(asc(category.sortOrder), asc(category.name)),
    db
      .select({ kind: tag.kind, slug: tag.slug, name: tag.name, count: sql<number>`count(${product.id})` })
      .from(tag)
      .innerJoin(productTag, eq(productTag.tagId, tag.id))
      .innerJoin(product, and(eq(product.id, productTag.productId), eq(product.status, "published")))
      .where(inArray(tag.kind, ["technology", "style"]))
      .groupBy(tag.id)
      .orderBy(asc(tag.name)),
  ]);
  return {
    categories,
    technologies: tags.filter((t) => t.kind === "technology").map(({ slug, name, count }) => ({ slug, name, count })),
    styles: tags.filter((t) => t.kind === "style").map(({ slug, name, count }) => ({ slug, name, count })),
  };
}

export type ProductDetail = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  status: "draft" | "published" | "archived";
  priceCents: number;
  licenceType: "free" | "standard";
  licenceSummary: string;
  category: { slug: string; name: string };
  technologies: { slug: string; name: string }[];
  styles: { slug: string; name: string }[];
  topics: { slug: string; name: string }[];
  poster: MediaRef | null;
  screenshots: MediaRef[];
  publishedAt: string | null;
  updatedAt: string;
  version: {
    id: string;
    version: string;
    changelog: string;
    releasedAt: string | null;
    hasPrompt: boolean;
    promptWords: number;
    hasSource: boolean;
    archiveFileName: string | null;
    archiveSize: number | null;
    archiveManifest: {
      fileCount: number;
      hasReadme: boolean;
      hasLicence: boolean;
      hasEnvExample: boolean;
      hasPackageJson: boolean;
      topLevel: string[];
    } | null;
    demoKey: string | null;
    dependencies: { name: string; version: string; dev?: boolean }[];
    requirements: string[];
    technologyNotes: string;
  } | null;
  history: { version: string; releasedAt: string | null; changelog: string }[];
};

/** Public product detail. Drafts are never returned. */
export async function getProductDetail(slug: string): Promise<ProductDetail | null> {
  const db = getDb();
  const [row] = await db
    .select({
      product,
      categorySlug: category.slug,
      categoryName: category.name,
    })
    .from(product)
    .innerJoin(category, eq(category.id, product.categoryId))
    .where(and(eq(product.slug, slug), inArray(product.status, ["published", "archived"])))
    .limit(1);
  if (!row) return null;
  const p = row.product;

  const [tags, media, versions] = await Promise.all([
    db
      .select({ kind: tag.kind, slug: tag.slug, name: tag.name })
      .from(productTag)
      .innerJoin(tag, eq(tag.id, productTag.tagId))
      .where(eq(productTag.productId, p.id))
      .orderBy(asc(tag.name)),
    db
      .select()
      .from(productMedia)
      .where(eq(productMedia.productId, p.id))
      .orderBy(asc(productMedia.kind), asc(productMedia.sortOrder)),
    db
      .select({
        id: productVersion.id,
        version: productVersion.version,
        changelog: productVersion.changelog,
        releasedAt: productVersion.releasedAt,
        promptWords: productVersion.promptWords,
        hasSource: sql<number>`(${productVersion.archiveKey} is not null)`,
        archiveFileName: productVersion.archiveFileName,
        archiveSize: productVersion.archiveSize,
        archiveManifest: productVersion.archiveManifest,
        demoKey: productVersion.demoKey,
        dependencies: productVersion.dependencies,
        requirements: productVersion.requirements,
        technologyNotes: productVersion.technologyNotes,
      })
      .from(productVersion)
      .where(and(eq(productVersion.productId, p.id), sql`${productVersion.releasedAt} is not null`))
      .orderBy(desc(productVersion.releasedAt))
      .limit(20),
  ]);

  const toRef = (m: (typeof media)[number]): MediaRef => ({
    key: m.storageKey,
    widths: m.widths,
    width: m.width,
    height: m.height,
    alt: m.alt,
  });
  const current = versions.find((v) => v.id === p.currentVersionId) ?? null;
  const manifest = current?.archiveManifest ?? null;

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    tagline: p.tagline,
    description: p.description,
    status: p.status,
    priceCents: p.priceCents,
    licenceType: p.licenceType,
    licenceSummary: p.licenceSummary,
    category: { slug: row.categorySlug, name: row.categoryName },
    technologies: tags.filter((t) => t.kind === "technology"),
    styles: tags.filter((t) => t.kind === "style"),
    topics: tags.filter((t) => t.kind === "topic"),
    poster: media.find((m) => m.kind === "poster") ? toRef(media.find((m) => m.kind === "poster")!) : null,
    screenshots: media.filter((m) => m.kind === "screenshot").map(toRef),
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    updatedAt: p.updatedAt.toISOString(),
    version: current
      ? {
          id: current.id,
          version: current.version,
          changelog: current.changelog,
          releasedAt: current.releasedAt ? current.releasedAt.toISOString() : null,
          hasPrompt: current.promptWords > 0,
          promptWords: current.promptWords,
          hasSource: Boolean(current.hasSource),
          archiveFileName: current.archiveFileName,
          archiveSize: current.archiveSize,
          archiveManifest: manifest
            ? {
                fileCount: manifest.fileCount,
                hasReadme: manifest.hasReadme,
                hasLicence: manifest.hasLicence,
                hasEnvExample: manifest.hasEnvExample,
                hasPackageJson: manifest.hasPackageJson,
                topLevel: [...new Set(manifest.files.map((f) => f.split("/")[0] + (f.includes("/") ? "/" : "")))].slice(0, 16),
              }
            : null,
          demoKey: current.demoKey,
          dependencies: current.dependencies,
          requirements: current.requirements,
          technologyNotes: current.technologyNotes,
        }
      : null,
    history: versions.map((v) => ({
      version: v.version,
      releasedAt: v.releasedAt ? v.releasedAt.toISOString() : null,
      changelog: v.changelog,
    })),
  };
}

export async function getRelatedProducts(productId: string, limit = 3): Promise<ProductSummary[]> {
  const db = getDb();
  const [self] = await db.select({ categoryId: product.categoryId }).from(product).where(eq(product.id, productId));
  if (!self) return [];
  const scored = await db
    .select({
      id: product.id,
      score: sql<number>`(case when ${product.categoryId} = ${self.categoryId} then 2 else 0 end) + (select count(*) from product_tag pt where pt.product_id = ${product.id} and pt.tag_id in (select tag_id from product_tag where product_id = ${productId}))`.as("score"),
    })
    .from(product)
    .where(and(eq(product.status, "published"), sql`${product.id} <> ${productId}`))
    .orderBy(sql`score desc`, desc(product.publishedAt))
    .limit(limit);
  return getProductSummariesByIds(scored.filter((s) => s.score > 0).map((s) => s.id));
}

export async function listPublishedProductSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return getDb()
    .select({ slug: product.slug, updatedAt: product.updatedAt })
    .from(product)
    .where(eq(product.status, "published"))
    .orderBy(desc(product.publishedAt))
    .limit(5000);
}

export async function listCategories() {
  return getDb().select().from(category).orderBy(asc(category.sortOrder), asc(category.name));
}
