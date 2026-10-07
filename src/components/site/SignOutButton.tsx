"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ className = "" }: { className?: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        // A full load drops every page prefetched while signed in.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/");
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
