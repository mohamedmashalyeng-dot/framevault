"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { PRODUCT_STATUSES, type Dependency, type ProductStatus, type TagKind } from "@/db/schema";
import { parsePriceInput } from "@/lib/money";
import {
  addProductMedia,
  AdminInputError,
  createProduct,
  createVersion,
  deleteCategory,
  deleteDraftProduct,
  deleteTag,
  ensureTag,
  getProductForAdmin,
  releaseVersion,
  removeProductMedia,
  renameTag,
  saveCategory,
  setProductStatus,
  updateProduct,
  updateVersionText,
  type ProductInput,
} from "../admin/catalogue";
import { setUserRole } from "../admin/people";
import { CATALOGUE_TAG, SETTINGS_TAG } from "../catalogue/cached";
import { storeSourceArchive } from "../ingest/archive";
import { installDemoFromZip } from "../ingest/demo";
import { ImageValidationError } from "../ingest/media";
import { readZipEntry, ZipValidationError } from "../ingest/zip";
import { refundOrder } from "../orders";
import { ForbiddenError, requireAdminAction } from "../session";
import { saveAllAccessSettings } from "../settings";

/**
 * Administrator Server Actions. Every action re-checks the admin role on the
 * server before doing anything, then invalidates the public catalogue cache
 * when customer-visible data changed.
 */

export type AdminFormState = { error: string | null; success: string | null };
const ok = (success: string): AdminFormState => ({ error: null, success });

function failure(error: unknown): AdminFormState {
  if (error instanceof AdminInputError || error instanceof ZipValidationError || error instanceof ImageValidationError) {
    return { error: error.message, success: null };
  }
  if (error instanceof ForbiddenError) return { error: error.message, success: null };
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return { error: `${issue.path.join(".") || "Input"}: ${issue.message}`, success: null };
  }
  console.error("[admin] action failed", error);
  return { error: "Something went wrong. Check the server logs for details.", success: null };
}

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const list = (value: string) =>
  value
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);

function readProductForm(data: FormData): ProductInput {
  const price = parsePriceInput(text(data, "price") || "0");
  if (price === null) throw new AdminInputError("Enter the price as a number, for example 29 or 29.00.");
  return {
    title: text(data, "title"),
    slug: text(data, "slug") || undefined,
    tagline: text(data, "tagline"),
    description: text(data, "description"),
    categoryId: text(data, "categoryId"),
    priceCents: price,
    licenceType: text(data, "licenceType") === "free" ? "free" : "standard",
    licenceSummary: text(data, "licenceSummary"),
    isFeatured: data.get("isFeatured") === "on",
    featuredRank: Number.parseInt(text(data, "featuredRank") || "0", 10) || 0,
    technologies: list(text(data, "technologies")),
    styles: list(text(data, "styles")),
    topics: list(text(data, "topics")),
  };
}

async function readUpload(data: FormData, key: string): Promise<{ name: string; buffer: Buffer } | null> {
  const file = data.get(key);
  if (!(file instanceof File) || file.size === 0) return null;
  return { name: file.name, buffer: Buffer.from(await file.arrayBuffer()) };
}

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

export async function createProductAction(_prev: AdminFormState, data: FormData): Promise<AdminFormState> {
  let id: string;
  try {
    await requireAdminAction();
    id = await createProduct(readProductForm(data));
    updateTag(CATALOGUE_TAG);
  } catch (error) {
    return failure(error);
  }
  redirect(`/admin/products/${id}?created=1`);
}

export async function updateProductAction(productId: string, _prev: AdminFormState, data: FormData): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    await updateProduct(productId, readProductForm(data));
    updateTag(CATALOGUE_TAG);
    return ok("Product details saved.");
  } catch (error) {
    return failure(error);
  }
}

export async function setProductStatusAction(productId: string, status: ProductStatus): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    if (!PRODUCT_STATUSES.includes(status)) throw new AdminInputError("Unknown status.");
    await setProductStatus(productId, status);
    updateTag(CATALOGUE_TAG);
    return ok(status === "published" ? "Product published." : status === "archived" ? "Product archived." : "Product moved to draft.");
  } catch (error) {
    return failure(error);
  }
}

export async function deleteDraftAction(productId: string): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    await deleteDraftProduct(productId);
    updateTag(CATALOGUE_TAG);
  } catch (error) {
    return failure(error);
  }
  redirect("/admin/products?deleted=1");
}

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

export async function uploadMediaAction(productId: string, _prev: AdminFormState, data: FormData): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    const upload = await readUpload(data, "file");
    if (!upload) throw new AdminInputError("Choose an image to upload.");
    const kind = text(data, "kind") === "poster" ? "poster" : "screenshot";
    await addProductMedia(productId, kind, upload.buffer, text(data, "alt"));
    updateTag(CATALOGUE_TAG);
    return ok(kind === "poster" ? "Poster updated." : "Screenshot added.");
  } catch (error) {
    return failure(error);
  }
}

