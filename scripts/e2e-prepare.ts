/**
 * Prepares the isolated end-to-end environment: wipes the e2e database and
 * storage, seeds the starter inventory and test accounts, and adds a few
 * filler products so catalogue pagination can be exercised.
 * Invoked by playwright.config.ts with the e2e environment variables set.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { category } from "../src/db/schema";
import { addProductMedia, createProduct, createVersion, setProductStatus } from "../src/server/admin/catalogue";
import { env } from "../src/server/env";

async function main() {
  const { DATABASE_URL, STORAGE_DIR } = env();
  if (!DATABASE_URL.includes("e2e") || !STORAGE_DIR.includes("e2e")) {
    throw new Error("Refusing to reset: DATABASE_URL and STORAGE_DIR must point at e2e locations.");
  }
  await rm(path.resolve(DATABASE_URL.replace(/^file:/, "")), { force: true });
  await rm(path.resolve(STORAGE_DIR), { recursive: true, force: true });

  execSync("npx tsx scripts/seed.ts", { stdio: "inherit", env: process.env });

  const [sections] = await getDb().select().from(category).where(eq(category.slug, "sections"));
  const poster = await readFile(path.resolve("content/starters/bento-features/media/poster.png"));
  for (let i = 1; i <= 8; i++) {
    const id = await createProduct({
      title: `Filler Section ${String(i).padStart(2, "0")}`,
      slug: `filler-section-${i}`,
      tagline: "Pagination fixture for the end-to-end tests.",
      description: "A placeholder product used only by the automated tests.",
      categoryId: sections.id,
      priceCents: 500 + i * 100,
      licenceType: "standard",
      technologies: ["HTML"],
      styles: ["Light"],
    });
    await createVersion(id, {
      version: "1.0.0",
      changelog: "Fixture",
      prompt: `Filler prompt ${i} for pagination tests only.`,
      dependencies: [],
      requirements: [],
      technologyNotes: "",
      archive: null,
      demoKey: null,
      release: true,
    });
    await addProductMedia(id, "poster", poster, `Filler ${i} poster`);
    await setProductStatus(id, "published");
  }
  console.log("e2e environment ready");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
