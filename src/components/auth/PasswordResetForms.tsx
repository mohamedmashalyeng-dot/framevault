"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { Spinner } from "../icons";
import { FieldError, FormAlert } from "./AuthShell";

export function ForgotPasswordForm({ showDevOutbox }: { showDevOutbox: boolean }) {
  const [state, setState] = useState<{ kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [emailError, setEmailError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    setState({ kind: "sending" });
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` });
    setState(error ? { kind: "error", message: authErrorMessage(error) } : { kind: "sent" });
  }

  if (state.kind === "sent") {
    return (
      <div className="space-y-4">
        <FormAlert tone="success" message="If an account exists for that email, a reset link is on its way. It expires in one hour." />
        {showDevOutbox && (
          <p className="text-sm text-muted">
            Development mode: no email service is configured, so messages are saved to the{" "}
            <Link href="/dev/outbox" className="text-paper underline underline-offset-4">
              local outbox
            </Link>
            .
          </p>
        )}
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      <FormAlert message={state.kind === "error" ? state.message : null} />
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="field"
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "email-error" : undefined}
        />
        <FieldError id="email-error" message={emailError} />
      </div>
      <button type="submit" disabled={state.kind === "sending"} className="btn btn-primary w-full">
        {state.kind === "sending" && <Spinner size={15} />} Send reset link
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const invalid = params.get("error") === "INVALID_TOKEN" || !token;
  const [state, setState] = useState<{ kind: "idle" | "saving" | "done" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  if (invalid) {
    return (
      <div className="space-y-4">
        <FormAlert message="This reset link is invalid or has expired." />
        <Link href="/forgot-password" className="btn btn-secondary w-full">
          Request a new link
        </Link>
      </div>
    );
  }

  if (state.kind === "done") {
    return (
      <div className="space-y-4">
        <FormAlert tone="success" message="Your password has been changed. For security, you've been signed out everywhere." />
        <Link href="/sign-in" className="btn btn-primary w-full">
          Sign in
        </Link>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const found: typeof errors = {};
    if (password.length < 10) found.password = "Use at least 10 characters.";
    if (confirm !== password) found.confirm = "The passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setState({ kind: "saving" });
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    setState(error ? { kind: "error", message: authErrorMessage(error) } : { kind: "done" });
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      <FormAlert message={state.kind === "error" ? state.message : null} />
      <div>
        <label htmlFor="password" className="label">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="field"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        <FieldError id="password-error" message={errors.password} />
      </div>
      <div>
        <label htmlFor="confirm" className="label">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          className="field"
          aria-invalid={Boolean(errors.confirm)}
          aria-describedby={errors.confirm ? "confirm-error" : undefined}
        />
        <FieldError id="confirm-error" message={errors.confirm} />
      </div>
      <button type="submit" disabled={state.kind === "saving"} className="btn btn-primary w-full">
        {state.kind === "saving" && <Spinner size={15} />} Change password
      </button>
    </form>
  );
}
