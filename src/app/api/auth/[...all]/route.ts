import { isIP } from "node:net";
import { getAuth } from "@/server/auth";

// TEMPORARY: describes how client-IP headers arrive behind Hostinger's CDN so
// Better Auth's rate limiter can be configured. Logs header names and the
// shape of IP-like values only (never the addresses), and only for requests
// carrying this one-off token. Remove after reading.
function ipShape(value: string) {
  return value.split(",").map((part) => {
    const ip = part.trim().replace(/^::ffff:/, "");
    const family = isIP(ip);
    if (!family) return "other";
    const local = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd])/i.test(ip);
    return `${local ? "private" : "public"}-v${family}`;
  });
}

function describeProxyHeaders(request: Request) {
  if (request.headers.get("x-fv-diag") !== "8563e477f4e5500a8ca69386") return;
  const ipLike: Record<string, string[]> = {};
  for (const [name, value] of request.headers) {
    const shape = ipShape(value);
    if (shape.some((s) => s !== "other")) ipLike[name] = shape;
  }
  console.warn("[proxy-headers]", JSON.stringify({ names: [...request.headers.keys()], ipLike }));
}

// The auth instance is created lazily so builds do not need runtime secrets.
export function GET(request: Request) {
  describeProxyHeaders(request);
  return getAuth().handler(request);
}

export function POST(request: Request) {
  return getAuth().handler(request);
}
