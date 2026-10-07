"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Spinner } from "@/components/icons";
import { settleDelayedPaymentAction } from "@/server/actions/simulated-checkout";

/** Re-reads the order from the server every few seconds while it is pending. */
export function StatusPoller({ active }: { active: boolean }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!active || attempts >= 30) return;
    const t = setTimeout(() => {
      router.refresh();
      setAttempts((n) => n + 1);
    }, 2000);
    return () => clearTimeout(t);
  }, [active, attempts, router]);

  return (
    <p className="mt-5 flex items-center gap-2 text-sm text-muted" role="status">
      {attempts < 30 ? (
        <>
          <Spinner size={15} /> Checking status…
        </>
      ) : (
        "Still waiting. You can leave this page; your order status is always shown under Account › Orders."
      )}
    </p>
  );
}

/** Development helper for the simulated provider's delayed payments. */
export function DelayedPaymentControls({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const settle = (succeed: boolean) =>
    startTransition(async () => {
      await settleDelayedPaymentAction(orderId, succeed);
      router.refresh();
    });
  return (
    <div className="mt-6 rounded-xl border border-warning/40 p-4">
      <p className="font-mono text-xs uppercase tracking-wider text-warning">Simulated provider</p>
      <p className="mt-1 text-sm text-muted">Send the follow-up webhook a bank would trigger later:</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => settle(true)} className="btn btn-secondary btn-sm">
          Payment clears
        </button>
        <button type="button" disabled={pending} onClick={() => settle(false)} className="btn btn-danger btn-sm">
          Payment fails
        </button>
      </div>
    </div>
  );
}
