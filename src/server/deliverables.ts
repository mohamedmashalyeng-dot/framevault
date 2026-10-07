import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { downloadEvent, product, productVersion } from "@/db/schema";
import { decideAccess, recordFreeClaim, type AccessReason, type Viewer } from "./access";
import { createDownloadToken, verifyDownloadToken } from "./download-tokens";
import { newId } from "./ids";
import { statObject } from "./storage";

export type DeliverableFailure = {
  ok: false;
  status: 401 | 403 | 404;
  reason: AccessReason | "not_included";
  message: string;
};

function deny(reason: AccessReason | "not_included"): DeliverableFailure {
  switch (reason) {
    case "sign_in_required":
      return { ok: false, status: 401, reason, message: "Sign in and purchase this product to unlock it." };
    case "purchase_required":
      return { ok: false, status: 403, reason, message: "This product is locked. Purchase it to unlock the prompt and files." };
    case "not_included":
      return { ok: false, status: 404, reason, message: "This product does not include that deliverable." };
    default:
      return { ok: false, status: 404, reason, message: "Product not found." };
  }
}

export async function getPromptForViewer(
  viewer: Viewer,
  slug: string,
): Promise<{ ok: true; prompt: string; version: string; title: string } | DeliverableFailure> {
  const decision = await decideAccess(viewer, slug);
  if (!decision.allowed || !decision.product) return deny(decision.reason);
  if (!decision.product.currentVersionId) return deny("not_included");

  const [version] = await getDb()
    .select({ prompt: productVersion.prompt, version: productVersion.version })
    .from(productVersion)
    .where(eq(productVersion.id, decision.product.currentVersionId));
  if (!version || !version.prompt.trim()) return deny("not_included");

  if (viewer && decision.reason === "free") await recordFreeClaim(viewer.id, decision.product.id);
  return { ok: true, prompt: version.prompt, version: version.version, title: decision.product.title };
}

export async function issueDownloadLink(
  viewer: Viewer,
  slug: string,
): Promise<{ ok: true; url: string; expiresAt: string; fileName: string; size: number } | DeliverableFailure> {
  const decision = await decideAccess(viewer, slug);
  if (!decision.allowed || !decision.product) return deny(decision.reason);
  if (!decision.product.currentVersionId) return deny("not_included");

  const [version] = await getDb()
    .select({
      id: productVersion.id,
      archiveKey: productVersion.archiveKey,
      archiveFileName: productVersion.archiveFileName,
      archiveSize: productVersion.archiveSize,
    })
    .from(productVersion)
    .where(eq(productVersion.id, decision.product.currentVersionId));
  if (!version?.archiveKey || !version.archiveFileName) return deny("not_included");
  if (!(await statObject("private", version.archiveKey))) return deny("not_included");

  if (viewer && decision.reason === "free") await recordFreeClaim(viewer.id, decision.product.id);
  const { token, expiresAt } = createDownloadToken({ versionId: version.id, userId: viewer?.id ?? null });
  return {
    ok: true,
    url: `/api/downloads/${token}`,
    expiresAt: expiresAt.toISOString(),
    fileName: version.archiveFileName,
    size: version.archiveSize ?? 0,
  };
}

/**
 * Resolves a signed download token to a private archive. Access is decided
 * again for the user the token was issued to, so revoked entitlements and
 * unpublished products stop working immediately.
 */
export async function resolveDownload(
  token: string,
  loadViewer: (userId: string) => Promise<Viewer>,
): Promise<{ ok: true; archiveKey: string; fileName: string; size: number } | DeliverableFailure> {
  const claims = verifyDownloadToken(token);
  if (!claims) return { ok: false, status: 403, reason: "unavailable", message: "This download link is invalid or has expired." };

  const [row] = await getDb()
    .select({
      versionId: productVersion.id,
      archiveKey: productVersion.archiveKey,
      archiveFileName: productVersion.archiveFileName,
      slug: product.slug,
    })
    .from(productVersion)
    .innerJoin(product, eq(product.id, productVersion.productId))
    .where(eq(productVersion.id, claims.versionId));
  if (!row?.archiveKey || !row.archiveFileName) return deny("not_included");

  const viewer = claims.userId ? await loadViewer(claims.userId) : null;
  if (claims.userId && !viewer) return deny("sign_in_required");
  const decision = await decideAccess(viewer, row.slug);
  if (!decision.allowed) return deny(decision.reason);

  const stat = await statObject("private", row.archiveKey);
  if (!stat) return deny("not_included");

  await getDb()
    .insert(downloadEvent)
    .values({ id: newId("dl"), userId: claims.userId, productVersionId: row.versionId });

  return { ok: true, archiveKey: row.archiveKey, fileName: row.archiveFileName, size: stat.size };
}
