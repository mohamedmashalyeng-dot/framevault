import { getAuth } from "@/server/auth";

// The auth instance is created lazily so builds do not need runtime secrets.
export function GET(request: Request) {
  return getAuth().handler(request);
}

export function POST(request: Request) {
  return getAuth().handler(request);
}
