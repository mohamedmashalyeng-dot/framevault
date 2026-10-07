import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Short-lived, signed download links. A token names one product version and
 * the user it was issued to; the download route re-checks entitlement before
 * streaming, so a refunded purchase cannot be downloaded with an old link.
 */
export const DOWNLOAD_TOKEN_TTL_SECONDS = 5 * 60;

type Payload = { v: string; u: string | null; e: number };

function sign(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createDownloadToken(
  input: { versionId: string; userId: string | null },
  now = Date.now(),
  secret = env().DOWNLOAD_TOKEN_SECRET,
): { token: string; expiresAt: Date } {
  const exp = Math.floor(now / 1000) + DOWNLOAD_TOKEN_TTL_SECONDS;
  const payload: Payload = { v: input.versionId, u: input.userId, e: exp };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${body}.${sign(body, secret)}`, expiresAt: new Date(exp * 1000) };
}

export function verifyDownloadToken(
  token: string,
  now = Date.now(),
  secret = env().DOWNLOAD_TOKEN_SECRET,
): { versionId: string; userId: string | null } | null {
  if (token.length > 512) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (typeof payload.v !== "string" || typeof payload.e !== "number") return null;
    if (payload.e * 1000 < now) return null;
    return { versionId: payload.v, userId: payload.u ?? null };
  } catch {
    return null;
  }
}
