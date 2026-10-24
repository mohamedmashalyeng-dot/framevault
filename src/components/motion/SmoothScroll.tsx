"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scrolling for the storefront. Lenis runs on GSAP's ticker instead of
 * its own requestAnimationFrame loop, so scroll position and ScrollTrigger
 * animations update in the same frame. Visitors who prefer reduced motion
 * keep the browser's native scrolling.
 */
export function SmoothScroll() {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Anchor links land below the sticky header, matching scroll-margin-top.
      const lenis = new Lenis({ autoRaf: false, anchors: { offset: -88 }, lerp: 0.12 });
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      return () => {
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.destroy();
      };
    });
    return () => mm.revert();
  }, []);

  return null;
}
