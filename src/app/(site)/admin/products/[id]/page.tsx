import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/ActionButton";
import { MediaUploadForm, NewVersionForm, VersionTextForm } from "@/components/admin/ProductEditorForms";
import { ProductForm } from "@/components/admin/ProductForm";
import { MediaImage } from "@/components/MediaImage";
import { formatBytes, formatDate } from "@/lib/format";
import {
  createVersionAction,
  deleteDraftAction,
  releaseVersionAction,
  removeMediaAction,
  setProductStatusAction,
  updateProductAction,
  updateVersionTextAction,
  uploadMediaAction,
} from "@/server/actions/admin";
import { getProductForAdmin, getVersionPrompt, listCategoriesWithUsage, listTagsWithUsage } from "@/server/admin/catalogue";
import { demoUrlFor } from "@/server/demo-url";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Edit product" };

export default function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<div className="h-[40rem] rounded-2xl skeleton" />}>
      <Editor params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function nextVersion(versions: { version: string }[]): string {
  const latest = versions
    .map((v) => v.version.split("-")[0].split(".").map(Number))
    .sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0];
  return latest ? `${latest[0]}.${latest[1] + 1}.0` : "1.0.0";
}

async function Editor({ params, searchParams }: Pick<PageProps<"/admin/products/[id]">, "params" | "searchParams">) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;
  const data = await getProductForAdmin(id);
  if (!data) notFound();
  const { product: p, tags, versions, media } = data;
  const [categories, allTags] = await Promise.all([listCategoriesWithUsage(), listTagsWithUsage()]);
  const current = versions.find((v) => v.id === p.currentVersionId) ?? null;
  const prompts = new Map(await Promise.all(versions.slice(0, 5).map(async (v) => [v.id, await getVersionPrompt(v.id)] as const)));
  const byKind = (kind: string) => tags.filter((t) => t.kind === kind).map((t) => t.name).join(", ");
  const poster = media.find((m) => m.kind === "poster");
  const screenshots = media.filter((m) => m.kind === "screenshot");

  return (
    <div className="space-y-12">
      <div>
        <Link href="/admin/products" className="text-sm text-muted hover:text-paper">
          ← Products
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{p.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="font-mono">/products/{p.slug}</span>
              <span className="chip">{p.status}</span>
              {p.isDemoContent && <span className="chip border-warning/40 text-warning">Demo inventory (starter content)</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {p.status !== "draft" && (
              <Link href={`/products/${p.slug}`} className="btn btn-ghost btn-sm" target="_blank">
                View in store ↗
              </Link>
            )}
            {p.status !== "published" && (
              <ActionButton
                action={setProductStatusAction.bind(null, p.id, "published")}
                label={p.status === "archived" ? "Re-publish" : "Publish"}
                variant="primary"
              />
            )}
            {p.status === "published" && (
              <ActionButton
                action={setProductStatusAction.bind(null, p.id, "archived")}
                label="Archive"
                confirm="Archive this product? It disappears from the catalogue and cannot be bought, but owners keep access."
              />
            )}
            {p.status === "draft" && !p.publishedAt && (
              <ActionButton action={deleteDraftAction.bind(null, p.id)} label="Delete draft" variant="danger" confirm="Delete this draft and its files permanently?" />
            )}
          </div>
        </div>
        {query.created && (
          <p className="mt-4 rounded-lg bg-mint/10 px-3 py-2 text-sm text-mint">
            Draft created. Upload a poster and create a first version, then publish.
          </p>
        )}
        {p.isDemoContent && (
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-paper-dim">
            This product is part of the demo inventory seeded with the project. Replace or archive it before launch.
          </p>
        )}
      </div>

      <section aria-labelledby="details-title">
        <h2 id="details-title" className="text-lg font-medium">
          Details
        </h2>
        <div className="mt-4">
          <ProductForm
            action={updateProductAction.bind(null, p.id)}
            categories={categories}
            submitLabel="Save details"
            initial={{
              title: p.title,
              slug: p.slug,
              tagline: p.tagline,
              description: p.description,
              categoryId: p.categoryId,
              price: (p.priceCents / 100).toFixed(2),
              licenceType: p.licenceType,
              licenceSummary: p.licenceSummary,
              isFeatured: p.isFeatured,
              featuredRank: p.featuredRank,
              technologies: byKind("technology"),
              styles: byKind("style"),
              topics: byKind("topic"),
            }}
            tagSuggestions={{
              technology: allTags.filter((t) => t.kind === "technology").map((t) => t.name),
              style: allTags.filter((t) => t.kind === "style").map((t) => t.name),
              topic: allTags.filter((t) => t.kind === "topic").map((t) => t.name),
            }}
          />
        </div>
      </section>

      <section aria-labelledby="media-title">
        <h2 id="media-title" className="text-lg font-medium">
          Preview media
        </h2>
        <p className="mt-1 text-sm text-muted">Images are re-encoded to WebP renditions and a share image; originals are discarded.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...(poster ? [poster] : []), ...screenshots].map((m) => (
            <figure key={m.id} className="overflow-hidden rounded-xl border border-line">
              <MediaImage
                media={{ key: m.storageKey, widths: m.widths, width: m.width, height: m.height, alt: m.alt }}
                sizes="320px"
                className="aspect-[16/10] w-full object-cover object-top"
              />
              <figcaption className="flex items-start justify-between gap-2 p-3 text-xs">
                <span className="min-w-0">
                  <span className="font-mono uppercase text-subtle">{m.kind}</span>
                  <span className="mt-0.5 block truncate text-muted">{m.alt}</span>
                </span>
                <ActionButton action={removeMediaAction.bind(null, m.id)} label="Remove" variant="ghost" confirm="Remove this image?" />
              </figcaption>
            </figure>
          ))}
        </div>
        {!poster && <p className="mt-3 text-sm text-warning">A poster is required before publishing.</p>}
        <div className="mt-4">
          <MediaUploadForm action={uploadMediaAction.bind(null, p.id)} />
        </div>
      </section>

      <section aria-labelledby="versions-title">
        <h2 id="versions-title" className="text-lg font-medium">
          Versions and deliverables
        </h2>
        <p className="mt-1 text-sm text-muted">Customers always receive the current version. Prompts and archives are never shown on public pages.</p>
        {versions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line-strong p-6 text-sm text-muted">No versions yet. Create the first one below.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {versions.map((v) => (
              <li key={v.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono">
                      v{v.version}{" "}
                      {v.id === p.currentVersionId && <span className="chip ml-1 border-mint/40 text-mint">current</span>}
                      {!v.releasedAt && <span className="chip ml-1">unreleased</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {v.releasedAt ? `Released ${formatDate(v.releasedAt)}` : `Created ${formatDate(v.createdAt)}`} · prompt {v.promptWords} words ·{" "}
                      {v.archiveFileName ? `${v.archiveFileName} (${formatBytes(v.archiveSize ?? 0)}, ${v.archiveManifest?.fileCount ?? 0} files)` : "no source archive"} ·{" "}
                      {v.demoKey ? (
                        <a href={demoUrlFor(v.demoKey)!} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          demo
                        </a>
                      ) : (
                        "no demo"
                      )}
                    </p>
                    {v.changelog && <p className="mt-1 text-sm text-paper-dim">{v.changelog}</p>}
                  </div>
                  {v.id !== p.currentVersionId && (
                    <ActionButton action={releaseVersionAction.bind(null, p.id, v.id)} label="Make current" confirm={`Serve v${v.version} to customers?`} />
                  )}
                </div>
                {prompts.has(v.id) && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-muted hover:text-paper">Edit prompt and notes</summary>
                    <VersionTextForm
                      action={updateVersionTextAction.bind(null, v.id)}
                      prompt={prompts.get(v.id) ?? ""}
                      changelog={v.changelog}
                      requirements={v.requirements}
                      technologyNotes={v.technologyNotes}
                    />
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8">
          <h3 className="font-medium">Create a new version</h3>
          <div className="mt-4">
            <NewVersionForm
              action={createVersionAction.bind(null, p.id)}
              suggestedVersion={nextVersion(versions)}
              currentPrompt={current ? (prompts.get(current.id) ?? "") : ""}
              currentRequirements={current?.requirements ?? []}
              currentTechnologyNotes={current?.technologyNotes ?? ""}
              hasCurrentDemo={Boolean(current?.demoKey)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
