"use client";

import { useEffect, useRef, useState } from "react";
import { revealPromptAction, type PromptResult } from "@/server/actions/store";
import { Check, Close, Copy, Spinner } from "../icons";

/**
 * Fetches the prompt on demand through a Server Action (access is checked on
 * the server each time) and shows it in a readable, copyable dialog. The
 * prompt is never part of the page HTML.
 */
export function PromptViewer({ slug, label = "View & copy prompt", className }: { slug: string; label?: string; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<PromptResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (copied === "idle") return;
    const t = setTimeout(() => setCopied("idle"), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  async function openViewer() {
    setOpen(true);
    if (result?.ok) return;
    setLoading(true);
    try {
      setResult(await revealPromptAction(slug));
    } catch {
      setResult({ ok: false, message: "We couldn't load the prompt. Check your connection and try again.", reason: "network" });
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result?.ok) return;
    try {
      await navigator.clipboard.writeText(result.prompt);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <>
      <button type="button" onClick={openViewer} className={className ?? "btn btn-primary w-full"}>
        <Copy size={15} /> {label}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-labelledby="prompt-title"
        className="m-auto flex max-h-[90vh] w-[min(94vw,820px)] flex-col overflow-hidden rounded-2xl border border-line-strong bg-graphite-900 p-0 text-paper backdrop:bg-black/70 [&:not([open])]:hidden"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <p className="eyebrow">AI prompt{result?.ok ? ` · v${result.version}` : ""}</p>
            <h2 id="prompt-title" className="mt-1 truncate font-medium">
              {result?.ok ? result.title : "Prompt"}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={copy} disabled={!result?.ok} className="btn btn-primary btn-sm">
              {copied === "copied" ? <Check size={15} /> : <Copy size={15} />}
              {copied === "copied" ? "Copied" : "Copy prompt"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm" aria-label="Close prompt">
              <Close size={16} />
            </button>
          </div>
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {copied === "copied" ? "Prompt copied to clipboard." : copied === "failed" ? "Copy failed. Select the text and copy it manually." : ""}
        </p>
        {copied === "failed" && (
          <p className="border-b border-line bg-warning/10 px-5 py-2 text-sm text-warning">
            Your browser blocked clipboard access. Select the text below and copy it manually.
          </p>
        )}

        <div className="min-h-48 overflow-y-auto px-5 py-5">
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Spinner /> Loading prompt…
            </p>
          )}
          {!loading && result && !result.ok && <p className="text-sm text-danger">{result.message}</p>}
          {!loading && result?.ok && <FormattedPrompt text={result.prompt} />}
        </div>
      </dialog>
    </>
  );
}

/** Light formatting for prompt text: headings, bullets and code blocks. */
function FormattedPrompt({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={blocks.length} className="my-3 overflow-x-auto rounded-lg border border-line bg-graphite-950 p-4 font-mono text-[0.8rem] leading-relaxed text-paper-dim">
          {code.join("\n")}
        </pre>,
      );
      continue;
    }
    if (/^#{1,3} /.test(line)) {
      const level = line.match(/^#+/)![0].length;
      blocks.push(
        <p key={blocks.length} className={`${level === 1 ? "text-lg" : "text-[0.95rem]"} mb-2 mt-5 font-semibold tracking-tight first:mt-0`}>
          {line.replace(/^#+ /, "")}
        </p>,
      );
    } else if (/^\s*[-*] /.test(line)) {
      blocks.push(
        <p key={blocks.length} className="relative pl-5 text-[0.92rem] leading-relaxed text-paper-dim" style={{ marginLeft: `${line.search(/\S/) * 0.4}rem` }}>
          <span aria-hidden className="absolute left-1 text-mint">
            •
          </span>
          {line.replace(/^\s*[-*] /, "")}
        </p>,
      );
    } else if (line.trim() === "") {
      blocks.push(<div key={blocks.length} className="h-2" />);
    } else {
      blocks.push(
        <p key={blocks.length} className="text-[0.92rem] leading-relaxed text-paper-dim">
          {line}
        </p>,
      );
    }
    i++;
  }
  return <div className="select-text whitespace-pre-wrap break-words">{blocks}</div>;
}
