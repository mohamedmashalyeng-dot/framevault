import { expect, test } from "@playwright/test";
import path from "node:path";
import { ADMIN, signIn } from "./helpers";

test.describe("administration", () => {
  test("create, upload, version and publish a product", async ({ page, browser }) => {
    await signIn(page, ADMIN, "/admin");
    await page.goto("/admin/products/new");
    await page.getByLabel("Title").fill("Halo Hero Section");
    await page.getByLabel("Category").selectOption({ label: "Sections" });
    await page.getByLabel("Tagline").fill("A glowing-free, calm hero section.");
    await page.getByLabel("Description").fill("A hero section built for the admin end-to-end test.");
    await page.getByLabel("Price").fill("15");
    await page.getByLabel("Technologies").fill("HTML, CSS");
    await page.getByLabel("Visual styles").fill("Minimal");
    await page.getByRole("button", { name: "Create draft" }).click();
    await page.waitForURL(/\/admin\/products\/prd_.+\?created=1/);
    const editUrl = page.url().split("?")[0];

    // Publishing without media and a version is refused with a clear message.
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Release a version before publishing.")).toBeVisible();

    // Drafts are invisible to the public.
    const visitor = await browser.newPage();
    await visitor.goto("/products/halo-hero-section");
    await expect(visitor.getByText("This page doesn’t exist.")).toBeVisible();

    await page.getByLabel("Type").selectOption("poster");
    await page.getByLabel(/^Image/).setInputFiles(path.resolve("content/starters/bento-features/media/poster.png"));
    await page.getByLabel("Alt text").fill("Halo hero section poster");
    await page.getByRole("button", { name: "Upload" }).click();
    await expect(page.getByText("Poster updated.")).toBeVisible();

    // An invalid upload is rejected.
    await page.getByLabel("Type").selectOption("screenshot");
    await page.getByLabel(/^Image/).setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
    await page.getByLabel("Alt text").fill("bad");
    await page.getByRole("button", { name: "Upload" }).click();
    await expect(page.getByText("The file is not a readable image.")).toBeVisible();

    await page.getByLabel("Prompt (protected deliverable)").fill("Build a calm hero section with a headline, a subline and two buttons.");
    await page.getByLabel("Changelog").fill("First release");
    await page.getByRole("button", { name: "Create version" }).click();
    await expect(page.getByText("Version created.")).toBeVisible();

    await page.goto(editUrl);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("button", { name: "Archive", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /View in store/ })).toBeVisible();

    await visitor.goto("/catalogue?q=halo");
    await expect(visitor.getByRole("heading", { level: 3, name: "Halo Hero Section" })).toBeVisible();
    await visitor.goto("/products/halo-hero-section");
    await expect(visitor.getByText("Prompt only: this product does not include downloadable source code.")).toBeVisible();
    await expect(visitor.getByText("$15").first()).toBeVisible();

    // Price changes appear in the store straight away.
    await page.goto(editUrl);
    await page.getByLabel("Price").fill("19");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Product details saved.")).toBeVisible();
    await visitor.goto("/products/halo-hero-section");
    await expect(visitor.getByText("$19").first()).toBeVisible();

    // Archiving removes it from the catalogue.
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByRole("button", { name: "Re-publish" })).toBeVisible();
    await visitor.goto("/catalogue?q=halo");
    await expect(visitor.getByText("No products match these filters.")).toBeVisible();
    await visitor.close();
  });

  test("manage categories, tags and all-access settings", async ({ page }) => {
    await signIn(page, ADMIN, "/admin/taxonomy");
    const newCategory = page.locator("li", { hasText: "New category" });
    await newCategory.getByLabel("Name").fill("Icon Sets");
    await newCategory.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Category created.")).toBeVisible();

    const tagForm = page.locator("form", { has: page.getByRole("button", { name: "Add tag" }) });
    await tagForm.getByLabel("Name").fill("Svelte");
    await tagForm.getByRole("button", { name: "Add tag" }).click();
    await expect(page.getByText("Tag created.")).toBeVisible();

    await page.goto("/admin/settings");
    await page.getByLabel(/^Price/).fill("149");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("All-access settings saved.")).toBeVisible();
    await page.goto("/all-access");
    await expect(page.getByText("$149").first()).toBeVisible();
  });
});
