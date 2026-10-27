import { createClient } from "@libsql/client";
import { expect, type Page } from "@playwright/test";
import { createHmac, randomBytes } from "node:crypto";
import { BASE_URL, E2E_ENV } from "../../playwright.config";

export const ADMIN = { email: E2E_ENV.SEED_ADMIN_EMAIL, password: E2E_ENV.SEED_ADMIN_PASSWORD };
export const CUSTOMER = { email: E2E_ENV.SEED_CUSTOMER_EMAIL, password: E2E_ENV.SEED_CUSTOMER_PASSWORD };

/** Direct read access to the e2e database, for assertions only. */
export const db = createClient({ url: E2E_ENV.DATABASE_URL });

export async function signIn(page: Page, who: { email: string; password: string }, next = "/account") {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname === next.split("?")[0]);
}

export async function signUp(page: Page, name = "E2E Shopper") {
  const email = `shopper-${randomBytes(4).toString("hex")}@e2e.test`;
  const password = "shopper-password-123";
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/account");
  return { email, password };
}

/** Signs and posts a webhook exactly as the simulated provider would. */
export async function postSimulatedWebhook(payload: object) {
  const body = JSON.stringify(payload);
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", E2E_ENV.SIMULATED_WEBHOOK_SECRET).update(`${t}.${body}`).digest("hex");
  const res = await fetch(`${BASE_URL}/api/webhooks/simulated`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-simulated-signature": `t=${t},v1=${sig}` },
    body,
  });
  return { status: res.status, json: (await res.json()) as { duplicate?: boolean; outcome?: string } };
}

export async function orderBySession(sessionId: string) {
  const rs = await db.execute({ sql: `select * from "order" where provider_session_id = ?`, args: [sessionId] });
  return rs.rows[0] as unknown as { id: string; status: string; total_cents: number; currency: string; user_id: string };
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

/* Minimal WebM (Matroska) writer: just enough structure for browsers to play a VP8 track. */
function ebmlSize(size: number) {
  const out = Buffer.alloc(8);
  out[0] = 0x01;
  out.writeUIntBE(size, 2, 6);
  return out;
}
function ebml(id: number, body: Buffer | Buffer[]) {
  const data = Array.isArray(body) ? Buffer.concat(body) : body;
  return Buffer.concat([Buffer.from(id.toString(16).padStart(2 * Math.ceil(id.toString(16).length / 2), "0"), "hex"), ebmlSize(data.length), data]);
}
const ebmlUint = (id: number, n: number) => ebml(id, Buffer.from(n.toString(16).padStart(2 * Math.ceil(n.toString(16).length / 2), "0"), "hex"));
const ebmlString = (id: number, s: string) => ebml(id, Buffer.from(s, "latin1"));
const ebmlFloat = (id: number, f: number) => {
  const b = Buffer.alloc(8);
  b.writeDoubleBE(f);
  return ebml(id, b);
};

/**
 * A two-second 1280x720 WebM of a mint square crossing a dark stage. Headless
 * Chrome's MediaRecorder captures no canvas frames and no encoder is
 * installed for the tests, so frames are encoded with WebCodecs in the page
 * (which needs a secure origin such as localhost) and wrapped here.
 */
export async function makePreviewVideo(page: Page): Promise<Buffer> {
  const clip = await page.evaluate(async () => {
    const width = 1280;
    const height = 720;
    const fps = 30;
    const count = 60;
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    const ctx = canvas.getContext("2d")!;
    const frames: { timeMs: number; key: boolean; data: number[] }[] = [];
    const encoder = new VideoEncoder({
      output: (chunk) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        frames.push({ timeMs: Math.round(chunk.timestamp / 1000), key: chunk.type === "key", data: Array.from(data) });
      },
      error: (error) => console.error(error),
    });
    encoder.configure({ codec: "vp8", width, height, bitrate: 1_000_000, framerate: fps });
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = "#141516";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#5ef2b8";
      ctx.fillRect((i * 18) % (width - 120), 300, 120, 120);
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps) });
      encoder.encode(frame, { keyFrame: i % fps === 0 });
      frame.close();
    }
    await encoder.flush();
    return { width, height, durationMs: (count * 1000) / fps, frames };
  });

  const blocks = clip.frames.map((f) => {
    const head = Buffer.alloc(4);
    head[0] = 0x81; // track 1
    head.writeInt16BE(f.timeMs, 1);
    head[3] = f.key ? 0x80 : 0;
    return ebml(0xa3, Buffer.concat([head, Buffer.from(f.data)]));
  });
  return Buffer.concat([
    ebml(0x1a45dfa3, [
      ebmlUint(0x4286, 1),
      ebmlUint(0x42f7, 1),
      ebmlUint(0x42f2, 4),
      ebmlUint(0x42f3, 8),
      ebmlString(0x4282, "webm"),
      ebmlUint(0x4287, 2),
      ebmlUint(0x4285, 2),
    ]),
    ebml(0x18538067, [
      ebml(0x1549a966, [ebmlUint(0x2ad7b1, 1_000_000), ebmlString(0x4d80, "e2e"), ebmlString(0x5741, "e2e"), ebmlFloat(0x4489, clip.durationMs)]),
      ebml(0x1654ae6b, [
        ebml(0xae, [
          ebmlUint(0xd7, 1),
          ebmlUint(0x73c5, 1),
          ebmlUint(0x83, 1),
          ebmlString(0x86, "V_VP8"),
          ebml(0xe0, [ebmlUint(0xb0, clip.width), ebmlUint(0xba, clip.height)]),
        ]),
      ]),
      ebml(0x1f43b675, [ebmlUint(0xe7, 0), ...blocks]),
    ]),
  ]);
}
