import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDateTime } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { getDashboardStats } from "@/server/admin/people";
import { getStoreSettings } from "@/server/settings";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Overview" };

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<div className="h-80 rounded-2xl skeleton" />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  await requireAdminPage();
  const [stats, settings] = await Promise.all([getDashboardStats(), getStoreSettings()]);
  const productCount = (s: string) => stats.products.find((p) => p.status === s)?.count ?? 0;
  const paid = stats.orders.find((o) => o.status === "paid");
  const pending = stats.orders.find((o) => o.status === "pending");

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="chip">Payments: {settings.paymentProvider === "simulated" ? "simulated (development)" : "Stripe"}</span>
        <span className="chip">Currency: {settings.currency}</span>
        {settings.demoPricing && <span className="chip border-warning/40 text-warning">Demo pricing labels on</span>}
      </div>

      <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Published products", productCount("published"), `${productCount("draft")} draft · ${productCount("archived")} archived`],
          ["Paid orders", paid?.count ?? 0, `${paid?.total ? formatPrice(paid.total, settings.currency) : "No"} revenue`],
          ["Pending orders", pending?.count ?? 0, "Awaiting provider confirmation"],
          ["Accounts", stats.customers, `${stats.entitlements} active entitlements`],
        ].map(([label, value, note]) => (
          <div key={String(label)} className="bg-graphite-950 p-5">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</dd>
            <dd className="mt-1 text-xs text-subtle">{note}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm text-muted hover:text-paper">
            All orders
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {stats.recent.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{o.title}</p>
                  <p className="font-mono text-xs text-subtle">
                    {o.email} · {formatDateTime(o.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{formatPrice(o.totalCents, o.currency)}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["/admin/products/new", "Add a product", "Create a draft, upload media and a source archive, then publish."],
          ["/admin/taxonomy", "Organise the catalogue", "Manage categories and the technology, style and topic tags."],
          ["/admin/settings", "Store settings", "Turn the all-access bundle on or off and set its price."],
        ].map(([href, title, body]) => (
          <Link key={href} href={href} className="rounded-2xl border border-line p-5 transition-colors hover:border-line-strong">
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
