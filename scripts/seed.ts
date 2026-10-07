/**
 * Seeds categories, the six starter products (demo inventory) and the local
 * admin / customer accounts. Idempotent: existing products and users are
 * left alone. Pass --reset to delete and recreate the demo inventory.
 *
 * Usage: npm run db:seed [-- --reset]
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { runMigrations } from "../src/db/migrate";
import { account, category, product, productMedia, productVersion, setting, user } from "../src/db/schema";
import {
  addProductMedia,
  createProduct,
  createVersion,
  saveCategory,
  setProductStatus,
} from "../src/server/admin/catalogue";
import { rebuildSearchIndex } from "../src/server/catalogue/search-index";
import { newId } from "../src/server/ids";
import { storeSourceArchive } from "../src/server/ingest/archive";
import { installDemoFromDirectory, removeDemo } from "../src/server/ingest/demo";
import { removePreviewImage } from "../src/server/ingest/media";
import { zipDirectory } from "../src/server/ingest/zip";
import { licenceText } from "../src/server/licence";
import { DEFAULT_ALL_ACCESS } from "../src/server/settings";
import { removePrefix } from "../src/server/storage";
import { loadStarters, type Starter } from "./starters";

const CATEGORIES = [
  { slug: "full-websites", name: "Full Websites", description: "Complete multi-section sites ready to adapt and deploy." },
  { slug: "landing-pages", name: "Landing Pages", description: "Focused launch and marketing pages built to convert." },
  { slug: "components", name: "Components", description: "Reusable interface pieces you can drop into any stack." },
  { slug: "sections", name: "Sections", description: "Self-contained page sections: features, pricing, FAQs and more." },
  { slug: "backgrounds", name: "Backgrounds", description: "Animated and generative backdrops for heroes and panels." },
];

async function seedCategories() {
  const ids = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const [existing] = await getDb().select({ id: category.id }).from(category).where(eq(category.slug, c.slug));
    ids.set(c.slug, existing?.id ?? (await saveCategory({ ...c, sortOrder: i })));
  }
  return ids;
}

async function removeDemoInventory() {
  const db = getDb();
  const demos = await db.select({ id: product.id }).from(product).where(eq(product.isDemoContent, true));
  for (const { id } of demos) {
    const versions = await db.select().from(productVersion).where(eq(productVersion.productId, id));
    const media = await db.select().from(productMedia).where(eq(productMedia.productId, id));
    await db.delete(product).where(eq(product.id, id));
    for (const v of versions) {
      if (v.archiveKey) await removePrefix("private", v.archiveKey);
      if (v.demoKey) await removeDemo(v.demoKey);
    }
    for (const m of media) await removePreviewImage(m.storageKey, m.widths);
  }
  console.log(`Removed ${demos.length} demo products.`);
}

async function readDependencies(starter: Starter) {
  if (!starter.sourceDir) return [];
  try {
    const pkg = JSON.parse(await readFile(path.join(starter.sourceDir, "package.json"), "utf8"));
    return [
      ...Object.entries((pkg.dependencies ?? {}) as Record<string, string>).map(([name, version]) => ({ name, version })),
      ...Object.entries((pkg.devDependencies ?? {}) as Record<string, string>).map(([name, version]) => ({
        name,
        version,
        dev: true,
      })),
    ];
  } catch {
    return [];
  }
}

async function seedStarter(starter: Starter, categoryId: string, publishedAt: Date) {
  const db = getDb();
  const [existing] = await db.select({ id: product.id }).from(product).where(eq(product.slug, starter.slug));
  if (existing) {
    console.log(`- ${starter.slug}: already present, skipped`);
    return;
  }

  const productId = await createProduct(
    {
      title: starter.title,
      slug: starter.slug,
      tagline: starter.tagline,
      description: starter.description,
      categoryId,
      priceCents: starter.priceCents,
      licenceType: starter.licenceType,
      isFeatured: starter.featured,
      featuredRank: starter.featuredRank,
      technologies: starter.technologies,
      styles: starter.styles,
      topics: starter.topics,
    },
    { isDemoContent: true },
  );

  let archive = null;
  if (starter.sourceDir) {
    const zip = await zipDirectory(starter.sourceDir, `${starter.slug}-${starter.version}`, {
      "LICENCE.txt": licenceText({ productTitle: starter.title, version: starter.version, licenceType: starter.licenceType }),
    });
    archive = await storeSourceArchive(zip, `${starter.slug}-v${starter.version}.zip`);
  }
  const demoKey = await installDemoFromDirectory(starter.demoDir);

  await createVersion(productId, {
    version: starter.version,
    changelog: starter.changelog,
    prompt: starter.prompt,
    dependencies: await readDependencies(starter),
    requirements: starter.requirements,
    technologyNotes: starter.technologyNotes,
    archive,
    demoKey,
    release: true,
  });

  await addProductMedia(productId, "poster", await readFile(path.join(starter.mediaDir, "poster.png")), starter.posterAlt);
  for (const [i, alt] of starter.screenshotAlts.entries()) {
    const file = path.join(starter.mediaDir, `screenshot-${i + 1}.png`);
    await addProductMedia(productId, "screenshot", await readFile(file), alt);
  }

  await setProductStatus(productId, "published");
  // Stagger publication dates so "newest" ordering is stable and meaningful.
  await db.update(product).set({ publishedAt }).where(eq(product.id, productId));
  console.log(`- ${starter.slug}: created (${archive ? `source ${archive.archiveManifest.fileCount} files` : "prompt only"})`);
}

async function ensureUser(email: string | undefined, password: string | undefined, name: string, role: "admin" | "customer") {
  if (!email || !password) {
    console.log(`- ${role} account: skipped (set SEED_${role.toUpperCase()}_EMAIL and _PASSWORD)`);
    return;
  }
  const db = getDb();
  const normalised = email.trim().toLowerCase();
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, normalised));
  if (existing) {
    await db.update(user).set({ role }).where(eq(user.id, existing.id));
    console.log(`- ${role} account: ${normalised} (exists)`);
    return;
  }
  if (password.length < 10) throw new Error(`SEED_${role.toUpperCase()}_PASSWORD must be at least 10 characters.`);
  const id = newId("usr");
  await db.insert(user).values({ id, name, email: normalised, emailVerified: true, role });
  await db.insert(account).values({
    id: newId("acc"),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(password),
  });
  console.log(`- ${role} account: ${normalised} (created)`);
}

async function main() {
  const reset = process.argv.includes("--reset");
  await runMigrations();
  if (reset) await removeDemoInventory();

  const categoryIds = await seedCategories();
  const starters = await loadStarters();
  const now = Date.now();
  for (const [i, starter] of starters.entries()) {
    const categoryId = categoryIds.get(starter.category);
    if (!categoryId) throw new Error(`Unknown category ${starter.category} for ${starter.slug}`);
    await seedStarter(starter, categoryId, new Date(now - (starters.length - i) * 36 * 60 * 60 * 1000));
  }

  await getDb()
    .insert(setting)
    .values({ key: "all_access", value: DEFAULT_ALL_ACCESS })
    .onConflictDoNothing();

  await ensureUser(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD, "Store Admin", "admin");
  await ensureUser(process.env.SEED_CUSTOMER_EMAIL, process.env.SEED_CUSTOMER_PASSWORD, "Demo Customer", "customer");

  await rebuildSearchIndex();
  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
