import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatDateTime } from "@/lib/format";
import { listOutbox } from "@/server/email";
import { isNonProduction } from "@/server/env";

export const metadata: Metadata = { title: "Development outbox", robots: { index: false, follow: false } };

/** Development only: emails captured when no email provider is configured. */
export default function OutboxPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
      <p className="eyebrow text-warning">Development only</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Email outbox</h1>
      <p className="mt-2 text-muted">
        Without RESEND_API_KEY, outgoing emails are saved to storage/outbox instead of being sent. This page is unavailable in production.
      </p>
      <Suspense fallback={<div className="mt-8 h-40 rounded-2xl skeleton" />}>
        <Messages />
      </Suspense>
    </div>
  );
}

async function Messages() {
  await connection();
  if (!isNonProduction()) notFound();
  const messages = await listOutbox(30);
  if (messages.length === 0) return <p className="mt-8 rounded-2xl border border-dashed border-line-strong p-8 text-center text-muted">No emails yet.</p>;

  return (
    <ul className="mt-8 space-y-4">
      {messages.map((m) => (
        <li key={m.id} className="rounded-2xl border border-line bg-graphite-900 p-5">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <p className="font-medium">{m.subject}</p>
            <p className="font-mono text-xs text-subtle">{formatDateTime(m.sentAt)}</p>
          </div>
          <p className="mt-1 text-sm text-muted">To: {m.to}</p>
          <div className="mt-4 whitespace-pre-wrap break-words font-mono text-[0.8rem] leading-relaxed text-paper-dim">
            {m.text.split(/(https?:\/\/\S+)/g).map((part, i) =>
              /^https?:\/\//.test(part) ? (
                <a key={i} href={part} className="text-mint underline underline-offset-4">
                  {part}
                </a>
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
