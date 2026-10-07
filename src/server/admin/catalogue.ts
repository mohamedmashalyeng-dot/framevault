import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import {
  category,
  product,
  productMedia,
  productTag,
  productVersion,
  tag,
  TAG_KINDS,
  type ArchiveManifest,
  type Dependency,
  type ProductStatus,
  type TagKind,
} from "@/db/schema";
import { slugify, wordCount } from "@/lib/format";
import { refreshSearchIndex } from "../catalogue/search-index";
import { newId } from "../ids";
import { removeDemo } from "../ingest/demo";
import { removePreviewImage, storePreviewImage } from "../ingest/media";
import { DEFAULT_LICENCE_SUMMARY } from "../licence";
import { removePrefix } from "../storage";
import { contains } from "./search";

/**
 * Catalogue administration. Shared by the admin Server Actions and the seed
 * script. Callers are responsible for authorising the administrator; every
 * function here validates its own input.
 */

export class AdminInputError extends Error {}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* -------------------------------------------------------------------------- */
/* Categories and tags                                                        */
/* -------------------------------------------------------------------------- */

const categoryInput = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().max(60).optional(),
  description: z.string().trim().max(300).default(""),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveCategory(raw: z.input<typeof categoryInput>, id?: string) {
  const input = categoryInput.parse(raw);
  const slug = input.slug ? slugify(input.slug) : slugify(input.name);
  if (!SLUG.test(slug)) throw new AdminInputError("Category slug must use lowercase letters, numbers and dashes.");
  const db = getDb();
  const [clash] = await db.select({ id: category.id }).from(category).where(eq(category.slug, slug));
  if (clash && clash.id !== id) throw new AdminInputError(`Another category already uses the slug "${slug}".`);
  if (id) {
    await db.update(category).set({ ...input, slug }).where(eq(category.id, id));
    return id;
  }
  const newCategoryId = newId("cat");
  await db.insert(category).values({ id: newCategoryId, ...input, slug });
  return newCategoryId;
}

export async function deleteCategory(id: string) {
  const db = getDb();
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(product).where(eq(product.categoryId, id));
  if (count > 0) throw new AdminInputError("Move or delete the products in this category first.");
  await db.delete(category).where(eq(category.id, id));
}

export async function ensureTag(kind: TagKind, name: string): Promise<string> {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
  const slug = slugify(clean);
  if (!clean || !slug) throw new AdminInputError("Tag names need at least one letter or number.");
  const db = getDb();
  const [existing] = await db.select({ id: tag.id }).from(tag).where(and(eq(tag.kind, kind), eq(tag.slug, slug)));
  if (existing) return existing.id;
  const id = newId("tag");
  await db.insert(tag).values({ id, kind, slug, name: clean });
  return id;
}

export async function renameTag(id: string, name: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!clean) throw new AdminInputError("Tag name is required.");
  const db = getDb();
  const [row] = await db.select().from(tag).where(eq(tag.id, id));
  if (!row) throw new AdminInputError("Tag not found.");
  const slug = slugify(clean);
  const [clash] = await db.select({ id: tag.id }).from(tag).where(and(eq(tag.kind, row.kind), eq(tag.slug, slug)));
  if (clash && clash.id !== id) throw new AdminInputError(`A ${row.kind} tag called "${clean}" already exists.`);
  await db.update(tag).set({ name: clean, slug }).where(eq(tag.id, id));
  await reindexProductsWithTag(id);
}

export async function deleteTag(id: string) {
  const affected = await getDb().select({ id: productTag.productId }).from(productTag).where(eq(productTag.tagId, id));
  await getDb().delete(tag).where(eq(tag.id, id));
  for (const { id: productId } of affected) await refreshSearchIndex(productId);
}

async function reindexProductsWithTag(tagId: string) {
  const rows = await getDb().select({ id: productTag.productId }).from(productTag).where(eq(productTag.tagId, tagId));
  for (const { id } of rows) await refreshSearchIndex(id);
}

