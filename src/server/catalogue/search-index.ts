import { asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { getDb } from "@/db";
import { product, productTag, tag } from "@/db/schema";

const MAX_TOKENS = 8;

/**
 * Converts free text into a safe FTS5 expression: every token is quoted (so
 * FTS operators in user input are inert) and prefix-matched, and all tokens
 * must match.
 */
export function toFtsQuery(input: string): string | null {
  const tokens = input
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, MAX_TOKENS);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t.replace(/"/g, "")}"*`).join(" AND ");
}

/** Re-indexes one product. Only published products are searchable. */
export async function refreshSearchIndex(productId: string, db: Database = getDb()) {
  await db.run(sql`delete from product_search where product_id = ${productId}`);

  const [row] = await db
    .select({
      status: product.status,
      title: product.title,
      tagline: product.tagline,
      description: product.description,
    })
    .from(product)
    .where(eq(product.id, productId));
  if (!row || row.status !== "published") return;

  const tags = await db
    .select({ name: tag.name, slug: tag.slug })
    .from(productTag)
    .innerJoin(tag, eq(tag.id, productTag.tagId))
    .where(eq(productTag.productId, productId))
    .orderBy(asc(tag.name));

  const tagText = tags.map((t) => `${t.name} ${t.slug.replace(/-/g, " ")}`).join(" ");
  await db.run(
    sql`insert into product_search (product_id, title, body, tags) values (${productId}, ${row.title}, ${`${row.tagline}\n${row.description}`}, ${tagText})`,
  );
}

export async function rebuildSearchIndex(db: Database = getDb()) {
  const ids = await db.select({ id: product.id }).from(product);
  await db.run(sql`delete from product_search`);
  for (const { id } of ids) await refreshSearchIndex(id, db);
}
