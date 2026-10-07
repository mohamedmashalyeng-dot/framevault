import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test.describe("mobile layouts", () => {
  for (const path of ["/", "/catalogue", "/products/meridian-studio", "/products/terminal-folio", "/all-access", "/sign-in"]) {
    test(`${path} fits the screen`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }

  test("navigation menu and collapsible filters work on small screens", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Open navigation").click();
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Components" }).click();
    await expect(page).toHaveURL(/category=components/);

    await page.locator("summary", { hasText: "Filters" }).click();
    await page.locator("details").getByRole("link", { name: /^Free/ }).click();
    await expect(page).toHaveURL(/price=free/);
  });

  test("product preview switches to the mobile width", async ({ page }) => {
    await page.goto("/products/signalboard");
    await page.getByRole("button", { name: "Load interactive preview" }).click();
    await expect(page.frameLocator("iframe").getByRole("heading", { level: 1 })).toContainText("Product analytics");
    await expectNoHorizontalScroll(page);
  });
});