export async function removeMediaAction(mediaId: string): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    await removeProductMedia(mediaId);
    updateTag(CATALOGUE_TAG);
    return ok("Image removed.");
  } catch (error) {
    return failure(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Versions                                                                   */
/* -------------------------------------------------------------------------- */

async function dependenciesFromArchive(buffer: Buffer): Promise<Dependency[]> {
  try {
    const raw = await readZipEntry(buffer, (p) => /^([^/]+\/)?package\.json$/.test(p));
    if (!raw) return [];
    const pkg = JSON.parse(raw.toString("utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const take = (obj: Record<string, string> | undefined, dev: boolean) =>
      Object.entries(obj ?? {})
        .filter(([name, version]) => typeof version === "string" && name.length < 120)
        .map(([name, version]) => ({ name, version: version.slice(0, 60), ...(dev ? { dev: true } : {}) }));
    return [...take(pkg.dependencies, false), ...take(pkg.devDependencies, true)].slice(0, 80);
  } catch {
    return [];
  }
}

export async function createVersionAction(productId: string, _prev: AdminFormState, data: FormData): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    const existing = await getProductForAdmin(productId);
    if (!existing) throw new AdminInputError("Product not found.");

    const archiveUpload = await readUpload(data, "archive");
    const demoUpload = await readUpload(data, "demo");
    const archive = archiveUpload ? await storeSourceArchive(archiveUpload.buffer, archiveUpload.name) : null;

    // Without a new demo bundle the new version keeps the current preview.
    const current = existing.versions.find((v) => v.id === existing.product.currentVersionId);
    const demoKey = demoUpload ? await installDemoFromZip(demoUpload.buffer) : (current?.demoKey ?? null);

    await createVersion(productId, {
      version: text(data, "version"),
      changelog: text(data, "changelog"),
      prompt: String(data.get("prompt") ?? ""),
      requirements: String(data.get("requirements") ?? "").split("\n"),
      technologyNotes: text(data, "technologyNotes"),
      dependencies: archive ? await dependenciesFromArchive(archiveUpload!.buffer) : (current?.dependencies ?? []),
      archive,
      demoKey,
      release: data.get("release") === "on",
    });
    updateTag(CATALOGUE_TAG);
    return ok("Version created.");
  } catch (error) {
    return failure(error);
  }
}

export async function updateVersionTextAction(versionId: string, _prev: AdminFormState, data: FormData): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    await updateVersionText(versionId, {
      prompt: String(data.get("prompt") ?? ""),
      changelog: text(data, "changelog"),
      requirements: String(data.get("requirements") ?? "").split("\n"),
      technologyNotes: text(data, "technologyNotes"),
    });
    updateTag(CATALOGUE_TAG);
    return ok("Version updated.");
  } catch (error) {
    return failure(error);
  }
}

export async function releaseVersionAction(productId: string, versionId: string): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    await releaseVersion(productId, versionId);
    updateTag(CATALOGUE_TAG);
    return ok("Current version changed.");
  } catch (error) {
    return failure(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Taxonomy                                                                   */
/* -------------------------------------------------------------------------- */

export async function saveCategoryAction(categoryId: string | null, _prev: AdminFormState, data: FormData): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    await saveCategory(
      { name: text(data, "name"), slug: text(data, "slug") || undefined, description: text(data, "description"), sortOrder: Number(text(data, "sortOrder") || 0) },
      categoryId ?? undefined,
    );
    updateTag(CATALOGUE_TAG);
    return ok(categoryId ? "Category saved." : "Category created.");
  } catch (error) {
    return failure(error);
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    await deleteCategory(categoryId);
    updateTag(CATALOGUE_TAG);
    return ok("Category deleted.");
  } catch (error) {
    return failure(error);
  }
}

export async function createTagAction(_prev: AdminFormState, data: FormData): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    const kind = text(data, "kind") as TagKind;
    if (!["technology", "style", "topic"].includes(kind)) throw new AdminInputError("Choose a tag type.");
    await ensureTag(kind, text(data, "name"));
    refresh();
    return ok("Tag created.");
  } catch (error) {
    return failure(error);
  }
}

export async function renameTagAction(tagId: string, _prev: AdminFormState, data: FormData): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    await renameTag(tagId, text(data, "name"));
    updateTag(CATALOGUE_TAG);
    return ok("Tag renamed.");
  } catch (error) {
    return failure(error);
  }
}

export async function deleteTagAction(tagId: string): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    await deleteTag(tagId);
    updateTag(CATALOGUE_TAG);
    return ok("Tag deleted.");
  } catch (error) {
    return failure(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Orders, customers, settings                                                */
/* -------------------------------------------------------------------------- */

export async function refundOrderAction(orderId: string): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    const result = await refundOrder(orderId);
    refresh();
    return result.ok ? ok(result.message) : { error: result.message, success: null };
  } catch (error) {
    return failure(error);
  }
}

export async function setUserRoleAction(userId: string, role: "admin" | "customer"): Promise<AdminFormState> {
  try {
    const admin = await requireAdminAction();
    await setUserRole(admin.id, userId, role);
    refresh();
    return ok(role === "admin" ? "User is now an administrator." : "Administrator role removed.");
  } catch (error) {
    return failure(error);
  }
}

export async function saveAllAccessAction(_prev: AdminFormState, data: FormData): Promise<AdminFormState> {
  try {
    await requireAdminAction();
    const price = parsePriceInput(text(data, "price"));
    if (price === null || price < 100) throw new AdminInputError("Enter a price of at least 1.00.");
    await saveAllAccessSettings({ enabled: data.get("enabled") === "on", priceCents: price });
    updateTag(SETTINGS_TAG);
    return ok("All-access settings saved.");
  } catch (error) {
    return failure(error);
  }
}
