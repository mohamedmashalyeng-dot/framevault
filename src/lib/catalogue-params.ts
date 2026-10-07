/**
 * Shareable catalogue URL state. Parsing is strict and bounded so arbitrary
 * query strings can never produce unbounded queries.
 */
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export type CatalogueSort = (typeof SORT_OPTIONS)[number]["value"];
export type PriceFilter = "free" | "paid";

export type CatalogueQuery = {
  q: string;
  category: string | null;
  price: PriceFilter | null;
  tech: string[];
  style: string[];
  sort: CatalogueSort;
  page: number;
};

export const PAGE_SIZE = 12;
export const MAX_PAGE = 50;
const MAX_QUERY_LENGTH = 80;
const MAX_FACET_VALUES = 6;
const SLUG = /^[a-z0-9][a-z0-9-]{0,47}$/;

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function read(params: RawParams, key: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key);
  const value = params[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function slugList(params: RawParams, key: string): string[] {
  const values = read(params, key)
    .flatMap((v) => v.split(","))
    .map((v) => v.trim().toLowerCase())
    .filter((v) => SLUG.test(v));
  return [...new Set(values)].sort().slice(0, MAX_FACET_VALUES);
}

export function parseCatalogueParams(params: RawParams): CatalogueQuery {
  const q = (read(params, "q")[0] ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  const categoryRaw = (read(params, "category")[0] ?? "").toLowerCase();
  const priceRaw = read(params, "price")[0];
  const sortRaw = read(params, "sort")[0];
  const pageRaw = Number.parseInt(read(params, "page")[0] ?? "1", 10);

  return {
    q,
    category: SLUG.test(categoryRaw) ? categoryRaw : null,
    price: priceRaw === "free" || priceRaw === "paid" ? priceRaw : null,
    tech: slugList(params, "tech"),
    style: slugList(params, "style"),
    sort: SORT_OPTIONS.some((o) => o.value === sortRaw) ? (sortRaw as CatalogueSort) : "newest",
    page: Number.isFinite(pageRaw) ? Math.min(Math.max(pageRaw, 1), MAX_PAGE) : 1,
  };
}

/** Builds a canonical, stable query string (sorted keys, defaults omitted). */
export function catalogueSearch(query: Partial<CatalogueQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.price) params.set("price", query.price);
  if (query.tech?.length) params.set("tech", [...query.tech].sort().join(","));
  if (query.style?.length) params.set("style", [...query.style].sort().join(","));
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function catalogueHref(query: Partial<CatalogueQuery>): string {
  return `/catalogue${catalogueSearch(query)}`;
}

export function hasActiveFilters(query: CatalogueQuery): boolean {
  return Boolean(query.q || query.category || query.price || query.tech.length || query.style.length);
}
