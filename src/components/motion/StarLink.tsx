"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import StarBorder from "../reactbits/StarBorder";

/**
 * The primary call to action: a `.btn` pill in the brand mint with React Bits'
 * Star Border light travelling around its edge.
 */
export function StarLink({ className = "", ...props }: Omit<ComponentProps<typeof Link>, "as">) {
  return (
    <StarBorder
      as={Link}
      {...props}
      radius={999}
      duration={6}
      glow={0.5}
      color="#f1ede5"
      backgroundColor="var(--color-mint)"
      textColor="var(--color-mint-ink)"
      borderColor="transparent"
      className={`btn py-0 px-[1.15rem] hover:[--star-border-surface:var(--color-mint-strong)] ${className}`}
    />
  );
}
