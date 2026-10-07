import { getDb } from "@/db";
import { runMigrations } from "@/db/migrate";
import { productVersion, user } from "@/db/schema";
import { createProduct, createVersion, saveCategory, setProductStatus } from "@/server/admin/catalogue";
import { newId } from "@/server/ids";
import { putObject } from "@/server/storage";
import { productMedia } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SECRET_PROMPT = "TOP-SECRET-PROMPT-TEXT build a thing with care";

export async function setupDatabase() {
  await runMigrations();
}

export async function createUser(role: "customer" | "admin" = "customer") {
  const id = newId("usr");
  await getDb()
    .insert(user)
    .values({ id, name: `Test ${role}`, email: `${id.toLowerCase()}@example.test`, role, emailVerified: true });
  return { id, email: `${id.toLowerCase()}@example.test`, role };
}

let categoryId: string | null = null;

/** Creates a published product with a prompt and (optionally) a stored archive. */
export async function createTestProduct(opts: { priceCents: number; withArchive?: boolean; slug?: string; publish?: boolean }) {
  categoryId ??= await saveCategory({ name: "Components", slug: "components" });
  const slug = opts.slug ?? `product-${Math.random().toString(36).slice(2, 9)}`;
  const productId = await createProduct({
    title: `Product ${slug}`,
    slug,
    tagline: "A test product",
    description: "Searchable description about aurora gradients.",
    categoryId,
    priceCents: opts.priceCents,
    licenceType: opts.priceCents === 0 ? "free" : "standard",
    technologies: ["React"],
    styles: ["Dark"],
  });

  let archive = null;
  if (opts.withArchive !== false) {
    const archiveKey = `archives/test-${slug}.zip`;
    await putObject("private", archiveKey, Buffer.from("PK-fake-zip-bytes"));
    archive = {
      archiveKey,
      archiveFileName: `${slug}.zip`,
      archiveSize: 17,
      archiveSha256: "0".repeat(64),
      archiveManifest: { fileCount: 1, files: ["README.md"], hasReadme: true, hasLicence: true, hasEnvExample: false, hasPackageJson: false },
    };
  }
  const versionId = await createVersion(productId, {
    version: "1.0.0",
    changelog: "Initial",
    prompt: SECRET_PROMPT,
    dependencies: [],
    requirements: [],
    technologyNotes: "",
    archive,
    demoKey: null,
    release: true,
  });

  // A poster row is required to publish; the image bytes are irrelevant here.
  await getDb().insert(productMedia).values({
    id: newId("med"),
    productId,
    kind: "poster",
    storageKey: `p/${productId}/poster-test`,
    widths: [480],
    width: 1600,
    height: 1000,
    alt: "poster",
  });
  if (opts.publish !== false) await setProductStatus(productId, "published");
  const [v] = await getDb().select().from(productVersion).where(eq(productVersion.id, versionId));
  return { productId, slug, versionId: v.id };
}
