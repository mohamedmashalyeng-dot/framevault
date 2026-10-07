"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Monitor, Phone, Tablet } from "@/components/icons";

const DEVICES = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: "100%" },
  { id: "tablet", label: "Tablet", icon: Tablet, width: "820px" },
  { id: "mobile", label: "Mobile", icon: Phone, width: "390px" },
] as const;

export function FullPreview({ title, slug, demoUrl, price }: { title: string; slug: string; demoUrl: string; price: string }) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const current = DEVICES.find((d) => d.id === device)!;

  return (
    <div className="flex h-dvh flex-col bg-graphite-950">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4">
        <Link href={`/products/${slug}`} className="btn btn-ghost btn-sm -ml-1">
          ← <span className="hidden sm:inline">Back to product</span>
        </Link>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
        <div role="group" aria-label="Preview width" className="hidden gap-1 sm:flex">
          {DEVICES.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={device === d.id}
              onClick={() => setDevice(d.id)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs ${
                device === d.id ? "bg-graphite-700 text-paper" : "text-muted hover:text-paper"
              }`}
            >
              <d.icon size={14} /> {d.label}
            </button>
          ))}
        </div>
        <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm hidden md:inline-flex">
          Open without frame <ArrowUpRight size={13} />
        </a>
        <Link href={`/products/${slug}`} className="btn btn-primary btn-sm">
          {price} <ArrowRight size={14} />
        </Link>
      </header>
      <div className="flex flex-1 justify-center overflow-auto bg-graphite-900">
        <iframe
          key={device}
          src={demoUrl}
          title={`${title} — live demo`}
          sandbox="allow-scripts allow-forms allow-popups allow-modals"
          referrerPolicy="no-referrer"
          allow=""
          className="h-full max-w-full border-0 bg-white"
          style={{ width: current.width }}
        />
      </div>
    </div>
  );
}
