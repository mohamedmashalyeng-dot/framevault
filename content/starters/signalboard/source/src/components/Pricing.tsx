import { useState } from "react";

const plans = [
  { name: "Starter", monthly: 0, blurb: "For side projects and early prototypes.", features: ["1M events / month", "3 dashboards", "7-day retention"] },
  {
    name: "Team",
    monthly: 49,
    blurb: "For product teams shipping every week.",
    features: ["20M events / month", "Unlimited dashboards", "13-month retention", "Slack alerts"],
    highlight: true,
  },
  { name: "Scale", monthly: 199, blurb: "For high-volume products and data teams.", features: ["250M events / month", "SSO & audit log", "Warehouse sync", "Priority support"] },
];

export function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-volt">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Pay for events, not seats.</h2>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          onClick={() => setYearly((v) => !v)}
          className="flex items-center gap-3 rounded-full border border-edge px-2 py-1.5 font-mono text-xs"
        >
          <span className={yearly ? "text-fog" : "text-snow"}>Monthly</span>
          <span className={`relative h-5 w-9 rounded-full transition-colors ${yearly ? "bg-volt" : "bg-edge"}`}>
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-void transition-transform ${yearly ? "translate-x-4.5" : "translate-x-0.5"}`}
            />
          </span>
          <span className={yearly ? "text-snow" : "text-fog"}>Yearly −20%</span>
        </button>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const price = yearly ? Math.round(plan.monthly * 0.8) : plan.monthly;
          return (
            <article
              key={plan.name}
              className={`flex flex-col rounded-xl border p-6 ${plan.highlight ? "border-volt/60 bg-volt/[0.04]" : "border-edge bg-panel"}`}
            >
              <h3 className="font-mono text-sm text-fog">{plan.name}</h3>
              <p className="mt-4 text-4xl font-semibold tracking-tight">
                ${price}
                <span className="text-base font-normal text-fog">/mo</span>
              </p>
              <p className="mt-2 text-sm text-fog">{plan.blurb}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span aria-hidden className="text-volt">
                      ▸
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#join"
                className={`mt-8 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${
                  plan.highlight ? "bg-volt text-void hover:brightness-110" : "border border-edge hover:border-fog"
                }`}
              >
                {plan.monthly === 0 ? "Start free" : `Choose ${plan.name}`}
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
