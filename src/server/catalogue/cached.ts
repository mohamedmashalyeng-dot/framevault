import { cacheLife, cacheTag } from "next/cache";
import type { CatalogueQuery } from "@/lib/catalogue-params";
import { getStoreSettings } from "../settings";
import * as q from "./queries";

/**
 * Cached wrappers around the public catalogue reads. Every entry carries the
 * "catalogue" tag; admin mutations call updateTag("catalogue") so changes are
 * visible on the next request. Only public data passes through here.
 */
export const CATALOGUE_TAG = "catalogue";
export const SETTINGS_TAG = "settings";

export async function cachedSearch(query: CatalogueQuery) {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  cacheLife("minutes");
  return q.searchCatalogue(query);
}

export async function cachedFacets() {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  cacheLife("minutes");
  return q.getCatalogueFacets();
}

export async function cachedFeatured(limit = 6) {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  cacheLife("minutes");
  return q.getFeaturedProducts(limit);
}

export async function cachedRecent(limit = 6) {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  cacheLife("minutes");
  return q.getRecentProducts(limit);
}

export async function cachedProductDetail(slug: string) {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  cacheLife("minutes");
  return q.getProductDetail(slug);
}

export async function cachedRelated(productId: string) {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  cacheLife("minutes");
  return q.getRelatedProducts(productId, 3);
}

export async function cachedCategories() {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  cacheLife("minutes");
  const rows = await q.listCategories();
  return rows.map((c) => ({ slug: c.slug, name: c.name, description: c.description }));
}

export async function cachedSitemapEntries() {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  cacheLife("hours");
  const rows = await q.listPublishedProductSlugs();
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
}

/** Public store settings (currency, demo-pricing label, all-access offer). */
export async function cachedStoreSettings() {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("minutes");
  return getStoreSettings();
}
