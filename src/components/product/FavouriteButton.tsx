"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { setFavouriteAction } from "@/server/actions/store";
import { Heart } from "../icons";

export function FavouriteButton({
  productId,
  initial,
  signedIn,
  returnTo,
  compact = false,
}: {
  productId: string;
  initial: boolean;
  signedIn: boolean;
  returnTo: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [favourite, setOptimistic] = useOptimistic(initial);

  function onClick() {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    startTransition(async () => {
      setOptimistic(!favourite);
      const result = await setFavouriteAction(productId, !favourite);
      if (!result.ok && result.reason === "sign_in_required") router.push(`/sign-in?next=${encodeURIComponent(returnTo)}`);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favourite}
      disabled={pending}
      className={compact ? "btn btn-ghost btn-sm" : "btn btn-ghost w-full"}
    >
      <Heart size={15} filled={favourite} className={favourite ? "text-mint" : undefined} />
      {compact ? <span className="sr-only">{favourite ? "Remove from favourites" : "Add to favourites"}</span> : favourite ? "Saved to favourites" : "Add to favourites"}
    </button>
  );
}
