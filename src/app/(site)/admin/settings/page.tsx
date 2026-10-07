import type { Metadata } from "next";
import { Suspense } from "react";
import { AllAccessForm } from "@/components/admin/TaxonomyForms";
import { saveAllAccessAction } from "@/server/actions/admin";
import { getStoreSettings } from "@/server/settings";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Store settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Store settings</h1>
      <Suspense fallback={<div className="mt-8 h-64 rounded-2xl skeleton" />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  await requireAdminPage();
  const settings = await getStoreSettings();
  return (
    <>
      <section className="mt-8 rounded-2xl border border-line p-5">
        <h2 className="font-medium">All-access bundle</h2>
        <p className="mt-1 text-sm text-muted">A one-time purchase that unlocks every product, including future releases.</p>
        <div className="mt-5">
          <AllAccessForm
            action={saveAllAccessAction}
            enabled={settings.allAccess.enabled}
            price={(settings.allAccess.priceCents / 100).toFixed(2)}
            currency={settings.currency}
          />
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-line p-5 text-sm">
        <h2 className="font-medium">Environment settings</h2>
        <p className="mt-1 text-muted">These are set in the server environment (.env) and require a restart to change.</p>
        <dl className="mt-4 divide-y divide-line border-y border-line">
          {[
            ["STORE_CURRENCY", settings.currency],
            ["DEMO_PRICING", settings.demoPricing ? "on (prices labelled as demo pricing)" : "off"],
            ["PAYMENT_PROVIDER", settings.paymentProvider === "simulated" ? "simulated (development only)" : "stripe"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="font-mono text-xs text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
