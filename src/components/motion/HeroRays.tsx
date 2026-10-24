"use client";

import { useSyncExternalStore } from "react";
import LightRays from "../reactbits/LightRays";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * React Bits' Light Rays in the brand mint, kept faint and slow behind the
 * hero. With reduced motion the rays render once and stay still.
 */
export function HeroRays() {
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
      <LightRays
        raysOrigin="top-center"
        raysColor="#5ef2b8"
        raysSpeed={reduced ? 0 : 0.5}
        lightSpread={0.8}
        rayLength={1.6}
        intensity={0.55}
        opacity={0.7}
        glow={0.4}
        atmosphere={0}
        followMouse={!reduced}
        mouseInfluence={0.05}
        cursorShadow={false}
        clickPulse={false}
      />
    </div>
  );
}
