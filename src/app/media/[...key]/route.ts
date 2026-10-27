import { parseByteRange } from "@/lib/byte-range";
import { statObject, streamObject } from "@/server/storage";

const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", mp4: "video/mp4", webm: "video/webm" };
// Only generated renditions are served: <key>-<width>.webp or <key>-og.jpg,
// plus preview clips stored as video-<token>.mp4|webm.
const NAME = /^p\/[A-Za-z0-9_-]+\/((poster|screenshot)-[A-Za-z0-9_-]+-(\d{2,4}\.webp|og\.jpg)|video-[A-Za-z0-9_-]+\.(mp4|webm))$/;

/**
 * Public preview media. Keys are random and immutable, so cache forever.
 * Byte ranges are honoured so browsers can stream and seek preview clips.
 */
export async function GET(request: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key } = await ctx.params;
  const joined = key.join("/");
  if (!NAME.test(joined)) return new Response("Not found", { status: 404 });

  const stat = await statObject("media", joined);
  if (!stat) return new Response("Not found", { status: 404 });

  const headers = {
    "content-type": TYPES[joined.split(".").pop()!],
    "cache-control": "public, max-age=31536000, immutable",
    "accept-ranges": "bytes",
    "x-content-type-options": "nosniff",
  };
  const range = parseByteRange(request.headers.get("range"), stat.size);
  if (range === "unsatisfiable") {
    return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${stat.size}` } });
  }
  if (range) {
    return new Response(streamObject("media", joined, range), {
      status: 206,
      headers: {
        ...headers,
        "content-length": String(range.end - range.start + 1),
        "content-range": `bytes ${range.start}-${range.end}/${stat.size}`,
      },
    });
  }
  return new Response(streamObject("media", joined), { headers: { ...headers, "content-length": String(stat.size) } });
}
