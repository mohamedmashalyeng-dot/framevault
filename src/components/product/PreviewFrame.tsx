"use client";

import Link from "next/link";
import { useState } from "react";
import type { MediaRef } from "@/lib/media";
import { ArrowUpRight, Monitor, Phone, Play, Tablet } from "../icons";
import { MediaImage } from "../MediaImage";

const DEVICES = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: "100%", height: "min(76vh, 760px)" },
  { id: "tablet", label: "Tablet", icon: Tablet, width: "820px", height: "min(80vh, 900px)" },
  { id: "mobile", label: "Mobile", icon: Phone, width: "390px", height: "min(80vh, 760px)" },
] as const;

type DeviceId = (typeof DEVICES)[number]["id"];

/**
 * Shows the poster first and mounts the sandboxed demo only when asked, so a
 * product page never loads more than one interactive demo by default.
 */
export function PreviewFrame({
  title,
  slug,
  demoUrl,
  poster,
}: {
  title: string;
  slug: string;
  demoUrl: string | null;
  poster: MediaRef | null;
}) {
  const [loaded, setLoaded] = useState(false);
  const [device, setDevice] = useState<DeviceId>("desktop");
  const current = DEVICES.find((d) => d.id === device)!;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-graphite-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5">
        <div role="group" aria-label="Preview width" className="flex gap-1">
          {DEVICES.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={device === d.id}
              disabled={!demoUrl}
              onClick={() => {
                setDevice(d.id);
                if (demoUrl) setLoaded(true);
              }}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs transition-colors disabled:opacity-40 ${
                device === d.id ? "bg-graphite-700 text-paper" : "text-muted hover:text-paper"
              }`}
            >
              <d.icon size={14} />
              <span className="hidden sm:inline">{d.label}</span>
            </button>
          ))}
        </div>
        {demoUrl && (
          <Link
            href={`/preview/${slug}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-paper-dim hover:border-line-strong hover:text-paper"
          >
            Open live demo <ArrowUpRight size={13} />
            <span className="sr-only">(opens in a new tab)</span>
          </Link>
        )}
      </div>

      <div className="relative bg-graphite-950/60">
        {loaded && demoUrl ? (
          <div className="flex justify-center overflow-x-auto p-0 sm:p-4" style={{ padding: device === "desktop" ? 0 : undefined }}>
            <iframe
              key={device}
              src={demoUrl}
              title={`${title} — live preview (${current.label.toLowerCase()} width)`}
              sandbox="allow-scripts allow-forms allow-popups allow-modals"
              referrerPolicy="no-referrer"
              allow=""
              loading="lazy"
              className="block max-w-full shrink-0 border-0 bg-white sm:rounded-lg"
              style={{ width: current.width, height: current.height }}
            />
          </div>
        ) : (
          <div className="relative">
            {poster ? (
              <MediaImage media={poster} priority sizes="(min-width: 1024px) 880px, 100vw" className="aspect-[16/10] w-full object-cover object-top" />
            ) : (
              <div className="aspect-[16/10] w-full bg-graphite-850" />
            )}
            {demoUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-graphite-950/70 via-graphite-950/10 to-transparent">
                <button type="button" onClick={() => setLoaded(true)} className="btn btn-primary shadow-xl shadow-black/40">
                  <Play size={15} /> Load interactive preview
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="border-t border-line px-4 py-2.5 text-xs text-subtle">
        Demos run in an isolated sandbox with no access to your account or this site&rsquo;s data.
      </p>
    </div>
  );
}
