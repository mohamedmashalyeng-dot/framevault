import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UploadProductForm } from "@/components/admin/UploadProductForm";
import { uploadProductAction } from "@/server/actions/admin";
import { listCategoriesWithUsage, listTagsWithUsage } from "@/server/admin/catalogue";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Upload product" };

export default function UploadProductPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="text-sm text-muted hover:text-paper">
        ← Products
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Upload a product</h1>
      <p className="mt-2 text-muted">
        Everything in one place: details, preview images, the source code ZIP, a live demo and the AI prompt. Files are checked
        before anything is saved.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-96 rounded-2xl skeleton" />}>
          <Form />
        </Suspense>
      </div>
    </div>
  );
}

async function Form() {
  await requireAdminPage();
  const [categories, tags] = await Promise.all([listCategoriesWithUsage(), listTagsWithUsage()]);
  return (
    <UploadProductForm
      action={uploadProductAction}
      categories={categories}
      tagSuggestions={{
        technology: tags.filter((t) => t.kind === "technology").map((t) => t.name),
        style: tags.filter((t) => t.kind === "style").map((t) => t.name),
        topic: tags.filter((t) => t.kind === "topic").map((t) => t.name),
      }}
    />
  );
}
