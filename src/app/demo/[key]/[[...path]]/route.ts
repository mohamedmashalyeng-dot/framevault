import { env } from "@/server/env";
import { demoContentType } from "@/server/ingest/demo";
import { statObject, streamObject } from "@/server/storage";

/**
 * Serves static product demos in a sandbox. The CSP `sandbox` directive gives
 * every demo document an opaque origin, so demo code cannot read this site's
 * cookies or storage, cannot call its APIs with the visitor's session, and
 * cannot navigate the embedding page. `connect-src 'none'` blocks network
 * calls entirely. Set DEMO_ORIGIN to serve demos from a separate hostname in
 * production for an additional, origin-level boundary.
 */
export async function GET(request: Request, ctx: RouteContext<"/demo/[key]/[[...path]]">) {
  const { key, path = [] } = await ctx.params;
  if (!/^demo-[A-Za-z0-9_-]{8,40}$/.test(key)) return notFound();

  const url = new URL(request.url);
  // Next.js normalises away trailing slashes, so the bare folder URL is sent
  // to an explicit index.html, where relative asset URLs resolve correctly.
  if (path.length === 0) {
    return Response.redirect(new URL(`${url.pathname.replace(/\/$/, "")}/index.html`, url), 308);
  }

  const file = path.join("/");
  if (path.some((p) => p.startsWith(".") || p.includes("\\"))) return notFound();
  const type = demoContentType(file);
  if (!type) return notFound();

  const objectKey = `${key}/${file}`;
  const stat = await statObject("demos", objectKey).catch(() => null);
  if (!stat) return notFound();

  const self = url.origin;
  const appOrigin = new URL(env().APP_URL).origin;
  const csp = [
    "sandbox allow-scripts allow-forms allow-popups allow-modals",
    "default-src 'none'",
    `script-src ${self} 'unsafe-inline'`,
    `style-src ${self} 'unsafe-inline'`,
    `img-src ${self} data: blob:`,
    `font-src ${self} data:`,
    `media-src ${self} blob:`,
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    `frame-ancestors ${appOrigin}`,
  ].join("; ");

  return new Response(streamObject("demos", objectKey), {
    headers: {
      "content-type": type,
      "content-length": String(stat.size),
      "content-security-policy": csp,
      // Module scripts are fetched in CORS mode from the opaque-origin document.
      "access-control-allow-origin": "*",
      "cross-origin-resource-policy": "cross-origin",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
      "cache-control": "public, max-age=300",
    },
  });
}

function notFound() {
  return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
}
