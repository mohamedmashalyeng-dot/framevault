"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FieldError, FormAlert } from "@/components/auth/AuthShell";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export function ProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ kind: "idle" | "saving" | "saved" } | { kind: "error"; message: string }>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (name.length < 2 || name.length > 80) {
      setState({ kind: "error", message: "Use between 2 and 80 characters." });
      return;
    }
    setState({ kind: "saving" });
    const { error } = await authClient.updateUser({ name });
    if (error) setState({ kind: "error", message: authErrorMessage(error) });
    else {
      setState({ kind: "saved" });
      router.refresh();
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">
          Name
        </label>
        <input id="name" name="name" defaultValue={initialName} autoComplete="name" className="field" />
      </div>
      {state.kind === "error" && <FormAlert message={state.message} />}
      {state.kind === "saved" && <FormAlert tone="success" message="Profile updated." />}
      <button type="submit" disabled={state.kind === "saving"} className="btn btn-secondary btn-sm">
        {state.kind === "saving" ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, setState] = useState<{ kind: "idle" | "saving" | "saved" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("current") ?? "");
    const newPassword = String(data.get("next") ?? "");
    const found: typeof errors = {};
    if (!currentPassword) found.current = "Enter your current password.";
    if (newPassword.length < 10) found.next = "Use at least 10 characters.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setState({ kind: "saving" });
    const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    if (error) setState({ kind: "error", message: authErrorMessage(error) });
    else {
      form.reset();
      setState({ kind: "saved" });
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="current" className="label">
          Current password
        </label>
        <input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          className="field"
          aria-invalid={Boolean(errors.current)}
          aria-describedby={errors.current ? "current-error" : undefined}
        />
        <FieldError id="current-error" message={errors.current} />
      </div>
      <div>
        <label htmlFor="next" className="label">
          New password
        </label>
        <input
          id="next"
          name="next"
          type="password"
          autoComplete="new-password"
          className="field"
          aria-invalid={Boolean(errors.next)}
          aria-describedby={errors.next ? "next-error" : undefined}
        />
        <FieldError id="next-error" message={errors.next} />
      </div>
      {state.kind === "error" && <FormAlert message={state.message} />}
      {state.kind === "saved" && <FormAlert tone="success" message="Password changed. Other devices have been signed out." />}
      <button type="submit" disabled={state.kind === "saving"} className="btn btn-secondary btn-sm">
        {state.kind === "saving" ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
