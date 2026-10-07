import { describe, expect, it } from "vitest";
import { catalogueHref, MAX_PAGE, parseCatalogueParams } from "@/lib/catalogue-params";
import { formatPrice, parsePriceInput } from "@/lib/money";
import { toFtsQuery } from "@/server/catalogue/search-index";
import { createDownloadToken, DOWNLOAD_TOKEN_TTL_SECONDS, verifyDownloadToken } from "@/server/download-tokens";

describe("catalogue URL parameters", () => {
  it("parses shareable filters and drops invalid values", () => {
    const q = parseCatalogueParams(
      new URLSearchParams("q=  dark   landing  &category=Landing-Pages&price=free&tech=react,vite,NOT VALID&style=dark&sort=price-asc&page=3"),
    );
    expect(q).toEqual({
      q: "dark landing",
      category: "landing-pages",
      price: "free",
      tech: ["react", "vite"],
      style: ["dark"],
      sort: "price-asc",
      page: 3,
    });
  });

  it("bounds page numbers, query length and facet counts", () => {
    const q = parseCatalogueParams({ page: "999999", q: "x".repeat(500), tech: "a,b,c,d,e,f,g,h,i", sort: "drop table" });
    expect(q.page).toBe(MAX_PAGE);
    expect(q.q.length).toBe(80);
    expect(q.tech.length).toBe(6);
    expect(q.sort).toBe("newest");
    expect(parseCatalogueParams({ page: "-4" }).page).toBe(1);
    expect(parseCatalogueParams({ page: "abc" }).page).toBe(1);
  });

  it("builds canonical URLs with sorted facets and defaults omitted", () => {
    expect(catalogueHref({ tech: ["vite", "react"], sort: "newest", page: 1 })).toBe("/catalogue?tech=react%2Cvite");
    const round = parseCatalogueParams(new URL(`http://x${catalogueHref({ q: "a b", price: "paid", page: 2 })}`).searchParams);
    expect(round).toMatchObject({ q: "a b", price: "paid", page: 2 });
  });
});

describe("full-text query builder", () => {
  it("quotes every token so FTS operators in input are inert", () => {
    expect(toFtsQuery('dark" OR title:* NEAR(x)')).toBe('"dark"* AND "or"* AND "title"* AND "near"* AND "x"*');
    expect(toFtsQuery("  ***  ")).toBeNull();
  });
});

describe("money", () => {
  it("formats prices and free products", () => {
    expect(formatPrice(0, "USD")).toBe("Free");
    expect(formatPrice(4900, "USD")).toBe("$49");
    expect(formatPrice(1250, "EUR")).toBe("€12.50");
  });

  it("parses admin price input strictly", () => {
    expect(parsePriceInput("29")).toBe(2900);
    expect(parsePriceInput("29.5")).toBe(2950);
    expect(parsePriceInput("-1")).toBeNull();
    expect(parsePriceInput("1e5")).toBeNull();
  });
});

describe("signed download tokens", () => {
  const secret = "s".repeat(40);

  it("round-trips the version and user", () => {
    const { token } = createDownloadToken({ versionId: "ver_1", userId: "usr_1" }, Date.now(), secret);
    expect(verifyDownloadToken(token, Date.now(), secret)).toEqual({ versionId: "ver_1", userId: "usr_1" });
  });

  it("rejects expired, tampered and foreign tokens", () => {
    const now = Date.now();
    const { token } = createDownloadToken({ versionId: "ver_1", userId: "usr_1" }, now, secret);
    expect(verifyDownloadToken(token, now + (DOWNLOAD_TOKEN_TTL_SECONDS + 1) * 1000, secret)).toBeNull();
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ v: "ver_2", u: "usr_1", e: 9999999999 })).toString("base64url");
    expect(verifyDownloadToken(`${forged}.${sig}`, now, secret)).toBeNull();
    expect(verifyDownloadToken(`${body}.${sig}x`, now, secret)).toBeNull();
    expect(verifyDownloadToken(token, now, "o".repeat(40))).toBeNull();
  });
});
