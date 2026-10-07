import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/ActionButton";
import { CategoryForm, TagCreateForm, TagRenameForm } from "@/components/admin/TaxonomyForms";
import { createTagAction, deleteCategoryAction, deleteTagAction, renameTagAction, saveCategoryAction } from "@/server/actions/admin";
import { listCategoriesWithUsage, listTagsWithUsage } from "@/server/admin/catalogue";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Categories & tags" };

export default function TaxonomyPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Categories &amp; tags</h1>
      <Suspense fallback={<div className="mt-8 h-96 rounded-2xl skeleton" />}>
        <Taxonomy />
      </Suspense>
    </div>
  );
}

const KIND_LABEL = { technology: "Technologies", style: "Visual styles", topic: "Topics" } as const;

async function Taxonomy() {
  await requireAdminPage();
  const [categories, tags] = await Promise.all([listCategoriesWithUsage(), listTagsWithUsage()]);

  return (
    <>
      <section className="mt-8">
        <h2 className="text-lg font-medium">Categories</h2>
        <p className="mt-1 text-sm text-muted">Categories with products cannot be deleted. Order controls their position in navigation.</p>
        <ul className="mt-4 space-y-3">
          {categories.map((c) => (
            <li key={c.id} className="rounded-xl border border-line p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-muted">
                <span>
                  {c.products} {c.products === 1 ? "product" : "products"}
                </span>
                {c.products === 0 && (
                  <ActionButton action={deleteCategoryAction.bind(null, c.id)} label="Delete" variant="ghost" confirm={`Delete category ${c.name}?`} />
                )}
              </div>
              <CategoryForm action={saveCategoryAction.bind(null, c.id)} initial={c} submitLabel="Save" />
            </li>
          ))}
          <li className="rounded-xl border border-dashed border-line-strong p-4">
            <p className="mb-3 text-sm font-medium">New category</p>
            <CategoryForm action={saveCategoryAction.bind(null, null)} submitLabel="Create" />
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium">Tags</h2>
        <p className="mt-1 text-sm text-muted">
          Technology and style tags drive the catalogue filters. Tags are also created automatically when you type new ones on a product.
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-line-strong p-4">
          <TagCreateForm action={createTagAction} />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {(["technology", "style", "topic"] as const).map((kind) => (
            <div key={kind}>
              <h3 className="eyebrow">{KIND_LABEL[kind]}</h3>
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
                {tags
                  .filter((t) => t.kind === kind)
                  .map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <TagRenameForm action={renameTagAction.bind(null, t.id)} name={t.name} />
                      <span className="flex items-center gap-1 text-xs text-subtle">
                        {t.products}
                        <ActionButton
                          action={deleteTagAction.bind(null, t.id)}
                          label="Delete"
                          variant="ghost"
                          confirm={`Delete tag ${t.name}? It will be removed from ${t.products} product(s).`}
                        />
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
