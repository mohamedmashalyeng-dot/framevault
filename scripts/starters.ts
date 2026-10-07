import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** Shared description of the starter inventory in content/starters. */
export const STARTERS_DIR = path.resolve(process.cwd(), "content/starters");

export type StarterMeta = {
  slug: string;
  version: string;
  changelog: string;
  title: string;
  tagline: string;
  description: string;
  category: string;
  priceCents: number;
  featured: boolean;
  featuredRank: number;
  licenceType: "free" | "standard";
  technologies: string[];
  styles: string[];
  topics: string[];
  /** vite: built from source/; static: source/ is the demo; none: prompt-only, demo/ kept by hand. */
  build: "vite" | "static" | "none";
  requirements: string[];
  technologyNotes: string;
  posterAlt: string;
  screenshotAlts: string[];
};

export type Starter = StarterMeta & {
  dir: string;
  sourceDir: string | null;
  demoDir: string;
  mediaDir: string;
  prompt: string;
};

/** Files that belong to the downloadable project but not to its live demo. */
export const STATIC_DEMO_EXCLUDE = new Set(["README.md", "package.json", "serve.mjs", ".gitignore", ".env.example"]);

export async function loadStarters(): Promise<Starter[]> {
  const slugs = (await readdir(STARTERS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const out: Starter[] = [];
  for (const slug of slugs) {
    const dir = path.join(STARTERS_DIR, slug);
    const meta = JSON.parse(await readFile(path.join(dir, "product.json"), "utf8")) as StarterMeta;
    out.push({
      ...meta,
      dir,
      sourceDir: meta.build === "none" ? null : path.join(dir, "source"),
      demoDir: path.join(dir, "demo"),
      mediaDir: path.join(dir, "media"),
      prompt: (await readFile(path.join(dir, "prompt.md"), "utf8")).trim(),
    });
  }
  return out;
}
