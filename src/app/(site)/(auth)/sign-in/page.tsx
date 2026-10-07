import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function SignInPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to open your library, favourites and downloads."
      footer={
        <>
          New to the store?{" "}
          <Link href="/sign-up" className="text-paper underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-64 rounded-xl skeleton" />}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
