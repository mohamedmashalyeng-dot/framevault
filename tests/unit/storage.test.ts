import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStorageRoot } from "@/server/storage";

describe("storage root", () => {
  const domain = path.resolve("/home/user/domains/shop.example");

  it("keeps a relative path outside the folder Hostinger replaces on deploy", () => {
    expect(resolveStorageRoot("./storage", path.join(domain, "hbuilds", "current", "nodejs"))).toBe(path.join(domain, "storage"));
    expect(resolveStorageRoot("./storage", path.join(domain, "hbuilds", "versions", "abc123", "nodejs"))).toBe(path.join(domain, "storage"));
  });

  it("uses an absolute path as given", () => {
    const absolute = path.resolve("/srv/uploads");
    expect(resolveStorageRoot(absolute, path.join(domain, "hbuilds", "current", "nodejs"))).toBe(absolute);
  });

  it("stays in the working directory everywhere else", () => {
    const cwd = path.join(domain, "hbuilds-old", "app");
    expect(resolveStorageRoot("./storage", cwd)).toBe(path.join(cwd, "storage"));
  });
});
