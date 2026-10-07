import { resolveDownload } from "@/server/deliverables";
import { getSessionUser } from "@/server/session";
import { streamObject } from "@/server/storage";

/**
 * Streams a private source archive for a signed, short-lived token. The token
 * must belong to the person currently signed in (free products downloaded
 * without an account carry no user), and access is decided again here.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/downloads/[token]">) {
  const { token } = await ctx.params;
  const current = await getSessionUser();

  const result = await resolveDownload(token, async (userId) =>
    current && current.id === userId ? { id: current.id, role: current.role } : null,
  );

  if (!result.ok) {
    return new Response(result.message, {
      status: result.status,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  return new Response(streamObject("private", result.archiveKey), {
    headers: {
      "content-type": "application/zip",
      "content-length": String(result.size),
      "content-disposition": `attachment; filename="${result.fileName}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
