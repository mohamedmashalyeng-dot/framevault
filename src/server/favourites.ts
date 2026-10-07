import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { favourite, product } from "@/db/schema";

export async function isFavourite(userId: string, productId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ productId: favourite.productId })
    .from(favourite)
    .where(and(eq(favourite.userId, userId), eq(favourite.productId, productId)));
  return Boolean(row);
}

/** Adds or removes a favourite. Only published products can be added. */
export async function setFavourite(userId: string, productId: string, on: boolean): Promise<boolean> {
  const db = getDb();
  if (!on) {
    await db.delete(favourite).where(and(eq(favourite.userId, userId), eq(favourite.productId, productId)));
    return false;
  }
  const [p] = await db.select({ status: product.status }).from(product).where(eq(product.id, productId));
  if (!p || p.status !== "published") return false;
  await db.insert(favourite).values({ userId, productId }).onConflictDoNothing();
  return true;
}

export async function listFavouriteIds(userId: string, limit = 200): Promise<string[]> {
  const rows = await getDb()
    .select({ productId: favourite.productId })
    .from(favourite)
    .where(eq(favourite.userId, userId))
    .orderBy(desc(favourite.createdAt))
    .limit(limit);
  return rows.map((r) => r.productId);
}
