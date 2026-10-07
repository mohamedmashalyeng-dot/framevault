import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "./env";

/**
 * Local filesystem storage. Everything lives under STORAGE_DIR, which is
 * outside `public/` and never served directly:
 *
 *   private/   source archives (only streamed after an entitlement check)
 *   demos/     extracted static demo bundles (served sandboxed by /demo)
 *   media/     optimised preview images (served by /media)
 *   outbox/    development email outbox
 *
 * Keys are opaque, generated server side, and never shown to customers.
 * To run on serverless hosting, replace this module with an object-storage
 * implementation (e.g. S3-compatible) exposing the same functions.
 */
export type StorageArea = "private" | "demos" | "media" | "outbox";

const KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._\-/]*$/;

export function storageRoot() {
  return path.resolve(process.cwd(), env().STORAGE_DIR);
}

/** Resolve a key inside an area, refusing anything that escapes it. */
export function resolveKey(area: StorageArea, key: string): string {
  if (!KEY_PATTERN.test(key) || key.includes("..") || key.includes("//")) {
    throw new Error("Invalid storage key");
  }
  const base = path.join(storageRoot(), area);
  const full = path.resolve(base, key);
  if (full !== base && !full.startsWith(base + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return full;
}

export async function putObject(area: StorageArea, key: string, data: Buffer | string) {
  const full = resolveKey(area, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export async function getObject(area: StorageArea, key: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveKey(area, key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function statObject(area: StorageArea, key: string) {
  try {
    const s = await stat(resolveKey(area, key));
    return s.isFile() ? { size: s.size, modified: s.mtime } : null;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return null;
    throw error;
  }
}

export function streamObject(area: StorageArea, key: string): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(resolveKey(area, key));
  return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
}

export async function removePrefix(area: StorageArea, key: string) {
  await rm(resolveKey(area, key), { recursive: true, force: true });
}
