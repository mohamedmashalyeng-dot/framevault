import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { entitlement } from "@/db/schema";
import { decideAccess, getLibraryState } from "@/server/access";
import { setProductStatus } from "@/server/admin/catalogue";
import { newId } from "@/server/ids";
import { createTestProduct, createUser, setupDatabase } from "./helpers";

beforeAll(setupDatabase);

describe("decideAccess", () => {
  it("requires sign-in, then purchase, for paid products", async () => {
    const { slug } = await createTestProduct({ priceCents: 2900 });
    const customer = await createUser();
    expect((await decideAccess(null, slug)).reason).toBe("sign_in_required");
    expect(await decideAccess(customer, slug)).toMatchObject({ allowed: false, reason: "purchase_required" });
  });

  it("allows free products without an account", async () => {
    const { slug } = await createTestProduct({ priceCents: 0 });
    expect(await decideAccess(null, slug)).toMatchObject({ allowed: true, reason: "free" });
  });

  it("grants owners, all-access holders and admins, and respects revocation", async () => {
    const { slug, productId } = await createTestProduct({ priceCents: 4900 });
    const owner = await createUser();
    const pass = await createUser();
    const admin = await createUser("admin");
    const db = getDb();
    const grantId = newId("ent");
    await db.insert(entitlement).values({ id: grantId, userId: owner.id, productId, scope: "product", source: "admin" });
    await db.insert(entitlement).values({ id: newId("ent"), userId: pass.id, productId: null, scope: "all_access", source: "admin" });

    expect((await decideAccess(owner, slug)).reason).toBe("owned");
    expect((await decideAccess(pass, slug)).reason).toBe("all_access");
    expect((await decideAccess(admin, slug)).reason).toBe("admin");
    expect((await getLibraryState(owner.id)).productIds).toContain(productId);

    const { eq } = await import("drizzle-orm");
    await db.update(entitlement).set({ revokedAt: new Date(), revokedReason: "refunded" }).where(eq(entitlement.id, grantId));
    expect((await decideAccess(owner, slug)).reason).toBe("purchase_required");
  });

  it("hides drafts from customers and stops selling archived products", async () => {
    const draft = await createTestProduct({ priceCents: 900, publish: false });
    const customer = await createUser();
    expect(await decideAccess(customer, draft.slug)).toMatchObject({ allowed: false, reason: "unavailable", product: null });
    expect((await decideAccess({ id: "x", role: "admin" }, draft.slug)).allowed).toBe(true);

    const archived = await createTestProduct({ priceCents: 0 });
    await setProductStatus(archived.productId, "archived");
    expect(await decideAccess(customer, archived.slug)).toMatchObject({ allowed: false, reason: "unavailable" });
    expect((await decideAccess(customer, "no-such-product")).reason).toBe("unavailable");
  });
});
