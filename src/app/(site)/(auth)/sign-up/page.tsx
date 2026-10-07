import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Keep purchases, free downloads and favourites in one library."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="text-paper underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-96 rounded-xl skeleton" />}>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