export async function listTagsWithUsage() {
  return getDb()
    .select({
      id: tag.id,
      kind: tag.kind,
      slug: tag.slug,
      name: tag.name,
      products: sql<number>`(select count(*) from product_tag pt where pt.tag_id = ${tag.id})`,
    })
    .from(tag)
    .orderBy(asc(tag.kind), asc(tag.name));
}

export async function listCategoriesWithUsage() {
  return getDb()
    .select({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      products: sql<number>`(select count(*) from product p where p.category_id = ${category.id})`,
    })
    .from(category)
    .orderBy(asc(category.sortOrder), asc(category.name));
}

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

export const productInput = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(90),
  slug: z.string().trim().max(80).optional(),
  tagline: z.string().trim().max(160).default(""),
  description: z.string().trim().max(6000).default(""),
  categoryId: z.string().min(1, "Choose a category."),
  priceCents: z.number().int().min(0).max(10_000_00),
  licenceType: z.enum(["free", "standard"]),
  licenceSummary: z.string().trim().max(800).default(""),
  isFeatured: z.boolean().default(false),
  featuredRank: z.number().int().min(0).max(99).default(0),
  technologies: z.array(z.string()).max(12).default([]),
  styles: z.array(z.string()).max(8).default([]),
  topics: z.array(z.string()).max(12).default([]),
});

export type ProductInput = z.input<typeof productInput>;

async function assertCategory(id: string) {
  const [row] = await getDb().select({ id: category.id }).from(category).where(eq(category.id, id));
  if (!row) throw new AdminInputError("Choose a valid category.");
}

async function setProductTags(productId: string, input: { technologies: string[]; styles: string[]; topics: string[] }) {
  const ids: string[] = [];
  for (const [kind, names] of [
    ["technology", input.technologies],
    ["style", input.styles],
    ["topic", input.topics],
  ] as const) {
    for (const name of names) if (name.trim()) ids.push(await ensureTag(kind, name));
  }
  const db = getDb();
  await db.delete(productTag).where(eq(productTag.productId, productId));
  const unique = [...new Set(ids)];
  if (unique.length) await db.insert(productTag).values(unique.map((tagId) => ({ productId, tagId })));
}

export async function createProduct(raw: ProductInput, opts: { isDemoContent?: boolean } = {}): Promise<string> {
  const input = productInput.parse(raw);
  const slug = slugify(input.slug || input.title);
  if (!SLUG.test(slug)) throw new AdminInputError("The slug must use lowercase letters, numbers and dashes.");
  await assertCategory(input.categoryId);
  const db = getDb();
  const [clash] = await db.select({ id: product.id }).from(product).where(eq(product.slug, slug));
  if (clash) throw new AdminInputError(`The slug "${slug}" is already used by another product.`);
  if (input.priceCents === 0 && input.licenceType !== "free") input.licenceType = "free";

  const id = newId("prd");
  await db.insert(product).values({
    id,
    slug,
    title: input.title,
    tagline: input.tagline,
    description: input.description,
    categoryId: input.categoryId,
    priceCents: input.priceCents,
    licenceType: input.licenceType,
    licenceSummary: input.licenceSummary || DEFAULT_LICENCE_SUMMARY[input.licenceType],
    isFeatured: input.isFeatured,
    featuredRank: input.featuredRank,
    isDemoContent: opts.isDemoContent ?? false,
    status: "draft",
  });
  await setProductTags(id, input);
  await refreshSearchIndex(id);
  return id;
}

