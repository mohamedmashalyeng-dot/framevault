import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { DEFAULT_LICENCE_SUMMARY, licenceText } from "@/server/licence";

export const metadata: Metadata = {
  title: "Licence",
  description: `What you can and cannot do with ${BRAND.name} products.`,
  alternates: { canonical: "/licence" },
};

export default function LicencePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 md:py-20">
      <p className="eyebrow">Licence</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Use it in your work. Don&rsquo;t resell it.</h1>
      <p className="mt-5 text-lg text-muted">
        Every source download includes a LICENCE file with these terms. Here they are in plain language first.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {(["standard", "free"] as const).map((kind) => (
          <section key={kind} className="rounded-2xl border border-line bg-graphite-900 p-5">
            <h2 className="font-medium">{kind === "standard" ? "Standard licence (paid)" : "Free licence"}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{DEFAULT_LICENCE_SUMMARY[kind]}</p>
          </section>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-medium">Full standard licence text</h2>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-line bg-graphite-900 p-5 font-mono text-[0.8rem] leading-relaxed text-paper-dim">
          {licenceText({ productTitle: "<product name>", version: "<version>", licenceType: "standard" })}
        </pre>
      </section>
    </div>
  );
}
