"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient, authErrorMessage, safeNext } from "@/lib/auth-client";
import { Spinner } from "../icons";
import { FieldError, FormAlert } from "./AuthShell";

export function SignInForm() {
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const errors: typeof fieldErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter the email address you signed up with.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) return;

    setPending(true);
    const { error: authError } = await authClient.signIn.email({ email, password });
    if (authError) {
      setPending(false);
      setError(authErrorMessage(authError));
      return;
    }
    // A full load: prefetched pages from before sign-in must not be reused.
    window.location.assign(next);
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      <FormAlert message={error} />
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
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
        <FieldError id="email-error" message={fieldErrors.email} />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="label">
            Password
          </label>
          <Link href="/forgot-password" className="text-sm text-muted hover:text-paper">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="field"
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
        />
        <FieldError id="password-error" message={fieldErrors.password} />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending && <Spinner size={15} />} {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
