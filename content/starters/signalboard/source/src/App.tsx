import { CodeTabs } from "./components/CodeTabs";
import { LiveChart } from "./components/LiveChart";
import { Pricing } from "./components/Pricing";
import { WaitlistForm } from "./components/WaitlistForm";

const features = [
  ["Live by default", "Events appear on dashboards within two seconds of being sent. No nightly batch jobs."],
  ["Funnels that explain", "Every drop-off links to the sessions behind it, so you see why people leave, not just where."],
  ["Alerts with context", "Get a Slack message when a metric moves, with the release and segment that moved it."],
  ["Schema guardrails", "Typed event definitions catch broken tracking in CI before it reaches production data."],
  ["Warehouse native", "Stream raw events to Snowflake, BigQuery or Postgres. Your data stays yours."],
  ["Private by design", "EU and US regions, field-level redaction and a 30-second data deletion API."],
];

const faqs = [
  ["How long does setup take?", "Most teams send their first event in under ten minutes with one of our SDKs or the HTTP API."],
  ["Can I import historical data?", "Yes. Upload CSV or Parquet files, or backfill through the API with original timestamps."],
  ["What counts as an event?", "Any call to track(). Page views, identify calls and internal health checks are free."],
  ["Do you offer a self-hosted option?", "The Scale plan includes a single-tenant deployment in your own cloud account."],
];

export default function App() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-edge/70 bg-void/85 backdrop-blur">
        <nav aria-label="Primary" className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="flex items-center gap-2 font-semibold">
            <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
              <path d="M5 20l6-6 5 5 11-11" fill="none" stroke="#c6f36b" strokeWidth="3" />
            </svg>
            Signalboard
          </a>
          <div className="hidden gap-8 font-mono text-xs text-fog md:flex">
            <a href="#features" className="hover:text-snow">Features</a>
            <a href="#developers" className="hover:text-snow">Developers</a>
            <a href="#pricing" className="hover:text-snow">Pricing</a>
            <a href="#faq" className="hover:text-snow">FAQ</a>
          </div>
          <a href="#join" className="rounded-lg border border-edge px-3 py-1.5 font-mono text-xs hover:border-volt hover:text-volt">
            Get access
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="relative overflow-hidden">
          <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-edge px-3 py-1 font-mono text-xs text-fog">
                <span className="size-1.5 rounded-full bg-cyan" aria-hidden /> v3.2 · funnels now update live
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                Product analytics
                <br />
                <span className="text-volt">in real time.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-fog">
                Signalboard turns raw product events into live dashboards, funnels and alerts that your whole team can
                read, without writing SQL.
              </p>
              <div className="mt-8">
                <WaitlistForm id="hero-email" />
                <p className="mt-3 font-mono text-xs text-fog">Free up to 1M events a month. No card required.</p>
              </div>
            </div>
            <LiveChart />
          </div>
        </section>

        <section id="features" className="border-y border-edge bg-panel/40">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <p className="font-mono text-xs uppercase tracking-widest text-volt">Features</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              Everything between an event and a decision.
            </h2>
            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-3">
              {features.map(([title, body], i) => (
                <article key={title} className="bg-void p-6 transition-colors hover:bg-panel">
                  <span className="font-mono text-xs text-fog">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fog">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="developers" className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-volt">Developers</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Five lines to your first chart.</h2>
            <p className="mt-5 leading-relaxed text-fog">
              Typed SDKs for JavaScript, Python, Go and Swift, plus a plain HTTP API. Events are validated against your
              schema and batched automatically.
            </p>
          </div>
          <CodeTabs />
        </section>

        <Pricing />

        <section id="faq" className="border-t border-edge">
          <div className="mx-auto max-w-3xl px-6 py-24">
            <h2 className="text-3xl font-semibold tracking-tight">Questions</h2>
            <div className="mt-8 divide-y divide-edge border-y border-edge">
              {faqs.map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {q}
                    <span aria-hidden className="font-mono text-fog transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-fog">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="join" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="flex flex-col items-start gap-6 rounded-2xl border border-edge bg-panel p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">See your product move.</h2>
              <p className="mt-2 text-fog">Join the beta and get your first dashboard live today.</p>
            </div>
            <WaitlistForm id="footer-email" />
          </div>
        </section>
      </main>

      <footer className="border-t border-edge">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-6 py-8 font-mono text-xs text-fog">
          <span>© {new Date().getFullYear()} Signalboard Labs</span>
          <span>Status: all systems normal</span>
        </div>
      </footer>
    </>
  );
}
