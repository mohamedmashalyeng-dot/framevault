import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm, type DemoAccount } from "@/components/auth/SignInForm";
import { env } from "@/server/env";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function SignInPage() {
  const serverEnv = env();
  const demoAccounts: DemoAccount[] =
    serverEnv.APP_ENV === "development"
      ? [
          { label: "Admin", email: serverEnv.SEED_ADMIN_EMAIL, password: serverEnv.SEED_ADMIN_PASSWORD },
          { label: "Customer", email: serverEnv.SEED_CUSTOMER_EMAIL, password: serverEnv.SEED_CUSTOMER_PASSWORD },
        ].filter((account): account is DemoAccount => Boolean(account.email && account.password))
      : [];

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
        <SignInForm demoAccounts={demoAccounts} />
      </Suspense>
    </AuthShell>
  );
}
