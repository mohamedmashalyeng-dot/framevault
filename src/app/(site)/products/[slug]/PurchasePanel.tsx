import Link from "next/link";
import { Lock } from "@/components/icons";
import { BuyButton } from "@/components/product/BuyButton";
import { DownloadButton } from "@/components/product/DownloadButton";
import { FavouriteButton } from "@/components/product/FavouriteButton";
import { PromptViewer } from "@/components/product/PromptViewer";
import { formatBytes } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { decideAccess } from "@/server/access";
import type { ProductDetail } from "@/server/catalogue/queries";
import { isFavourite } from "@/server/favourites";
import { getSessionUser } from "@/server/session";
import { getStoreSettings } from "@/server/settings";

const ACCESS_NOTE: Record<string, string> = {
  free: "Free product. Copy the prompt or download the files, no purchase needed.",
  owned: "You own this product. It is in your library.",
  all_access: "Included with your all-access pass.",
  admin: "Administrator view: full access for review.",
};

/**
 * State-aware buy / copy / download controls. Reads the session, so it
 * streams. Price and store settings are read live here (not from the cached
 * product detail) so the amount next to the buy button is always current.
 */
export async function PurchasePanel({ product }: { product: ProductDetail }) {
  const user = await getSessionUser();
  const viewer = user ? { id: user.id, role: user.role } : null;
  const [decision, favourite, settings] = await Promise.all([
    decideAccess(viewer, product.slug),
    user ? isFavourite(user.id, product.id) : Promise.resolve(false),
    getStoreSettings(),
  ]);
  const priceCents = decision.product?.priceCents ?? product.priceCents;
  const v = product.version;
  const hasPrompt = Boolean(v?.hasPrompt);
  const hasSource = Boolean(v?.hasSource);
  const returnTo = `/products/${product.slug}`;
  const price = formatPrice(priceCents, settings.currency);

  return (
    <div className="rounded-2xl border border-line bg-graphite-900 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-3xl font-semibold tracking-tight">
          {priceCents === 0 ? <span className="text-mint">Free</span> : price}
        </p>
        {settings.demoPricing && priceCents > 0 && (
          <span className="rounded-full border border-warning/40 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-warning">
            Demo pricing
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        {priceCents === 0 ? "Free licence" : "One-time payment · standard licence"}
      </p>

      <div className="mt-5 space-y-3">
        {decision.allowed ? (
          <>
            <p className="rounded-lg bg-mint/10 px-3 py-2 text-sm text-mint">{ACCESS_NOTE[decision.reason]}</p>
            {hasPrompt && <PromptViewer slug={product.slug} />}
            {hasSource && <DownloadButton slug={product.slug} size={v?.archiveSize} />}
          </>
        ) : product.status === "archived" ? (
          <p className="rounded-lg border border-line px-3 py-2 text-sm text-muted">
            This product has been retired and is no longer sold. Existing owners can still access it from their library.
          </p>
        ) : decision.reason === "sign_in_required" ? (
          <>
            <Link href={`/sign-in?next=${encodeURIComponent(returnTo)}`} className="btn btn-primary w-full">
              Sign in to buy · {price}
            </Link>
            <p className="text-center text-xs text-muted">
              New here?{" "}
              <Link href={`/sign-up?next=${encodeURIComponent(returnTo)}`} className="text-paper-dim underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </>
        ) : (
          <BuyButton target={{ type: "product", slug: product.slug }} label={`Buy now · ${price}`} />
        )}

        {!decision.allowed && product.status === "published" && settings.allAccess.enabled && (
          <p className="text-center text-xs text-muted">
            Or unlock everything with{" "}
            <Link href="/all-access" className="text-paper-dim underline underline-offset-4 hover:text-paper">
              all-access for {formatPrice(settings.allAccess.priceCents, settings.currency)}
            </Link>
          </p>
        )}
      </div>

      {!decision.allowed && (
        <ul className="mt-5 space-y-2 border-t border-line pt-4 text-sm text-muted" aria-label="Unlocks after purchase">
          {hasPrompt && (
            <li className="flex items-center gap-2">
              <Lock size={14} /> AI prompt · {v!.promptWords.toLocaleString("en-GB")} words
            </li>
          )}
          {hasSource && (
            <li className="flex items-center gap-2">
              <Lock size={14} /> Source ZIP · {v!.archiveManifest?.fileCount ?? "?"} files
              {v!.archiveSize ? `, ${formatBytes(v!.archiveSize)}` : ""}
            </li>
          )}
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <FavouriteButton productId={product.id} initial={favourite} signedIn={Boolean(user)} returnTo={returnTo} />
      </div>
    </div>
  );
}

export function PurchasePanelSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-graphite-900 p-5" aria-hidden>
      <div className="h-9 w-24 rounded skeleton" />
      <div className="mt-2 h-4 w-40 rounded skeleton" />
      <div className="mt-6 h-11 w-full rounded-full skeleton" />
      <div className="mt-3 h-11 w-full rounded-full skeleton" />
    </div>
  );
}
