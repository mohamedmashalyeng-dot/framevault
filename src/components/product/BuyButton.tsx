"use client";

import { useActionState } from "react";
import { checkoutAction, type CheckoutState } from "@/server/actions/store";
import { Spinner } from "../icons";

/** Posts only the product slug (or "all_access"); the server sets the price. */
export function BuyButton({
  target,
  label,
  variant = "primary",
}: {
  target: { type: "product"; slug: string } | { type: "all_access" };
  label: string;
  variant?: "primary" | "secondary";
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction, { error: null });
  return (
    <form action={action}>
      <input type="hidden" name="type" value={target.type} />
      {target.type === "product" && <input type="hidden" name="slug" value={target.slug} />}
      <button type="submit" disabled={pending} className={`btn ${variant === "primary" ? "btn-primary" : "btn-secondary"} w-full`}>
        {pending && <Spinner size={15} />}
        {pending ? "Starting checkout…" : label}
      </button>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
