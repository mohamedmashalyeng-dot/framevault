import { useState, type FormEvent } from "react";

const ENDPOINT = import.meta.env.VITE_WAITLIST_ENDPOINT;

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

export function WaitlistForm({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState({ kind: "error", message: "Enter a valid work email address." });
      return;
    }
    if (!ENDPOINT) {
      // Demo mode: nothing is sent anywhere.
      setState({ kind: "done" });
      return;
    }
    setState({ kind: "sending" });
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState({ kind: "done" });
    } catch {
      setState({ kind: "error", message: "We couldn't add you just now. Please try again in a minute." });
    }
  }

  if (state.kind === "done") {
    return (
      <p role="status" className="rounded-lg border border-volt/40 bg-volt/10 px-4 py-3 font-mono text-sm text-volt">
        You're on the list. We'll email you an invite.
      </p>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="w-full max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={id} className="sr-only">
          Work email
        </label>
        <input
          id={id}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={state.kind === "error"}
          aria-describedby={state.kind === "error" ? `${id}-error` : undefined}
          className="min-w-0 flex-1 rounded-lg border border-edge bg-void px-4 py-3 text-sm outline-none placeholder:text-fog/70 focus:border-volt"
        />
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className="rounded-lg bg-volt px-5 py-3 text-sm font-semibold text-void transition hover:brightness-110 disabled:opacity-60"
        >
          {state.kind === "sending" ? "Joining…" : "Request access"}
        </button>
      </div>
      {state.kind === "error" && (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-400">
          {state.message}
        </p>
      )}
    </form>
  );
}
