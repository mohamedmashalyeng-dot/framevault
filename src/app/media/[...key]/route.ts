import { statObject, streamObject } from "@/server/storage";

const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg" };
// Only generated renditions are served: <key>-<width>.webp or <key>-og.jpg.
const NAME = /^p\/[A-Za-z0-9_-]+\/(poster|screenshot)-[A-Za-z0-9_-]+-(\d{2,4}\.webp|og\.jpg)$/;

/** Public preview images. Keys are random and immutable, so cache forever. */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key } = await ctx.params;
  const joined = key.join("/");
  if (!NAME.test(joined)) return new Response("Not found", { status: 404 });

  const stat = await statObject("media", joined);
  if (!stat) return new Response("Not found", { status: 404 });

  return new Response(streamObject("media", joined), {
    headers: {
      "content-type": TYPES[joined.split(".").pop()!],
      "content-length": String(stat.size),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
