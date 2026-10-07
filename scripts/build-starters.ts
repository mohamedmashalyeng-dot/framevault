/**
 * Builds the live demo bundle for every starter product:
 *   - "vite" starters: copies source/ to a temporary folder, runs a clean
 *     `npm install` and `npm run build` (which also type-checks), and copies
 *     dist/ to demo/. This proves the downloadable source builds as shipped.
 *   - "static" starters: copies the runtime files of source/ to demo/.
 *   - "none" (prompt-only): demo/ is maintained by hand and left untouched.
 *
 * Usage: npm run starters:build [-- slug ...]
 */
import { execSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { listDirectory } from "../src/server/ingest/zip";
import { loadStarters, STATIC_DEMO_EXCLUDE } from "./starters";

async function main() {
  const only = process.argv.slice(2);
  const starters = (await loadStarters()).filter((s) => only.length === 0 || only.includes(s.slug));

  for (const starter of starters) {
    if (starter.build === "none" || !starter.sourceDir) {
      console.log(`- ${starter.slug}: prompt-only, demo kept as is`);
      continue;
    }

    await rm(starter.demoDir, { recursive: true, force: true });
    await mkdir(starter.demoDir, { recursive: true });

    if (starter.build === "static") {
      for (const file of await listDirectory(starter.sourceDir)) {
        if (STATIC_DEMO_EXCLUDE.has(file)) continue;
        await cp(path.join(starter.sourceDir, file), path.join(starter.demoDir, file));
      }
      console.log(`- ${starter.slug}: static demo copied`);
      continue;
    }

    const work = await mkdtemp(path.join(os.tmpdir(), `starter-${starter.slug}-`));
    try {
      await cp(starter.sourceDir, work, {
        recursive: true,
        filter: (src) => !/[\\/](node_modules|dist)([\\/]|$)/.test(src),
      });
      console.log(`- ${starter.slug}: npm install (clean) ...`);
      execSync("npm install --no-audit --no-fund --loglevel=error", { cwd: work, stdio: "inherit" });
      console.log(`- ${starter.slug}: npm run build ...`);
      execSync("npm run build", { cwd: work, stdio: "inherit" });
      await cp(path.join(work, "dist"), starter.demoDir, { recursive: true });
      console.log(`- ${starter.slug}: demo built from source`);
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
