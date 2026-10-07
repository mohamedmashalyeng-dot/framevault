import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/ActionButton";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { refundOrderAction } from "@/server/actions/admin";
import { listOrdersForAdmin } from "@/server/admin/people";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Orders" };

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
      <p className="mt-1 text-muted">Orders are created at checkout and change status only through verified provider webhooks.</p>
      <Suspense fallback={<div className="mt-8 h-96 rounded-2xl skeleton" />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Orders({ searchParams }: Pick<PageProps<"/admin/orders">, "searchParams">) {
  await requireAdminPage();
  const params = await searchParams;
  const status = (ORDER_STATUSES as readonly string[]).includes(String(params.status)) ? (params.status as OrderStatus) : "all";
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const orders = await listOrdersForAdmin({ status, q });

  return (
    <>
      <Form action="/admin/orders" className="mt-6 flex flex-wrap items-center gap-2">
        <label htmlFor="orders-q" className="sr-only">
          Search orders
        </label>
        <input id="orders-q" name="q" defaultValue={q} placeholder="Order id, email or payment id" className="field h-10 max-w-xs" />
        <label htmlFor="orders-status" className="sr-only">
          Status
        </label>
        <select id="orders-status" name="status" defaultValue={status} className="field h-10 w-auto">
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary btn-sm">
          Filter
        </button>
      </Form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-normal">Order</th>
              <th scope="col" className="px-4 py-3 font-normal">Customer</th>
              <th scope="col" className="px-4 py-3 font-normal">Items</th>
              <th scope="col" className="px-4 py-3 font-normal">Total</th>
              <th scope="col" className="px-4 py-3 font-normal">Status</th>
              <th scope="col" className="px-4 py-3 font-normal">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No orders match.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-mono text-xs">{o.id}</p>
                  <p className="mt-0.5 text-xs text-subtle">
                    {formatDateTime(o.createdAt)} · {o.provider}
                  </p>
                  {o.providerPaymentId && <p className="font-mono text-[0.7rem] text-subtle">{o.providerPaymentId}</p>}
                </td>
                <td className="px-4 py-3">{o.email}</td>
                <td className="px-4 py-3">{o.items}</td>
                <td className="px-4 py-3 font-mono">{formatPrice(o.totalCents, o.currency)}</td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={o.status} />
                  {o.statusReason && <p className="mt-1 text-xs text-subtle">{o.statusReason.replace(/_/g, " ")}</p>}
                </td>
                <td className="px-4 py-3 text-right">
                  {o.status === "paid" && (
                    <ActionButton
                      action={refundOrderAction.bind(null, o.id)}
                      label="Refund"
                      variant="danger"
                      confirm={`Refund ${formatPrice(o.totalCents, o.currency)} to ${o.email}? Access from this order will be revoked once the provider confirms.`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
