"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPromptForViewer, issueDownloadLink } from "../deliverables";
import { setFavourite } from "../favourites";
import { cancelPendingOrder, startCheckout } from "../orders";
import { getSessionUser, getViewer } from "../session";

/**
 * Customer-facing Server Actions. Each one re-reads the session and decides
 * access on the server; nothing the browser sends is trusted beyond the
 * product slug or id it names.
 */

const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);

export type PromptResult =
  | { ok: true; prompt: string; version: string; title: string }
  | { ok: false; message: string; reason: string };

export async function revealPromptAction(slug: string): Promise<PromptResult> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { ok: false, message: "Product not found.", reason: "unavailable" };
  const result = await getPromptForViewer(await getViewer(), parsed.data);
  if (!result.ok) return { ok: false, message: result.message, reason: result.reason };
  return { ok: true, prompt: result.prompt, version: result.version, title: result.title };
}

export type DownloadResult =
  | { ok: true; url: string; fileName: string; size: number }
  | { ok: false; message: string; reason: string };

export async function requestDownloadAction(slug: string): Promise<DownloadResult> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { ok: false, message: "Product not found.", reason: "unavailable" };
  const result = await issueDownloadLink(await getViewer(), parsed.data);
  if (!result.ok) return { ok: false, message: result.message, reason: result.reason };
  return { ok: true, url: result.url, fileName: result.fileName, size: result.size };
}

export async function setFavouriteAction(
  productId: string,
  on: boolean,
): Promise<{ ok: true; favourite: boolean } | { ok: false; reason: "sign_in_required" | "invalid" }> {
  if (!/^prd_[A-Za-z0-9_-]{8,40}$/.test(productId)) return { ok: false, reason: "invalid" };
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "sign_in_required" };
  return { ok: true, favourite: await setFavourite(user.id, productId, on) };
}

export type CheckoutState = { error: string | null };

const checkoutForm = z.discriminatedUnion("type", [
  z.object({ type: z.literal("product"), slug: slugSchema }),
  z.object({ type: z.literal("all_access") }),
]);

/** Starts a server-priced checkout session and redirects to the provider. */
export async function checkoutAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const parsed = checkoutForm.safeParse({ type: formData.get("type"), slug: formData.get("slug") ?? undefined });
  if (!parsed.success) return { error: "That product could not be found." };
  const target = parsed.data;
  const returnTo = target.type === "product" ? `/products/${target.slug}` : "/all-access";

  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);

  const result = await startCheckout(user, target.type === "product" ? { type: "product", slug: target.slug } : { type: "all_access" });
  if (!result.ok) {
    if (result.code === "already_owned") redirect(returnTo);
    return { error: result.message };
  }
  redirect(result.url);
}

export async function cancelCheckoutAction(orderId: string) {
  if (!/^ord_[A-Za-z0-9_-]{8,40}$/.test(orderId)) return null;
  const user = await getSessionUser();
  if (!user) return null;
  const order = await cancelPendingOrder(user.id, orderId);
  return order ? { status: order.status } : null;
}
