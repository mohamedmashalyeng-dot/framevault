import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { PRODUCT_STATUSES, type ProductStatus } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { listProductsForAdmin } from "@/server/admin/catalogue";
import { getStoreSettings } from "@/server/settings";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Products" };

const STATUS_STYLE: Record<ProductStatus, string> = {
  published: "border-mint/40 text-mint",
  draft: "border-warning/40 text-warning",
  archived: "border-line-strong text-muted",
};

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          Upload product
        </Link>
      </div>
      <Suspense fallback={<div className="mt-8 h-96 rounded-2xl skeleton" />}>
        <ProductTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProductTable({ searchParams }: Pick<PageProps<"/admin/products">, "searchParams">) {
  await requireAdminPage();
  const params = await searchParams;
  const status = (PRODUCT_STATUSES as readonly string[]).includes(String(params.status)) ? (params.status as ProductStatus) : "all";
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const [rows, settings] = await Promise.all([listProductsForAdmin({ status, q }), getStoreSettings()]);

  return (
    <>
      {params.deleted && <p className="mt-4 rounded-lg bg-mint/10 px-3 py-2 text-sm text-mint">Draft deleted.</p>}
      <Form action="/admin/products" className="mt-6 flex flex-wrap items-center gap-2">
        <label htmlFor="admin-q" className="sr-only">
          Search products
        </label>
        <input id="admin-q" name="q" defaultValue={q} placeholder="Search title or slug" className="field h-10 max-w-xs" />
        <label htmlFor="admin-status" className="sr-only">
          Status
        </label>
        <select id="admin-status" name="status" defaultValue={status} className="field h-10 w-auto">
          <option value="all">All statuses</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary btn-sm">
          Filter
        </button>
      </Form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-normal">Product</th>
              <th scope="col" className="px-4 py-3 font-normal">Status</th>
              <th scope="col" className="px-4 py-3 font-normal">Price</th>
              <th scope="col" className="px-4 py-3 font-normal">Deliverables</th>
              <th scope="col" className="px-4 py-3 font-normal">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No products match.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-mint">
                    {p.title}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                    {p.categoryName}
                    {p.isFeatured && <span className="chip h-5 text-[0.65rem]">Featured #{p.featuredRank}</span>}
                    {p.isDemoContent && <span className="chip h-5 border-warning/40 text-[0.65rem] text-warning">Demo inventory</span>}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[0.68rem] uppercase ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 font-mono">{formatPrice(p.priceCents, settings.currency)}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {p.version ? `v${p.version}` : "No release"}
                  {p.hasSource ? " · source" : ""}
                  {p.hasPrompt ? " · prompt" : ""}
                  {p.hasDemo ? " · demo" : ""}
                </td>
                <td className="px-4 py-3 text-xs text-muted">{formatDate(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
