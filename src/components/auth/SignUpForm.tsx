"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient, authErrorMessage, safeNext } from "@/lib/auth-client";
import { Spinner } from "../icons";
import { FieldError, FormAlert } from "./AuthShell";

type Errors = Partial<Record<"name" | "email" | "password" | "confirm", string>>;

export function SignUpForm() {
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    const found: Errors = {};
    if (name.length < 2) found.name = "Enter your name (at least 2 characters).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) found.email = "Enter a valid email address.";
    if (password.length < 10) found.password = "Use at least 10 characters.";
    else if (password.length > 128) found.password = "Use 128 characters or fewer.";
    if (confirm !== password) found.confirm = "The passwords don't match.";
    setErrors(found);
    setError(null);
    if (Object.keys(found).length) return;

    setPending(true);
    const { error: authError } = await authClient.signUp.email({ name, email, password });
    if (authError) {
      setPending(false);
      setError(authErrorMessage(authError));
      return;
    }
    window.location.assign(next);
  }

  const field = (key: keyof Errors) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      <FormAlert message={error} />
      <div>
        <label htmlFor="name" className="label">
          Name
        </label>
        <input id="name" name="name" autoComplete="name" className="field" {...field("name")} />
        <FieldError id="name-error" message={errors.name} />
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className="field" {...field("email")} />
        <FieldError id="email-error" message={errors.email} />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" className="field" {...field("password")} />
        {errors.password ? (
          <FieldError id="password-error" message={errors.password} />
        ) : (
          <p className="mt-1.5 text-xs text-subtle">At least 10 characters.</p>
        )}
      </div>
      <div>
        <label htmlFor="confirm" className="label">
          Confirm password
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="field" {...field("confirm")} />
        <FieldError id="confirm-error" message={errors.confirm} />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending && <Spinner size={15} />} {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