export async function updateProduct(id: string, raw: ProductInput) {
  const input = productInput.parse(raw);
  const db = getDb();
  const [current] = await db.select().from(product).where(eq(product.id, id));
  if (!current) throw new AdminInputError("Product not found.");
  const slug = slugify(input.slug || current.slug);
  if (!SLUG.test(slug)) throw new AdminInputError("The slug must use lowercase letters, numbers and dashes.");
  if (slug !== current.slug) {
    const [clash] = await db.select({ id: product.id }).from(product).where(eq(product.slug, slug));
    if (clash) throw new AdminInputError(`The slug "${slug}" is already used by another product.`);
  }
  await assertCategory(input.categoryId);
  const licenceType = input.priceCents === 0 ? "free" : input.licenceType;

  await db
    .update(product)
    .set({
      slug,
      title: input.title,
      tagline: input.tagline,
      description: input.description,
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      licenceType,
      licenceSummary: input.licenceSummary || DEFAULT_LICENCE_SUMMARY[licenceType],
      isFeatured: input.isFeatured,
      featuredRank: input.featuredRank,
    })
    .where(eq(product.id, id));
  await setProductTags(id, input);
  await refreshSearchIndex(id);
  return { previousSlug: current.slug, slug };
}

export async function setProductStatus(id: string, status: ProductStatus) {
  const db = getDb();
  const [current] = await db.select().from(product).where(eq(product.id, id));
  if (!current) throw new AdminInputError("Product not found.");
  if (status === "published") {
    if (!current.currentVersionId) throw new AdminInputError("Release a version before publishing.");
    const [poster] = await db
      .select({ id: productMedia.id })
      .from(productMedia)
      .where(and(eq(productMedia.productId, id), eq(productMedia.kind, "poster")));
    if (!poster) throw new AdminInputError("Upload a poster image before publishing.");
  }
  await db
    .update(product)
    .set({ status, publishedAt: status === "published" && !current.publishedAt ? new Date() : current.publishedAt })
    .where(eq(product.id, id));
  await refreshSearchIndex(id);
}

export async function setFeatured(id: string, isFeatured: boolean, featuredRank = 0) {
  await getDb().update(product).set({ isFeatured, featuredRank }).where(eq(product.id, id));
}

/** Deletes a draft that never sold. Published products are archived instead. */
export async function deleteDraftProduct(id: string) {
  const db = getDb();
  const [current] = await db.select().from(product).where(eq(product.id, id));
  if (!current) return;
  if (current.status !== "draft" || current.publishedAt) {
    throw new AdminInputError("Only never-published drafts can be deleted. Archive the product instead.");
  }
  const versions = await db.select().from(productVersion).where(eq(productVersion.productId, id));
  const media = await db.select().from(productMedia).where(eq(productMedia.productId, id));
  await db.delete(product).where(eq(product.id, id));
  for (const v of versions) {
    if (v.archiveKey) await removePrefix("private", v.archiveKey);
    if (v.demoKey) await removeDemo(v.demoKey);
  }
  for (const m of media) await removePreviewImage(m.storageKey, m.widths);
  await refreshSearchIndex(id);
}

