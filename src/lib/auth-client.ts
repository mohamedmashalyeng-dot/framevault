import { createAuthClient } from "better-auth/react";

/** Browser client for Better Auth's /api/auth endpoints (same origin). */
export const authClient = createAuthClient();

/** Only same-site relative paths are accepted as post-auth destinations. */
export function safeNext(value: string | null | undefined, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

export function authErrorMessage(error: { status?: number; message?: string; code?: string } | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match an account.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Try signing in instead.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 10 characters for your password.";
    case "PASSWORD_TOO_LONG":
      return "That password is too long (128 characters maximum).";
    case "INVALID_TOKEN":
      return "This reset link is invalid or has expired. Request a new one.";
    case "INVALID_PASSWORD":
      return "Your current password is incorrect.";
    default:
      return error.message || "Something went wrong. Please try again.";
  }
}
