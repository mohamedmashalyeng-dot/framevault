import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/ActionButton";
import { formatDate } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { setUserRoleAction } from "@/server/actions/admin";
import { listCustomers } from "@/server/admin/people";
import { getStoreSettings } from "@/server/settings";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
      <Suspense fallback={<div className="mt-8 h-96 rounded-2xl skeleton" />}>
        <Customers searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Customers({ searchParams }: Pick<PageProps<"/admin/customers">, "searchParams">) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const [people, settings] = await Promise.all([listCustomers(q), getStoreSettings()]);

  return (
    <>
      <Form action="/admin/customers" className="mt-6 flex flex-wrap items-center gap-2">
        <label htmlFor="customers-q" className="sr-only">
          Search customers
        </label>
        <input id="customers-q" name="q" defaultValue={q} placeholder="Name or email" className="field h-10 max-w-xs" />
        <button type="submit" className="btn btn-secondary btn-sm">
          Search
        </button>
      </Form>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-normal">Account</th>
              <th scope="col" className="px-4 py-3 font-normal">Joined</th>
              <th scope="col" className="px-4 py-3 font-normal">Paid orders</th>
              <th scope="col" className="px-4 py-3 font-normal">Library</th>
              <th scope="col" className="px-4 py-3 font-normal">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {people.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p>{p.name}</p>
                  <p className="text-xs text-muted">{p.email}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{formatDate(p.createdAt)}</td>
                <td className="px-4 py-3">
                  {p.paidOrders}
                  {p.spentCents > 0 && <span className="ml-1 text-xs text-muted">({formatPrice(p.spentCents, settings.currency)})</span>}
                </td>
                <td className="px-4 py-3">{p.activeEntitlements} items</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`chip ${p.role === "admin" ? "border-mint/40 text-mint" : ""}`}>{p.role}</span>
                    {p.id !== admin.id &&
                      (p.role === "admin" ? (
                        <ActionButton
                          action={setUserRoleAction.bind(null, p.id, "customer")}
                          label="Remove admin"
                          variant="ghost"
                          confirm={`Remove administrator access from ${p.email}?`}
                        />
                      ) : (
                        <ActionButton
                          action={setUserRoleAction.bind(null, p.id, "admin")}
                          label="Make admin"
                          variant="ghost"
                          confirm={`Give ${p.email} full administrator access?`}
                        />
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
