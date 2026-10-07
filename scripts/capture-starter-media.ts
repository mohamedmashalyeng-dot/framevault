/**
 * Captures real screenshots of every starter's demo for its catalogue poster
 * and gallery, so previews always match what the product actually renders.
 * Uses the locally installed Google Chrome through Playwright.
 *
 * Usage: npm run starters:media [-- slug ...]
 */
import { chromium, type Page } from "@playwright/test";
import { createReadStream, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { demoContentType } from "../src/server/ingest/demo";
import { loadStarters, STARTERS_DIR } from "./starters";

type Step = (page: Page) => Promise<void>;

/** A second, distinct view for each product's gallery. */
const DETAIL_VIEW: Record<string, Step> = {
  "meridian-studio": async (page) => {
    await page.locator("#work").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.getElementById("work")?.scrollIntoView());
  },
  signalboard: async (page) => {
    await page.evaluate(() => document.getElementById("features")?.scrollIntoView());
  },
  "tally-pricing": async (page) => {
    await page.locator("tally-pricing").locator("button.switch").click();
  },
  "bento-features": async (page) => {
    await page.evaluate(() => window.scrollTo(0, 520));
  },
  "contour-field": async (page) => {
    await page.getByRole("button", { name: "Paper" }).click();
  },
  "terminal-folio": async (page) => {
    await page.getByRole("button", { name: "theme" }).click();
    await page.getByRole("button", { name: "projects" }).click();
    await page.waitForTimeout(1500);
  },
};

function serveDemos() {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const [, slug, ...rest] = decodeURIComponent(url.pathname).split("/");
    const file = rest.join("/") || "index.html";
    const full = path.join(STARTERS_DIR, slug, "demo", file);
    if (!full.startsWith(STARTERS_DIR) || file.includes("..")) return void res.writeHead(403).end();
    try {
      if (!statSync(full).isFile()) throw new Error();
    } catch {
      return void res.writeHead(404).end();
    }
    res.writeHead(200, { "content-type": demoContentType(full) ?? "application/octet-stream" });
    createReadStream(full).pipe(res);
  });
  return new Promise<{ origin: string; close: () => void }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ origin: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

async function main() {
  const only = process.argv.slice(2);
  const starters = (await loadStarters()).filter((s) => only.length === 0 || only.includes(s.slug));
  const { origin, close } = await serveDemos();
  const browser = await chromium.launch({ channel: "chrome" });

  try {
    for (const starter of starters) {
      await mkdir(starter.mediaDir, { recursive: true });
      const url = `${origin}/${starter.slug}/`;

      const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      await desktop.goto(url, { waitUntil: "load" });
      await desktop.waitForTimeout(1600);
      await desktop.screenshot({ path: path.join(starter.mediaDir, "poster.png") });

      await DETAIL_VIEW[starter.slug]?.(desktop);
      await desktop.waitForTimeout(900);
      await desktop.screenshot({ path: path.join(starter.mediaDir, "screenshot-1.png") });
      await desktop.close();

      const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
      await mobile.goto(url, { waitUntil: "load" });
      await mobile.waitForTimeout(1600);
      await mobile.screenshot({ path: path.join(starter.mediaDir, "screenshot-2.png") });
      await mobile.close();

      console.log(`- ${starter.slug}: poster + 2 screenshots`);
    }
  } finally {
    await browser.close();
    close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
