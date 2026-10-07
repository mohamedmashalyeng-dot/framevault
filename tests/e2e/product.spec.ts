import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { inspectZip } from "../../src/server/ingest/zip";

test.describe("product pages and previews", () => {
  test("loads the interactive demo only on request, sandboxed", async ({ page }) => {
    await page.goto("/products/meridian-studio");
    await expect(page.locator("iframe")).toHaveCount(0);
    await page.getByRole("button", { name: "Load interactive preview" }).click();

    const iframe = page.locator("iframe");
    await expect(iframe).toHaveAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-modals");
    const frame = page.frameLocator("iframe");
    await expect(frame.getByRole("heading", { level: 1 })).toContainText("Buildings that");

    // The demo runs in an opaque origin: no access to this site's cookies or storage.
    const handle = await iframe.elementHandle();
    const demo = await handle!.contentFrame();
    const isolation = await demo!.evaluate(() => {
      const probe = (fn: () => unknown) => {
        try {
          fn();
          return "readable";
        } catch {
          return "blocked";
        }
      };
      return { cookie: probe(() => document.cookie), storage: probe(() => window.localStorage), parent: probe(() => window.parent.document.title) };
    });
    expect(isolation).toEqual({ cookie: "blocked", storage: "blocked", parent: "blocked" });

    await page.getByRole("button", { name: "Mobile", exact: true }).click();
    await expect(page.locator("iframe")).toHaveCSS("width", "390px");
  });

  test("demo responses carry a sandboxing CSP and the live demo page works", async ({ page, request }) => {
    await page.goto("/products/signalboard");
    const href = await page.getByRole("link", { name: /Open live demo/ }).getAttribute("href");
    expect(href).toBe("/preview/signalboard");
    await page.goto(href!);
    const src = await page.locator("iframe").getAttribute("src");
    const res = await request.get(src!);
    expect(res.status()).toBe(200);
    const csp = res.headers()["content-security-policy"];
    expect(csp).toContain("sandbox allow-scripts");
    expect(csp).toContain("connect-src 'none'");
    expect(res.headers()["x-robots-tag"]).toBe("noindex");
    await expect(page.frameLocator("iframe").getByRole("heading", { level: 1 })).toContainText("Product analytics");
  });

  test("shows precise deliverables and product facts", async ({ page }) => {
    await page.goto("/products/meridian-studio");
    const included = page.getByRole("region", { name: "What you get" });
    await expect(included).toContainText("Source code ZIP");
    await expect(included).toContainText(".env.example");
    await expect(included).toContainText("AI prompt");
    await expect(page.getByText("Version", { exact: true })).toBeVisible();
    await expect(page.getByText("v1.0.0").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Licence summary" })).toBeVisible();
    await expect(page.getByRole("region", { name: "You might also like" })).toBeVisible();

    // A prompt-only product must not claim source code.
    await page.goto("/products/terminal-folio");
    const promptOnly = page.getByRole("region", { name: "What you get" });
    await expect(promptOnly).toContainText("Prompt only: this product does not include downloadable source code.");
    await expect(promptOnly).not.toContainText("Source code ZIP");
    await expect(page.getByText(/Source ZIP/)).toHaveCount(0);
  });

  test("free prompt can be copied and free source downloaded without an account", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/products/bento-features");
    await page.getByRole("button", { name: "View & copy prompt" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText('Build "Bento": a soft pastel feature grid section');
    await dialog.getByRole("button", { name: "Copy prompt" }).click();
    await expect(dialog.getByRole("button", { name: "Copied" })).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("Bento");
    await dialog.getByRole("button", { name: "Close prompt" }).click();

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download source/ }).click()]);
    expect(download.suggestedFilename()).toBe("bento-features-v1.0.0.zip");
    const entries = (await inspectZip(await readFile((await download.path())!))).map((e) => e.path);
    expect(entries).toEqual(
      expect.arrayContaining(["bento-features-1.0.0/README.md", "bento-features-1.0.0/LICENCE.txt", "bento-features-1.0.0/index.html", "bento-features-1.0.0/styles.css"]),
    );
  });

  test("paid deliverables are locked for visitors and never in the page", async ({ page, request }) => {
    await page.goto("/products/meridian-studio");
    await expect(page.getByRole("link", { name: /Sign in to buy/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /copy prompt/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
    await expect(page.getByText(/AI prompt · \d+ words/)).toBeVisible();

    const html = await (await request.get("/products/meridian-studio")).text();
    expect(html).not.toContain('Build "Meridian": an editorial architecture studio website');
    expect(html).not.toContain("archives/");

    const forged = await request.get("/api/downloads/eyJ2IjoidmVyIn0.forged");
    expect(forged.status()).toBe(403);
    const missing = await request.get("/media/p/unknown/poster-x-480.webp");
    expect(missing.status()).toBe(404);
  });

  test("unknown products return the not-found page", async ({ page }) => {
    await page.goto("/products/does-not-exist");
    await expect(page.getByText("This page doesn’t exist.")).toBeVisible();
  });
});
