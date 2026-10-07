import { expect, test } from "@playwright/test";

test.describe("catalogue", () => {
  test("home leads into the catalogue", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("finished");
    await page.getByRole("link", { name: /Explore templates/ }).click();
    await expect(page).toHaveURL(/\/catalogue$/);
    await expect(page.getByRole("heading", { name: "Find your starting point" })).toBeVisible();
  });

  test("search matches title, description and tags", async ({ page }) => {
    await page.goto("/catalogue");
    const search = page.getByLabel("Search by title, description or tag");
    await search.fill("pricing");
    await search.press("Enter");
    await expect(page).toHaveURL(/q=pricing/);
    await expect(page.getByRole("heading", { level: 3, name: "Tally Pricing Component" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Meridian Architecture Studio" })).toHaveCount(0);

    await page.goto("/catalogue?q=marching");
    await expect(page.getByRole("heading", { level: 3, name: "Contour Field Background" })).toBeVisible();

    await page.goto("/catalogue?q=zzzz-nothing");
    await expect(page.getByText("No products match these filters.")).toBeVisible();
    await page.getByRole("link", { name: "Clear all filters" }).first().click();
    await expect(page).toHaveURL(/\/catalogue$/);
  });

  test("filters are reflected in shareable URLs", async ({ page }) => {
    await page.goto("/catalogue");
    const filters = page.locator("aside").locator("div.hidden.lg\\:block");
    await filters.getByRole("link", { name: /^Free/ }).click();
    await expect(page).toHaveURL(/price=free/);
    const prices = page.locator("article").getByText("Free", { exact: true });
    await expect(prices).toHaveCount(2);

    await filters.getByRole("link", { name: /^Canvas/ }).click();
    await expect(page).toHaveURL(/price=free&tech=canvas|tech=canvas.*price=free|price=free.*tech=canvas/);
    await expect(page.locator("article h3")).toHaveText(["Contour Field Background"]);

    // Reloading the shared URL restores the same result.
    await page.reload();
    await expect(page.locator("article h3")).toHaveText(["Contour Field Background"]);
    await expect(page.getByRole("list", { name: "Active filters" }).getByRole("link")).toHaveCount(2);

    await page.goto("/catalogue?category=landing-pages&style=dark");
    await expect(page.locator("article h3")).toHaveText(["Terminal Folio Prompt", "Signalboard SaaS Landing"]);
  });

  test("sorting by price and bounded pagination", async ({ page }) => {
    await page.goto("/catalogue?sort=price-desc");
    await expect(page.locator("article h3").first()).toHaveText("Meridian Architecture Studio");
    await page.goto("/catalogue?sort=price-asc&price=paid");
    await expect(page.locator("article h3").first()).toHaveText("Filler Section 01");

    await page.goto("/catalogue");
    const total = Number((await page.locator("#results-heading").innerText()).match(/\d+/)![0]);
    expect(total).toBeGreaterThan(12);
    await expect(page.locator("article")).toHaveCount(12);
    const pager = page.getByRole("navigation", { name: "Pagination" });
    await pager.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator("article")).toHaveCount(total - 12);
    await expect(pager.getByRole("link", { name: "2" })).toHaveAttribute("aria-current", "page");

    // Out-of-range pages are clamped instead of producing unbounded queries.
    await page.goto("/catalogue?page=9999");
    await expect(page.locator("article")).toHaveCount(total - 12);
  });

  test("product cards link to detail pages", async ({ page }) => {
    await page.goto("/catalogue?category=components");
    await page.getByRole("link", { name: "Tally Pricing Component" }).click();
    await expect(page).toHaveURL(/\/products\/tally-pricing$/);
    await expect(page.getByRole("heading", { level: 1, name: "Tally Pricing Component" })).toBeVisible();
  });

  test("sitemap and robots exclude private areas", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/products/meridian-studio");
    expect(sitemap).not.toContain("/account");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /account");
    const admin = await request.get("/admin", { maxRedirects: 0 });
    expect([307, 308]).toContain(admin.status());
  });
});
