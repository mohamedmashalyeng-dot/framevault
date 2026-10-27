"use client";

import { useEffect, useRef } from "react";

/**
 * A <details> dropdown for the header. The header stays mounted across
 * client-side navigations, so a plain <details> would stay open over the next
 * page: this one closes when a link inside is followed or a search is sent,
 * on a tap outside it, and on Escape.
 */
export function MenuDetails({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current!;
    const onPointerDown = (e: PointerEvent) => {
      if (details.open && !details.contains(e.target as Node)) details.open = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !details.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details
      ref={ref}
      className={className}
      onClick={(e) => {
        if ((e.target as Element).closest("a")) ref.current!.open = false;
      }}
      onSubmit={() => (ref.current!.open = false)}
    >
      {children}
    </details>
  );
}
