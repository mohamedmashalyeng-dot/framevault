"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/server/actions/admin";

const INITIAL: AdminFormState = { error: null, success: null };

/** A one-click admin action (bound Server Action) with optional confirmation. */
export function ActionButton({
  action,
  label,
  pendingLabel,
  confirm,
  variant = "secondary",
  className = "",
}: {
  action: (prev: AdminFormState) => Promise<AdminFormState>;
  label: string;
  pendingLabel?: string;
  confirm?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
}) {
  const [state, run, pending] = useActionState(action, INITIAL);
  return (
    <form
      action={run}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={`inline-flex flex-col gap-1 ${className}`}
    >
      <button type="submit" disabled={pending} className={`btn btn-sm btn-${variant}`}>
        {pending ? (pendingLabel ?? "Working…") : label}
      </button>
      {state.error && (
        <span role="alert" className="max-w-xs text-xs text-danger">
          {state.error}
        </span>
      )}
      {state.success && (
        <span role="status" className="max-w-xs text-xs text-mint">
          {state.success}
        </span>
      )}
    </form>
  );
}

export function FormStatus({ state }: { state: AdminFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="rounded-lg bg-mint/10 px-3 py-2 text-sm text-mint">
        {state.success}
      </p>
    );
  }
  return null;
}
