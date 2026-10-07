import { env } from "./env";

/** Public URL of a demo bundle, on DEMO_ORIGIN when one is configured. */
export function demoUrlFor(demoKey: string | null | undefined): string | null {
  if (!demoKey) return null;
  const origin = env().DEMO_ORIGIN?.replace(/\/$/, "") ?? "";
  return `${origin}/demo/${demoKey}/index.html`;
}
