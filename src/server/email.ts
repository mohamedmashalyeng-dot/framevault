import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { env, isNonProduction } from "./env";
import { getObject, putObject, resolveKey } from "./storage";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type OutboxMessage = OutgoingEmail & { id: string; sentAt: string };

/**
 * Sends transactional email through Resend when RESEND_API_KEY is set.
 * Without a key, non-production environments write messages to a local
 * outbox (storage/outbox) that can be read at /dev/outbox. Production
 * refuses to silently drop email.
 */
export async function sendEmail(message: OutgoingEmail): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM } = env();

  if (RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      throw new Error(`Email provider rejected the message (${response.status})`);
    }
    return;
  }

  if (!isNonProduction()) {
    throw new Error("No email transport configured. Set RESEND_API_KEY.");
  }

  const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const stored: OutboxMessage = { ...message, id, sentAt: new Date().toISOString() };
  await putObject("outbox", `${id}.json`, JSON.stringify(stored, null, 2));
  console.info(`[dev-outbox] "${message.subject}" to ${message.to} -> /dev/outbox/${id}`);
}

export async function listOutbox(limit = 50): Promise<OutboxMessage[]> {
  let files: string[] = [];
  try {
    files = await readdir(path.dirname(resolveKey("outbox", "probe.json")));
  } catch {
    return [];
  }
  const recent = files
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, limit);
  const messages = await Promise.all(recent.map((f) => readOutboxMessage(f.replace(/\.json$/, ""))));
  return messages.filter((m): m is OutboxMessage => m !== null);
}

export async function readOutboxMessage(id: string): Promise<OutboxMessage | null> {
  if (!/^[0-9]+-[a-f0-9]{8}$/.test(id)) return null;
  const raw = await getObject("outbox", `${id}.json`);
  return raw ? (JSON.parse(raw.toString("utf8")) as OutboxMessage) : null;
}
