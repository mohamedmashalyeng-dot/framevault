"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

/**
 * Fades sections in as they scroll into view. Mark an element with
 * `data-reveal` to move it as one block, or `data-reveal-children` to stagger
 * its direct children (grids and lists). Nothing is hidden before this runs,
 * and nothing moves at all for visitors who prefer reduced motion.
 */
export function ScrollReveal() {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const reveal = (targets: Element | Element[], trigger: Element, stagger = 0) =>
        gsap.from(targets, {
          autoAlpha: 0,
          y: 24,
          duration: 0.9,
          ease: "power2.out",
          stagger,
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger, start: "top 88%", once: true },
        });

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => reveal(el, el));
      gsap.utils
        .toArray<HTMLElement>("[data-reveal-children]")
        .forEach((el) => reveal(Array.from(el.children), el, 0.08));
    });
    return () => mm.revert();
  }, []);

  return null;
}
