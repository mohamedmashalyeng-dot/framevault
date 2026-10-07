import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdminPage } from "@/server/session";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 w-full max-w-7xl px-4 py-10"><div className="h-full rounded-2xl skeleton" /></div>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

/** Non-admins get a 404 before any admin UI renders. Pages and actions re-check. */
async function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[13rem_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow">Administration</p>
        <p className="mt-1 truncate text-xs text-subtle">{admin.email}</p>
        <AdminNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
