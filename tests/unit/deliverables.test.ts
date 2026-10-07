import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { entitlement } from "@/db/schema";
import { parseCatalogueParams } from "@/lib/catalogue-params";
import { getFeaturedProducts, getProductDetail, getRecentProducts, searchCatalogue } from "@/server/catalogue/queries";
import { getPromptForViewer, issueDownloadLink, resolveDownload } from "@/server/deliverables";
import { newId } from "@/server/ids";
import { createTestProduct, createUser, SECRET_PROMPT, setupDatabase } from "./helpers";

beforeAll(setupDatabase);

const tokenFrom = (url: string) => url.split("/").pop()!;

describe("prompt access", () => {
  it("denies paid prompts to anonymous visitors and non-owners", async () => {
    const { slug } = await createTestProduct({ priceCents: 2900 });
    const stranger = await createUser();
    expect(await getPromptForViewer(null, slug)).toMatchObject({ ok: false, status: 401 });
    expect(await getPromptForViewer(stranger, slug)).toMatchObject({ ok: false, status: 403 });
  });

  it("serves free prompts to anyone and records the claim for signed-in users", async () => {
    const { slug, productId } = await createTestProduct({ priceCents: 0 });
    expect(await getPromptForViewer(null, slug)).toMatchObject({ ok: true, prompt: SECRET_PROMPT });
    const reader = await createUser();
    await getPromptForViewer(reader, slug);
    await getPromptForViewer(reader, slug);
    const { eq } = await import("drizzle-orm");
    const claims = await getDb().select().from(entitlement).where(eq(entitlement.userId, reader.id));
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ productId, source: "free" });
  });
});

describe("downloads", () => {
  it("issues short-lived links only to entitled users and re-checks on use", async () => {
    const { slug, productId } = await createTestProduct({ priceCents: 4900 });
    const owner = await createUser();
    const other = await createUser();
    expect(await issueDownloadLink(other, slug)).toMatchObject({ ok: false, status: 403 });

    const grantId = newId("ent");
    await getDb().insert(entitlement).values({ id: grantId, userId: owner.id, productId, scope: "product", source: "admin" });
    const link = await issueDownloadLink(owner, slug);
    expect(link.ok).toBe(true);
    if (!link.ok) return;
    expect(link.url).toMatch(/^\/api\/downloads\/[\w-]+\.[\w-]+$/);

    const token = tokenFrom(link.url);
    // The token is bound to the owner: presenting it without that session fails.
    expect(await resolveDownload(token, async () => null)).toMatchObject({ ok: false });
    expect(await resolveDownload(token, async (id) => (id === owner.id ? owner : null))).toMatchObject({ ok: true });

    // Revoking the entitlement invalidates an already-issued link.
    const { eq } = await import("drizzle-orm");
    await getDb().update(entitlement).set({ revokedAt: new Date() }).where(eq(entitlement.id, grantId));
    expect(await resolveDownload(token, async (id) => (id === owner.id ? owner : null))).toMatchObject({ ok: false, status: 403 });
  });

  it("lets anyone download free source without an account", async () => {
    const { slug } = await createTestProduct({ priceCents: 0 });
    const link = await issueDownloadLink(null, slug);
    expect(link.ok).toBe(true);
    if (link.ok) expect(await resolveDownload(tokenFrom(link.url), async () => null)).toMatchObject({ ok: true });
  });

  it("does not offer downloads for prompt-only products", async () => {
    const { slug } = await createTestProduct({ priceCents: 0, withArchive: false });
    expect(await issueDownloadLink(null, slug)).toMatchObject({ ok: false, reason: "not_included" });
  });

  it("rejects garbage tokens", async () => {
    expect(await resolveDownload("abc.def", async () => null)).toMatchObject({ ok: false, status: 403 });
  });
});

describe("public catalogue reads", () => {
  it("never include prompt text or private storage keys", async () => {
    const { slug } = await createTestProduct({ priceCents: 2900, slug: "aurora-kit" });
    const payloads = [
      await searchCatalogue(parseCatalogueParams({})),
      await searchCatalogue(parseCatalogueParams({ q: "aurora" })),
      await getFeaturedProducts(),
      await getRecentProducts(),
      await getProductDetail(slug),
    ];
    const json = JSON.stringify(payloads);
    expect(json).not.toContain("TOP-SECRET");
    expect(json).not.toContain("archives/");
    expect(json).toContain("aurora-kit");
  });

  it("searches titles, descriptions and tags, and paginates", async () => {
    await createTestProduct({ priceCents: 0, slug: "searchable-thing" });
    const byTag = await searchCatalogue(parseCatalogueParams({ q: "react" }));
    expect(byTag.total).toBeGreaterThan(0);
    const byDescription = await searchCatalogue(parseCatalogueParams({ q: "auror" }));
    expect(byDescription.items.some((p) => p.slug === "aurora-kit")).toBe(true);
    const free = await searchCatalogue(parseCatalogueParams({ price: "free" }));
    expect(free.items.every((p) => p.priceCents === 0)).toBe(true);
    const beyond = await searchCatalogue(parseCatalogueParams({ page: "40" }));
    expect(beyond.page).toBe(Math.max(beyond.pageCount, 1));
  });
});
