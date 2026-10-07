"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/format";
import { requestDownloadAction } from "@/server/actions/store";
import { Download, Spinner } from "../icons";

/** Asks the server for a short-lived signed link, then starts the download. */
export function DownloadButton({
  slug,
  label = "Download source",
  size,
  className,
}: {
  slug: string;
  label?: string;
  size?: number | null;
  className?: string;
}) {
  const [state, setState] = useState<{ kind: "idle" | "working" | "started" } | { kind: "error"; message: string }>({ kind: "idle" });

  async function onClick() {
    setState({ kind: "working" });
    try {
      const result = await requestDownloadAction(slug);
      if (!result.ok) {
        setState({ kind: "error", message: result.message });
        return;
      }
      window.location.assign(result.url);
      setState({ kind: "started" });
    } catch {
      setState({ kind: "error", message: "We couldn't prepare the download. Check your connection and try again." });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={state.kind === "working"}
        className={className ?? "btn btn-secondary w-full"}
      >
        {state.kind === "working" ? <Spinner size={15} /> : <Download size={15} />}
        {state.kind === "working" ? "Preparing…" : label}
        {size ? <span className="font-mono text-xs text-muted">{formatBytes(size)}</span> : null}
      </button>
      <p role="status" aria-live="polite" className="mt-1.5 text-xs">
        {state.kind === "started" && <span className="text-muted">Your download has started.</span>}
        {state.kind === "error" && <span className="text-danger">{state.message}</span>}
      </p>
    </div>
  );
}
