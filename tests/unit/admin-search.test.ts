import { beforeAll, describe, expect, it } from "vitest";
import { listProductsForAdmin } from "@/server/admin/catalogue";
import { createTestProduct, setupDatabase } from "./helpers";

beforeAll(setupDatabase);

describe("admin search", () => {
  it("matches ids and slugs containing LIKE wildcards literally", async () => {
    await createTestProduct({ priceCents: 0, slug: "alpha-one" });
    await createTestProduct({ priceCents: 0, slug: "alphaxone" });
    const exact = await listProductsForAdmin({ q: "alpha-one" });
    expect(exact.map((p) => p.slug)).toEqual(["alpha-one"]);
    expect(await listProductsForAdmin({ q: "alpha%" })).toHaveLength(0);
    expect(await listProductsForAdmin({ q: "alpha_one" })).toHaveLength(0);
  });
});
