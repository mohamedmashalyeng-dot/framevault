import { expect, test } from "@playwright/test";
import path from "node:path";
import yazl from "yazl";
import { ADMIN, signIn } from "./helpers";

async function makeZip(files: Record<string, string>): Promise<Buffer> {
  const zip = new yazl.ZipFile();
  for (const [name, content] of Object.entries(files)) zip.addBuffer(Buffer.from(content), name);
  zip.end();
  const chunks: Buffer[] = [];
  for await (const chunk of zip.outputStream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

test.describe("administration", () => {
  test("upload a product with source, demo and prompt on one page", async ({ page, browser }) => {
    await signIn(page, ADMIN, "/admin");
    await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Upload product" }).click();
    await expect(page.getByRole("heading", { name: "Upload a product" })).toBeVisible();

    const fillDetails = async () => {
      await page.getByLabel("Title").fill("Halo Hero Section");
      await page.getByLabel("Category").selectOption({ label: "Sections" });
      await page.getByLabel("Tagline").fill("A calm hero section in plain HTML and CSS.");
      await page.getByLabel("Description", { exact: true }).fill("A hero section uploaded by the admin end-to-end test.");
      await page.getByLabel("Price").fill("15");
      await page.getByLabel("Technologies").fill("HTML, CSS");
      await page.getByLabel("Visual styles").fill("Minimal");
      await page.getByLabel(/^Poster \(required/).setInputFiles(path.resolve("content/starters/bento-features/media/poster.png"));
    };

    // A source ZIP without a licence is rejected and nothing is created.
    await fillDetails();
    await page.getByLabel(/^Source code ZIP/).setInputFiles({
      name: "halo.zip",
      mimeType: "application/zip",
      buffer: await makeZip({ "README.md": "# Halo", "index.html": "<h1>Halo</h1>" }),
    });
    await page.getByRole("button", { name: "Upload product" }).click();
    await expect(page.getByText("Source archives must include a LICENCE or LICENSE file.")).toBeVisible();
    const visitor = await browser.newPage();
    await visitor.goto("/products/halo-hero-section");
    await expect(visitor.getByText("This page doesn’t exist.")).toBeVisible();

    // A complete upload goes live in one step.
    await page.goto("/admin/products/new");
    await fillDetails();
    await page.getByLabel(/^Source code ZIP/).setInputFiles({
      name: "halo-hero.zip",
      mimeType: "application/zip",
      buffer: await makeZip({
        "halo/README.md": "# Halo\n\nOpen index.html in a browser.",
        "halo/LICENCE.txt": "Standard licence",
        "halo/index.html": '<!doctype html><link rel="stylesheet" href="styles.css"><h1>Halo hero</h1>',
        "halo/styles.css": "h1 { font-family: system-ui; }",
      }),
    });
    await page.getByLabel(/Use the source ZIP itself as the live demo/).check();
    await page.getByLabel(/^Prompt/).fill("Build a calm hero section with a headline, a subline and two buttons.");
    await page.getByRole("button", { name: "Upload product" }).click();
    await page.waitForURL(/\/admin\/products\/prd_.+\?uploaded=1/);
    await expect(page.getByText("Product uploaded and published. It is live in the catalogue.")).toBeVisible();
    const editUrl = page.url().split("?")[0];

    await visitor.goto("/catalogue?q=halo");
    await expect(visitor.getByRole("heading", { level: 3, name: "Halo Hero Section" })).toBeVisible();
    await visitor.goto("/products/halo-hero-section");
    await expect(visitor.getByRole("region", { name: "What you get" })).toContainText("Source code ZIP (halo-hero.zip)");
    await expect(visitor.getByRole("region", { name: "What you get" })).toContainText("AI prompt");
    await expect(visitor.getByText("$15").first()).toBeVisible();
    await visitor.getByRole("button", { name: "Load interactive preview" }).click();
    await expect(visitor.frameLocator("iframe").getByRole("heading", { name: "Halo hero" })).toBeVisible();
    // The README is part of the paid download, not the public demo.
    const demoSrc = await visitor.locator("iframe").getAttribute("src");
    expect((await visitor.request.get(demoSrc!.replace("index.html", "README.md"))).status()).toBe(404);

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

  test("a new version can be released from the product editor", async ({ page }) => {
    await signIn(page, ADMIN, "/admin/products?q=tally");
    await page.getByRole("link", { name: "Tally Pricing Component" }).click();
    const newVersion = page.locator("form", { has: page.getByRole("button", { name: "Create version" }) });
    await newVersion.getByRole("textbox", { name: "Version" }).fill("1.1.0");
    await newVersion.getByLabel("Changelog").fill("Adds a currency switcher");
    await newVersion.getByRole("button", { name: "Create version" }).click();
    await expect(page.getByText("Version created.")).toBeVisible();
    await page.goto("/products/tally-pricing");
    await expect(page.getByText("v1.1.0").first()).toBeVisible();
    await expect(page.getByText("Adds a currency switcher")).toBeVisible();
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
