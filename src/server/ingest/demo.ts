import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "../ids";
import { putObject, removePrefix } from "../storage";
import { extractZip, inspectZip, listDirectory, ZipValidationError } from "./zip";

/**
 * Demo bundles are static, already-built front-end files (HTML, CSS, JS,
 * images, fonts). They are stored under an unguessable folder and served by
 * /demo with a sandboxing Content-Security-Policy; the application server
 * only ever reads them as bytes.
 */
export const DEMO_EXTENSIONS: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
};

export const DEMO_MAX_ZIP_BYTES = 40 * 1024 * 1024;

export function demoContentType(file: string): string | null {
  return DEMO_EXTENSIONS[path.extname(file).toLowerCase()] ?? null;
}

/** Finds the folder inside the archive that holds index.html. */
function findRoot(paths: string[]): string | null {
  if (paths.includes("index.html")) return "";
  const candidates = paths.filter((p) => p.endsWith("/index.html")).sort((a, b) => a.length - b.length);
  if (!candidates.length) return null;
  return candidates[0].slice(0, -"index.html".length);
}

export type DemoOptions = {
  /**
   * Skip files that are not static web assets instead of rejecting the
   * bundle. Used when a plain HTML/CSS/JS source archive doubles as the demo
   * (README, package.json and similar files are simply not published).
   */
  skipUnsupported?: boolean;
};

/** Validates a demo bundle without writing anything. Returns its root folder. */
export async function validateDemoZip(buffer: Buffer, opts: DemoOptions = {}): Promise<string> {
  if (buffer.byteLength > DEMO_MAX_ZIP_BYTES) throw new ZipValidationError("Demo bundles must be 40 MB or smaller.");
  const entries = await inspectZip(buffer);
  const root = findRoot(entries.map((e) => e.path));
  if (root === null) throw new ZipValidationError("The demo must contain an index.html file.");
  if (!opts.skipUnsupported) {
    const rejected = entries.find((e) => e.path.startsWith(root) && !demoContentType(e.path));
    if (rejected) throw new ZipValidationError(`Unsupported file type in demo bundle: ${rejected.path.slice(0, 80)}`);
  }
  return root;
}

export async function installDemoFromZip(buffer: Buffer, opts: DemoOptions = {}): Promise<string> {
  const root = await validateDemoZip(buffer, opts);
  const key = `demo-${randomToken(12)}`;
  try {
    await extractZip(
      buffer,
      (entry) => (entry.startsWith(root) && demoContentType(entry) ? entry.slice(root.length) : null),
      (destination, data) => putObject("demos", `${key}/${destination}`, data),
    );
  } catch (error) {
    await removePrefix("demos", key);
    throw error;
  }
  return key;
}

/** Used by the seed script to install a starter's prebuilt demo folder. */
export async function installDemoFromDirectory(dir: string): Promise<string> {
  const files = await listDirectory(dir);
  if (!files.includes("index.html")) throw new Error(`${dir} has no index.html`);
  const key = `demo-${randomToken(12)}`;
  for (const file of files) {
    if (!demoContentType(file)) throw new Error(`Unsupported demo file: ${file}`);
    await putObject("demos", `${key}/${file}`, await readFile(path.join(dir, file)));
  }
  return key;
}

export async function removeDemo(key: string) {
  await removePrefix("demos", key);
}
