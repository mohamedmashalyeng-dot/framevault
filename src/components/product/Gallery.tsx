"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaRef } from "@/lib/media";
import { Close } from "../icons";
import { MediaImage } from "../MediaImage";

export function Gallery({ images }: { images: MediaRef[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  if (images.length === 0) return null;
  const active = index !== null ? images[index] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <li key={img.key}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group block w-full overflow-hidden rounded-lg border border-line hover:border-line-strong"
            >
              <MediaImage
                media={img}
                sizes="(min-width: 1024px) 280px, 45vw"
                className="aspect-[16/10] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="sr-only">Enlarge screenshot: {img.alt}</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setIndex(null)}
        onKeyDown={(e) => {
          if (index === null) return;
          if (e.key === "ArrowRight") setIndex((index + 1) % images.length);
          if (e.key === "ArrowLeft") setIndex((index - 1 + images.length) % images.length);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIndex(null);
        }}
        aria-label="Screenshot viewer"
        className="m-auto max-h-[92vh] w-[min(96vw,1200px)] overflow-hidden rounded-2xl border border-line-strong bg-graphite-900 p-0 text-paper backdrop:bg-black/75"
      >
        {active && (
          <figure>
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <figcaption className="truncate text-sm text-muted">
                {active.alt} <span className="font-mono text-xs">({(index ?? 0) + 1}/{images.length})</span>
              </figcaption>
              <button type="button" onClick={() => setIndex(null)} className="btn btn-ghost btn-sm" aria-label="Close viewer">
                <Close size={16} />
              </button>
            </div>
            <div className="max-h-[calc(92vh-3rem)] overflow-auto">
              <MediaImage media={active} sizes="96vw" priority className="h-auto w-full" />
            </div>
          </figure>
        )}
      </dialog>
    </>
  );
}
