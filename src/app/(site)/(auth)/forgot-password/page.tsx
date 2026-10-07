import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/PasswordResetForms";
import { isNonProduction } from "@/server/env";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we will send you a link to choose a new password."
      footer={
        <Link href="/sign-in" className="text-paper underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm showDevOutbox={isNonProduction()} />
    </AuthShell>
  );
}
