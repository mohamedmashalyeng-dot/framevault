import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildManifest } from "@/server/ingest/archive";
import { inspectZip, ZipValidationError } from "@/server/ingest/zip";

/** Minimal STORE-method ZIP writer so tests can craft hostile entry names. */
function makeZip(entries: { name: string; data: string; symlink?: boolean }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const data = Buffer.from(e.data, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4); // made by Unix
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(((e.symlink ? 0o120777 : 0o100644) << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

describe("ZIP validation", () => {
  it("lists a well-formed archive", async () => {
    const entries = await inspectZip(makeZip([{ name: "site/README.md", data: "hi" }, { name: "site/index.html", data: "<p>" }]));
    expect(entries.map((e) => e.path)).toEqual(["site/README.md", "site/index.html"]);
  });

  it("rejects path traversal and absolute paths", async () => {
    await expect(inspectZip(makeZip([{ name: "../evil.sh", data: "x" }]))).rejects.toBeInstanceOf(ZipValidationError);
    await expect(inspectZip(makeZip([{ name: "a/../../evil", data: "x" }]))).rejects.toBeInstanceOf(ZipValidationError);
    await expect(inspectZip(makeZip([{ name: "/etc/passwd", data: "x" }]))).rejects.toBeInstanceOf(ZipValidationError);
    await expect(inspectZip(makeZip([{ name: "a\\..\\evil", data: "x" }]))).rejects.toBeInstanceOf(ZipValidationError);
  });

  it("rejects symbolic links and non-zip data", async () => {
    await expect(inspectZip(makeZip([{ name: "link", data: "/etc/passwd", symlink: true }]))).rejects.toThrow(/symbolic links/);
    await expect(inspectZip(Buffer.from("definitely not a zip"))).rejects.toBeInstanceOf(ZipValidationError);
  });

  it("describes deliverables while ignoring a single wrapping folder", () => {
    const manifest = buildManifest(["pkg/README.md", "pkg/LICENCE.txt", "pkg/.env.example", "pkg/package.json", "pkg/src/App.tsx"]);
    expect(manifest).toMatchObject({ fileCount: 5, hasReadme: true, hasLicence: true, hasEnvExample: true, hasPackageJson: true });
    expect(buildManifest(["index.html"]).hasReadme).toBe(false);
  });
});
