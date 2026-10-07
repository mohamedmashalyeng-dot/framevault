import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import yauzl from "yauzl";
import yazl from "yazl";

/**
 * ZIP handling with conservative limits. Archives are only ever read as data;
 * nothing inside them is executed by the application server.
 */
export const ZIP_LIMITS = {
  maxEntries: 2000,
  maxEntryBytes: 25 * 1024 * 1024,
  maxTotalBytes: 150 * 1024 * 1024,
  maxPathLength: 240,
} as const;

export class ZipValidationError extends Error {}

export type ZipEntryInfo = { path: string; size: number };

function normaliseEntryPath(name: string): string | null {
  // yauzl.validateFileName rejects absolute paths, backslashes and "..".
  if (yauzl.validateFileName(name) !== null) return null;
  if (name.length > ZIP_LIMITS.maxPathLength) return null;
  const parts = name.split("/");
  if (parts.some((p) => p === "." || p === "..")) return null;
  return name;
}

/** Lists (and validates) every entry without extracting anything. */
export async function inspectZip(buffer: Buffer): Promise<ZipEntryInfo[]> {
  let zip: yauzl.ZipFile;
  try {
    zip = await yauzl.fromBufferPromise(buffer, { lazyEntries: true, validateEntrySizes: true });
  } catch {
    throw new ZipValidationError("The file is not a valid ZIP archive.");
  }
  const entries: ZipEntryInfo[] = [];
  let total = 0;

  await new Promise<void>((resolve, reject) => {
    zip.on("error", () => reject(new ZipValidationError("The ZIP archive is corrupted.")));
    zip.on("end", () => resolve());
    zip.on("entry", (entry: yauzl.Entry) => {
      const name = normaliseEntryPath(entry.fileName);
      if (!name) return reject(new ZipValidationError(`Unsafe path in archive: ${entry.fileName.slice(0, 80)}`));
      if (entry.isEncrypted()) return reject(new ZipValidationError("Encrypted archives are not supported."));
      // Symlinks are stored with the S_IFLNK bit in the high external attributes.
      const unixMode = (entry.externalFileAttributes >>> 16) & 0o170000;
      if (unixMode === 0o120000) return reject(new ZipValidationError("Archives must not contain symbolic links."));
      if (!name.endsWith("/")) {
        if (entry.uncompressedSize > ZIP_LIMITS.maxEntryBytes) {
          return reject(new ZipValidationError(`${name} is larger than the per-file limit.`));
        }
        total += entry.uncompressedSize;
        if (total > ZIP_LIMITS.maxTotalBytes) return reject(new ZipValidationError("Archive expands beyond the size limit."));
        entries.push({ path: name, size: entry.uncompressedSize });
        if (entries.length > ZIP_LIMITS.maxEntries) return reject(new ZipValidationError("Archive has too many files."));
      }
      zip.readEntry();
    });
    zip.readEntry();
  });
  return entries;
}

/** Extracts files for which `accept` returns a destination path. */
export async function extractZip(
  buffer: Buffer,
  accept: (entryPath: string) => string | null,
  write: (destination: string, data: Buffer) => Promise<void>,
): Promise<number> {
  await inspectZip(buffer); // validates limits first
  const zip = await yauzl.fromBufferPromise(buffer, { lazyEntries: true, validateEntrySizes: true });
  let written = 0;

  await new Promise<void>((resolve, reject) => {
    zip.on("error", reject);
    zip.on("end", () => resolve());
    zip.on("entry", async (entry: yauzl.Entry) => {
      try {
        const destination = entry.fileName.endsWith("/") ? null : accept(entry.fileName);
        if (destination) {
          const stream = await zip.openReadStreamPromise(entry);
          const chunks: Buffer[] = [];
          for await (const chunk of stream) chunks.push(chunk as Buffer);
          await write(destination, Buffer.concat(chunks));
          written++;
        }
        zip.readEntry();
      } catch (error) {
        reject(error);
      }
    });
    zip.readEntry();
  });
  return written;
}

/** Reads one small file (e.g. package.json) from an archive, as data only. */
export async function readZipEntry(buffer: Buffer, match: (entryPath: string) => boolean, maxBytes = 512 * 1024) {
  let found: Buffer | null = null;
  await extractZip(
    buffer,
    (entry) => (!found && match(entry) ? entry : null),
    async (_destination, data) => {
      if (!found && data.byteLength <= maxBytes) found = data;
    },
  );
  return found as Buffer | null;
}

const EXCLUDED_DIRS = new Set(["node_modules", "dist", ".git", ".vite", ".turbo", ".next"]);
const EXCLUDED_FILES = new Set([".DS_Store", "Thumbs.db", ".env", ".env.local"]);

export async function listDirectory(root: string, base = ""): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(path.join(root, base), { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) out.push(...(await listDirectory(root, rel)));
    } else if (entry.isFile() && !EXCLUDED_FILES.has(entry.name)) {
      out.push(rel);
    }
  }
  return out.sort();
}

/**
 * Builds a deterministic ZIP from a directory (plus extra in-memory files),
 * placing everything under a single top-level folder.
 */
export async function zipDirectory(
  root: string,
  folderName: string,
  extra: Record<string, string> = {},
): Promise<Buffer> {
  const zip = new yazl.ZipFile();
  const mtime = new Date("2026-01-01T00:00:00Z");
  const files = await listDirectory(root);
  for (const rel of files) {
    if (rel in extra) continue;
    const s = await stat(path.join(root, rel));
    zip.addBuffer(await readFile(path.join(root, rel)), `${folderName}/${rel}`, { mtime, mode: s.mode & 0o111 ? 0o100755 : 0o100644 });
  }
  for (const [rel, content] of Object.entries(extra)) {
    zip.addBuffer(Buffer.from(content, "utf8"), `${folderName}/${rel}`, { mtime, mode: 0o100644 });
  }
  zip.end();
  const chunks: Buffer[] = [];
  for await (const chunk of zip.outputStream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}
