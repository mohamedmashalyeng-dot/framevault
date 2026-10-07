"use client";

import { useEffect, useRef } from "react";
import { cancelCheckoutAction } from "@/server/actions/store";

/**
 * Marks the abandoned order as cancelled and closes the provider session so it
 * cannot be paid later. Runs as a POST (Server Action) after the page loads,
 * never as a side effect of rendering or prefetching.
 */
export function CancelOrder({ orderId }: { orderId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    cancelCheckoutAction(orderId).catch(() => {});
  }, [orderId]);
  return null;
}
