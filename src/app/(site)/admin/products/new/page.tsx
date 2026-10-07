import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EMPTY_PRODUCT, ProductForm } from "@/components/admin/ProductForm";
import { createProductAction } from "@/server/actions/admin";
import { listCategoriesWithUsage, listTagsWithUsage } from "@/server/admin/catalogue";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="text-sm text-muted hover:text-paper">
        ← Products
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">New product</h1>
      <p className="mt-2 text-muted">
        Products start as drafts. After saving you can upload media, add a version with a prompt and source archive, and publish.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-96 rounded-2xl skeleton" />}>
          <NewProductForm />
        </Suspense>
      </div>
    </div>
  );
}

async function NewProductForm() {
  await requireAdminPage();
  const [categories, tags] = await Promise.all([listCategoriesWithUsage(), listTagsWithUsage()]);
  return (
    <ProductForm
      action={createProductAction}
      categories={categories}
      initial={EMPTY_PRODUCT}
      submitLabel="Create draft"
      tagSuggestions={{
        technology: tags.filter((t) => t.kind === "technology").map((t) => t.name),
        style: tags.filter((t) => t.kind === "style").map((t) => t.name),
        topic: tags.filter((t) => t.kind === "topic").map((t) => t.name),
      }}
    />
  );
}
