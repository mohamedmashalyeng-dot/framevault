"use client";

import { useEffect, useState } from "react";
import { revealPromptAction } from "@/server/actions/store";
import { Check, Copy, Spinner } from "../icons";

type Status =
  | { kind: "idle" | "copying" | "copied" }
  | { kind: "error"; message: string }
  | { kind: "manual"; prompt: string };

/**
 * Copies a prompt straight to the clipboard in one click. The prompt is
 * fetched through the same access-checked Server Action as PromptViewer, so
 * it only works where the visitor already has access (free products).
 */
export function CopyPromptButton({ slug }: { slug: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (status.kind !== "copied") return;
    const t = setTimeout(() => setStatus({ kind: "idle" }), 2500);
    return () => clearTimeout(t);
  }, [status]);

  async function copy() {
    setStatus({ kind: "copying" });
    const request = revealPromptAction(slug);
    const text = request.then((r) => {
      if (!r.ok) throw new Error(r.message);
      return r.prompt;
    });
    try {
      // Handing the clipboard a promise keeps the click's user activation
      // (Safari requires it) while the prompt is still loading.
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })) })]);
      } else {
        await navigator.clipboard.writeText(await text);
      }
      setStatus({ kind: "copied" });
    } catch {
      const result = await request.catch(() => null);
      if (!result) return setStatus({ kind: "error", message: "We couldn't load the prompt. Check your connection and try again." });
      if (!result.ok) return setStatus({ kind: "error", message: result.message });
      try {
        await navigator.clipboard.writeText(result.prompt);
        setStatus({ kind: "copied" });
      } catch {
        setStatus({ kind: "manual", prompt: result.prompt });
      }
    }
  }

  return (
    <div>
      <button type="button" onClick={copy} disabled={status.kind === "copying"} className="btn btn-primary w-full">
        {status.kind === "copying" ? <Spinner size={15} /> : status.kind === "copied" ? <Check size={15} /> : <Copy size={15} />}
        {status.kind === "copied" ? "Copied" : "Copy prompt"}
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {status.kind === "copied" ? "Prompt copied to clipboard." : ""}
      </p>
      {status.kind === "error" && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {status.message}
        </p>
      )}
      {status.kind === "manual" && (
        <>
          <p className="mt-2 text-xs text-warning">Your browser blocked clipboard access. Select the text below and copy it manually.</p>
          <textarea
            readOnly
            value={status.prompt}
            rows={6}
            aria-label="Prompt"
            onFocus={(e) => e.currentTarget.select()}
            className="field mt-2 font-mono text-xs"
          />
        </>
      )}
    </div>
  );
}
