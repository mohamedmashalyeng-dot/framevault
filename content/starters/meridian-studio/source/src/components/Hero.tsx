export function Hero() {
  return (
    <section id="top" className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
      <p className="reveal text-xs uppercase tracking-[0.25em] text-ink-soft">Architecture &amp; landscape · Est. 2011</p>
      <h1 className="reveal mt-6 max-w-4xl font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl lg:text-8xl">
        Buildings that <em className="text-clay">hold</em> the light.
      </h1>
      <div className="reveal mt-12 grid gap-10 border-t border-ink/15 pt-8 md:grid-cols-[1.4fr_1fr]">
        <p className="max-w-xl text-lg leading-relaxed text-ink-soft">
          Meridian is a small practice designing homes, libraries and workplaces that age well. We work slowly, with
          local materials, and we stay with a building long after it opens.
        </p>
        <div className="flex flex-wrap items-end justify-start gap-4 md:justify-end">
          <a href="#work" className="rounded-full bg-ink px-6 py-3 text-sm text-paper transition-colors hover:bg-clay">
            View selected work
          </a>
          <a href="#contact" className="rounded-full border border-ink/25 px-6 py-3 text-sm transition-colors hover:border-ink">
            Start a project
          </a>
        </div>
      </div>
    </section>
  );
}
