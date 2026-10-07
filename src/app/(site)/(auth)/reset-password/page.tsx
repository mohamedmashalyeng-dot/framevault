import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/PasswordResetForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 10 characters.">
      <Suspense fallback={<div className="h-48 rounded-xl skeleton" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
