import { createHash } from "node:crypto";
import type { ArchiveManifest } from "@/db/schema";
import { randomToken } from "../ids";
import { putObject } from "../storage";
import { inspectZip, ZipValidationError } from "./zip";

export const ARCHIVE_MAX_BYTES = 50 * 1024 * 1024;

export type StoredArchive = {
  archiveKey: string;
  archiveFileName: string;
  archiveSize: number;
  archiveSha256: string;
  archiveManifest: ArchiveManifest;
};

const base = (p: string) => p.split("/").pop()!.toLowerCase();

/** Describes an archive's contents, ignoring a single wrapping folder. */
export function buildManifest(paths: string[]): ArchiveManifest {
  const tops = new Set(paths.map((p) => p.split("/")[0]));
  const wrapped = tops.size === 1 && paths.every((p) => p.includes("/"));
  const files = wrapped ? paths.map((p) => p.slice(p.indexOf("/") + 1)) : paths;
  const rootFiles = files.filter((f) => !f.includes("/")).map((f) => f.toLowerCase());
  return {
    fileCount: files.length,
    files: files.slice(0, 500),
    hasReadme: rootFiles.some((f) => f.startsWith("readme")),
    hasLicence: rootFiles.some((f) => f.startsWith("licence") || f.startsWith("license")),
    hasEnvExample: files.some((f) => base(f) === ".env.example"),
    hasPackageJson: rootFiles.includes("package.json"),
  };
}

/** Checks size, structure and required files without storing anything. */
export async function validateSourceArchive(buffer: Buffer): Promise<ArchiveManifest> {
  if (buffer.byteLength > ARCHIVE_MAX_BYTES) throw new ZipValidationError("Source archives must be 50 MB or smaller.");
  const entries = await inspectZip(buffer);
  if (entries.length === 0) throw new ZipValidationError("The archive is empty.");
  const manifest = buildManifest(entries.map((e) => e.path));
  if (!manifest.hasReadme) throw new ZipValidationError("Source archives must include a README with setup instructions.");
  if (!manifest.hasLicence) throw new ZipValidationError("Source archives must include a LICENCE or LICENSE file.");
  return manifest;
}

/**
 * Validates and stores a source archive in private storage. The key is
 * random and never exposed; downloads are streamed by the download route.
 */
export async function storeSourceArchive(buffer: Buffer, fileName: string): Promise<StoredArchive> {
  const manifest = await validateSourceArchive(buffer);

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+/, "").slice(0, 100) || "source.zip";
  const archiveKey = `archives/${randomToken(16)}.zip`;
  await putObject("private", archiveKey, buffer);
  return {
    archiveKey,
    archiveFileName: safeName.endsWith(".zip") ? safeName : `${safeName}.zip`,
    archiveSize: buffer.byteLength,
    archiveSha256: createHash("sha256").update(buffer).digest("hex"),
    archiveManifest: manifest,
  };
}