export async function listProductsForAdmin(filter: { q?: string; status?: ProductStatus | "all" } = {}) {
  const db = getDb();
  const conditions = [];
  if (filter.status && filter.status !== "all") conditions.push(eq(product.status, filter.status));
  if (filter.q) {
    conditions.push(or(contains(product.title, filter.q), contains(product.slug, filter.q))!);
  }
  return db
    .select({
      id: product.id,
      slug: product.slug,
      title: product.title,
      status: product.status,
      priceCents: product.priceCents,
      isFeatured: product.isFeatured,
      featuredRank: product.featuredRank,
      isDemoContent: product.isDemoContent,
      updatedAt: product.updatedAt,
      categoryName: category.name,
      version: productVersion.version,
      hasSource: sql<number>`(${productVersion.archiveKey} is not null)`,
      hasPrompt: sql<number>`(coalesce(${productVersion.promptWords}, 0) > 0)`,
      hasDemo: sql<number>`(${productVersion.demoKey} is not null)`,
    })
    .from(product)
    .innerJoin(category, eq(category.id, product.categoryId))
    .leftJoin(productVersion, eq(productVersion.id, product.currentVersionId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(product.updatedAt))
    .limit(200);
}

export async function getProductForAdmin(id: string) {
  const db = getDb();
  const [p] = await db.select().from(product).where(eq(product.id, id));
  if (!p) return null;
  const [tags, versions, media] = await Promise.all([
    db
      .select({ id: tag.id, kind: tag.kind, name: tag.name })
      .from(productTag)
      .innerJoin(tag, eq(tag.id, productTag.tagId))
      .where(eq(productTag.productId, id))
      .orderBy(asc(tag.name)),
    db
      .select({
        id: productVersion.id,
        version: productVersion.version,
        changelog: productVersion.changelog,
        promptWords: productVersion.promptWords,
        archiveFileName: productVersion.archiveFileName,
        archiveSize: productVersion.archiveSize,
        archiveManifest: productVersion.archiveManifest,
        demoKey: productVersion.demoKey,
        releasedAt: productVersion.releasedAt,
        createdAt: productVersion.createdAt,
        dependencies: productVersion.dependencies,
        requirements: productVersion.requirements,
        technologyNotes: productVersion.technologyNotes,
      })
      .from(productVersion)
      .where(eq(productVersion.productId, id))
      .orderBy(desc(productVersion.createdAt)),
    db.select().from(productMedia).where(eq(productMedia.productId, id)).orderBy(asc(productMedia.kind), asc(productMedia.sortOrder)),
  ]);
  return { product: p, tags, versions, media };
}

/** The prompt text for the admin editor only. */
export async function getVersionPrompt(versionId: string) {
  const [row] = await getDb().select({ prompt: productVersion.prompt }).from(productVersion).where(eq(productVersion.id, versionId));
  return row?.prompt ?? "";
}

/* -------------------------------------------------------------------------- */
/* Versions                                                                   */
/* -------------------------------------------------------------------------- */

export type VersionInput = {
  version: string;
  changelog: string;
  prompt: string;
  dependencies: Dependency[];
  requirements: string[];
  technologyNotes: string;
  archive?: {
    archiveKey: string;
    archiveFileName: string;
    archiveSize: number;
    archiveSha256: string;
    archiveManifest: ArchiveManifest;
  } | null;
  demoKey?: string | null;
  /** Make this the product's current version straight away. */
  release: boolean;
};

const VERSION = /^\d{1,3}\.\d{1,3}\.\d{1,3}(-[a-z0-9.]{1,20})?$/;

export async function createVersion(productId: string, input: VersionInput): Promise<string> {
  if (!VERSION.test(input.version)) throw new AdminInputError("Use semantic versioning, for example 1.2.0.");
  if (input.prompt.length > 60_000) throw new AdminInputError("The prompt is too long (60,000 characters maximum).");
  if (!input.prompt.trim() && !input.archive) {
    throw new AdminInputError("A version must include a prompt, a source archive, or both.");
  }
  const db = getDb();
  const [p] = await db.select({ id: product.id }).from(product).where(eq(product.id, productId));
  if (!p) throw new AdminInputError("Product not found.");
  const [clash] = await db
    .select({ id: productVersion.id })
    .from(productVersion)
    .where(and(eq(productVersion.productId, productId), eq(productVersion.version, input.version)));
  if (clash) throw new AdminInputError(`Version ${input.version} already exists for this product.`);

  const id = newId("ver");
  await db.insert(productVersion).values({
    id,
    productId,
    version: input.version,
    changelog: input.changelog.trim().slice(0, 4000),
    prompt: input.prompt.trim(),
    promptWords: wordCount(input.prompt),
    archiveKey: input.archive?.archiveKey ?? null,
    archiveFileName: input.archive?.archiveFileName ?? null,
    archiveSize: input.archive?.archiveSize ?? null,
    archiveSha256: input.archive?.archiveSha256 ?? null,
    archiveManifest: input.archive?.archiveManifest ?? null,
    demoKey: input.demoKey ?? null,
    dependencies: input.dependencies.slice(0, 80),
    requirements: input.requirements.map((r) => r.trim()).filter(Boolean).slice(0, 20),
    technologyNotes: input.technologyNotes.trim().slice(0, 2000),
    releasedAt: input.release ? new Date() : null,
  });
  if (input.release) await releaseVersion(productId, id);
  return id;
}

export async function releaseVersion(productId: string, versionId: string) {
  const db = getDb();
  const [v] = await db
    .select({ id: productVersion.id, releasedAt: productVersion.releasedAt })
    .from(productVersion)
    .where(and(eq(productVersion.id, versionId), eq(productVersion.productId, productId)));
  if (!v) throw new AdminInputError("Version not found.");
  if (!v.releasedAt) await db.update(productVersion).set({ releasedAt: new Date() }).where(eq(productVersion.id, versionId));
  await db.update(product).set({ currentVersionId: versionId, updatedAt: new Date() }).where(eq(product.id, productId));
}

/** Updates prompt / notes of an existing version without touching files. */
export async function updateVersionText(
  versionId: string,
  input: { prompt: string; changelog: string; requirements: string[]; technologyNotes: string },
) {
  if (input.prompt.length > 60_000) throw new AdminInputError("The prompt is too long (60,000 characters maximum).");
  const db = getDb();
  const [v] = await db.select().from(productVersion).where(eq(productVersion.id, versionId));
  if (!v) throw new AdminInputError("Version not found.");
  if (!input.prompt.trim() && !v.archiveKey) {
    throw new AdminInputError("This version has no source archive, so it needs a prompt.");
  }
  await db
    .update(productVersion)
    .set({
      prompt: input.prompt.trim(),
      promptWords: wordCount(input.prompt),
      changelog: input.changelog.trim().slice(0, 4000),
      requirements: input.requirements.map((r) => r.trim()).filter(Boolean).slice(0, 20),
      technologyNotes: input.technologyNotes.trim().slice(0, 2000),
    })
    .where(eq(productVersion.id, versionId));
  return v.productId;
}

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

export async function addProductMedia(productId: string, kind: "poster" | "screenshot", data: Buffer, alt: string) {
  const cleanAlt = alt.trim().slice(0, 200);
  if (!cleanAlt) throw new AdminInputError("Describe the image in the alt text field.");
  const db = getDb();
  const [p] = await db.select({ id: product.id }).from(product).where(eq(product.id, productId));
  if (!p) throw new AdminInputError("Product not found.");

  const stored = await storePreviewImage(data, { productId, kind });
  if (kind === "poster") {
    const old = await db
      .select()
      .from(productMedia)
      .where(and(eq(productMedia.productId, productId), eq(productMedia.kind, "poster")));
    await db.delete(productMedia).where(and(eq(productMedia.productId, productId), eq(productMedia.kind, "poster")));
    for (const m of old) await removePreviewImage(m.storageKey, m.widths);
  }
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${productMedia.sortOrder}), -1) + 1` })
    .from(productMedia)
    .where(and(eq(productMedia.productId, productId), eq(productMedia.kind, kind)));
  await db.insert(productMedia).values({
    id: newId("med"),
    productId,
    kind,
    storageKey: stored.key,
    widths: stored.widths,
    width: stored.width,
    height: stored.height,
    alt: cleanAlt,
    sortOrder: next,
  });
}

export async function removeProductMedia(mediaId: string) {
  const db = getDb();
  const [m] = await db.select().from(productMedia).where(eq(productMedia.id, mediaId));
  if (!m) return null;
  if (m.kind === "poster") {
    const [p] = await db.select({ status: product.status }).from(product).where(eq(product.id, m.productId));
    if (p?.status === "published") throw new AdminInputError("A published product needs a poster. Upload a replacement instead.");
  }
  await db.delete(productMedia).where(eq(productMedia.id, mediaId));
  await removePreviewImage(m.storageKey, m.widths);
  return m.productId;
}

export async function productsUsingTags(tagIds: string[]) {
  if (!tagIds.length) return [];
  return getDb().select({ productId: productTag.productId }).from(productTag).where(inArray(productTag.tagId, tagIds));
}

export { TAG_KINDS };
