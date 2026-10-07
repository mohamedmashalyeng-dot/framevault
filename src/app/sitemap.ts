import type { MetadataRoute } from "next";
import { cachedCategories, cachedSitemapEntries } from "@/server/catalogue/cached";

const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([cachedSitemapEntries(), cachedCategories()]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/catalogue`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: `${base}/catalogue?category=${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${base}/all-access`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/licence`, changeFrequency: "yearly", priority: 0.3 },
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
