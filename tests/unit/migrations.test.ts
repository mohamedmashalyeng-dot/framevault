import { readFile } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { category } from "@/db/schema";
import { listCategories } from "@/server/catalogue/queries";
import { setupDatabase } from "./helpers";

beforeAll(setupDatabase);

describe("default categories", () => {
  it("exist after migrating, so a store that was never seeded can still upload products", async () => {
    expect((await listCategories()).map((c) => c.slug)).toEqual(["full-websites", "landing-pages", "components", "sections", "backgrounds"]);
  });

  it("are not added to a store that already has categories", async () => {
    await getDb().delete(category).where(eq(category.slug, "sections"));
    await getDb().run(sql.raw(await readFile("drizzle/0004_default_categories.sql", "utf8")));
    expect((await listCategories()).map((c) => c.slug)).not.toContain("sections");
  });
});
