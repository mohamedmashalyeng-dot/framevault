import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildManifest } from "@/server/ingest/archive";
import { inspectZip, zipDirectory } from "@/server/ingest/zip";
import { licenceText } from "@/server/licence";
import { loadStarters } from "../../scripts/starters";

/**
 * The six starter products must ship what their pages promise: a working
 * demo, a usable prompt, and (for code products) a complete source archive.
 */
describe("starter inventory", async () => {
  const starters = await loadStarters();

  it("has six products across all five categories with distinct styles", () => {
    expect(starters).toHaveLength(6);
    expect(new Set(starters.map((s) => s.category))).toEqual(
      new Set(["full-websites", "landing-pages", "components", "sections", "backgrounds"]),
    );
    expect(new Set(starters.map((s) => s.styles[0])).size).toBe(6);
  });

  for (const starter of starters) {
    describe(starter.slug, () => {
      it("has a demo entry point, media and a substantial prompt", async () => {
        expect((await stat(path.join(starter.demoDir, "index.html"))).isFile()).toBe(true);
        for (const file of ["poster.png", "screenshot-1.png", "screenshot-2.png"]) {
          expect((await stat(path.join(starter.mediaDir, file))).size).toBeGreaterThan(10_000);
        }
        expect(starter.prompt.split(/\s+/).length).toBeGreaterThan(300);
      });

      if (!starter.sourceDir) {
        it("is clearly described as prompt-only", () => {
          expect(starter.description).toMatch(/prompt-only/i);
          expect(starter.description).toMatch(/does not include a source/i);
        });
        return;
      }

      it("packages a complete, runnable source archive", async () => {
        const zip = await zipDirectory(starter.sourceDir!, `${starter.slug}-${starter.version}`, {
          "LICENCE.txt": licenceText({ productTitle: starter.title, version: starter.version, licenceType: starter.licenceType }),
        });
        const entries = (await inspectZip(zip)).map((e) => e.path);
        const manifest = buildManifest(entries);
        expect(manifest).toMatchObject({ hasReadme: true, hasLicence: true, hasPackageJson: true });
        expect(entries.every((p) => p.startsWith(`${starter.slug}-${starter.version}/`))).toBe(true);
        expect(entries.some((p) => /node_modules|\/dist\/|\/\.env$/.test(p))).toBe(false);

        const pkg = JSON.parse(await readFile(path.join(starter.sourceDir!, "package.json"), "utf8"));
        const readme = await readFile(path.join(starter.sourceDir!, "README.md"), "utf8");
        if (starter.build === "vite") {
          expect(manifest.hasEnvExample).toBe(true);
          expect(pkg.scripts).toMatchObject({ dev: "vite", build: expect.stringContaining("vite build") });
          expect(readme).toMatch(/npm install/);
          expect(readme).toMatch(/npm run dev/);
          expect(readme).toMatch(/npm run build/);
        } else {
          expect(pkg.scripts.start).toBe("node serve.mjs");
          expect(readme).toMatch(/npm start/);
          // The live demo is built from exactly these files.
          const demoIndex = await readFile(path.join(starter.demoDir, "index.html"), "utf8");
          expect(demoIndex).toBe(await readFile(path.join(starter.sourceDir!, "index.html"), "utf8"));
        }
      });
    });
  }
});
