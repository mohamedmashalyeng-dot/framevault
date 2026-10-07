import type { Metadata } from "next";
import { Suspense } from "react";
import { SignOutButton } from "@/components/site/SignOutButton";
import { requireUser } from "@/server/session";
import { ListSkeleton } from "../ListSkeleton";
import { ChangePasswordForm, ProfileForm } from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const user = await requireUser("/account/settings");
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <section className="mt-8 rounded-2xl border border-line p-5">
        <h2 className="font-medium">Profile</h2>
        <p className="mt-1 text-sm text-muted">Signed in as {user.email}</p>
        <div className="mt-5">
          <ProfileForm initialName={user.name} />
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-line p-5">
        <h2 className="font-medium">Change password</h2>
        <div className="mt-5">
          <ChangePasswordForm />
        </div>
      </section>
      <section className="mt-6 flex items-center justify-between rounded-2xl border border-line p-5">
        <div>
          <h2 className="font-medium">Sign out</h2>
          <p className="mt-1 text-sm text-muted">End your session on this device.</p>
        </div>
        <SignOutButton className="btn btn-secondary btn-sm" />
      </section>
    </div>
  );
}
