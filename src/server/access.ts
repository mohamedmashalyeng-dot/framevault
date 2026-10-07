import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { entitlement, product } from "@/db/schema";

/**
 * The single source of truth for "may this person use this product's
 * deliverables?". Every prompt read and every download goes through here.
 */
export type Viewer = { id: string; role: "customer" | "admin" } | null;

export type AccessReason =
  | "admin"
  | "free"
  | "owned"
  | "all_access"
  | "sign_in_required"
  | "purchase_required"
  | "unavailable";

export type AccessDecision = {
  allowed: boolean;
  reason: AccessReason;
  product: {
    id: string;
    slug: string;
    title: string;
    status: "draft" | "published" | "archived";
    priceCents: number;
    currentVersionId: string | null;
  } | null;
};

export async function findActiveEntitlement(userId: string, productId: string) {
  const [row] = await getDb()
    .select({ id: entitlement.id, scope: entitlement.scope })
    .from(entitlement)
    .where(
      and(
        eq(entitlement.userId, userId),
        isNull(entitlement.revokedAt),
        or(eq(entitlement.scope, "all_access"), and(eq(entitlement.scope, "product"), eq(entitlement.productId, productId))),
      ),
    )
    .orderBy(entitlement.scope) // "all_access" sorts before "product"
    .limit(1);
  return row ?? null;
}

export async function hasAllAccess(userId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: entitlement.id })
    .from(entitlement)
    .where(and(eq(entitlement.userId, userId), eq(entitlement.scope, "all_access"), isNull(entitlement.revokedAt)))
    .limit(1);
  return Boolean(row);
}

export async function decideAccess(viewer: Viewer, slug: string): Promise<AccessDecision> {
  const [p] = await getDb()
    .select({
      id: product.id,
      slug: product.slug,
      title: product.title,
      status: product.status,
      priceCents: product.priceCents,
      currentVersionId: product.currentVersionId,
    })
    .from(product)
    .where(eq(product.slug, slug))
    .limit(1);

  if (!p) return { allowed: false, reason: "unavailable", product: null };
  if (viewer?.role === "admin") return { allowed: true, reason: "admin", product: p };
  // Drafts are invisible to customers.
  if (p.status === "draft") return { allowed: false, reason: "unavailable", product: null };

  if (viewer) {
    const grant = await findActiveEntitlement(viewer.id, p.id);
    if (grant) return { allowed: true, reason: grant.scope === "all_access" ? "all_access" : "owned", product: p };
  }

  // Free products stay free while listed. Archived ones remain available to
  // people who already have them in their library (handled above).
  if (p.priceCents === 0 && p.status === "published") return { allowed: true, reason: "free", product: p };
  if (p.status === "archived") return { allowed: false, reason: "unavailable", product: p };

  return { allowed: false, reason: viewer ? "purchase_required" : "sign_in_required", product: p };
}

/** Product IDs the user can open in their library, plus all-access status. */
export async function getLibraryState(userId: string) {
  const rows = await getDb()
    .select({ productId: entitlement.productId, scope: entitlement.scope })
    .from(entitlement)
    .where(and(eq(entitlement.userId, userId), isNull(entitlement.revokedAt)));
  return {
    allAccess: rows.some((r) => r.scope === "all_access"),
    productIds: [...new Set(rows.map((r) => r.productId).filter((id): id is string => Boolean(id)))],
  };
}

/** Records that a signed-in user collected a free product, so it shows in their library. */
export async function recordFreeClaim(userId: string, productId: string) {
  await getDb()
    .insert(entitlement)
    .values({
      id: `ent_free_${userId}_${productId}`.slice(0, 120),
      userId,
      productId,
      scope: "product",
      source: "free",
    })
    .onConflictDoNothing();
}
