const steps = [
  ["Listen", "Two site visits and a long conversation about how you live or work. No drawings yet."],
  ["Sketch", "Three distinct directions, presented as models and hand drawings, priced at a high level."],
  ["Develop", "One direction refined with engineers, planners and a cost consultant until it is buildable."],
  ["Build", "We stay on site through construction, resolving details and protecting the design intent."],
];

export function Process() {
  return (
    <section id="process" className="bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-serif text-4xl tracking-tight md:text-5xl">How we work</h2>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-sm bg-paper/15 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, body], i) => (
            <li key={title} className="bg-ink p-7">
              <span className="text-xs uppercase tracking-[0.25em] text-paper/50">Stage {i + 1}</span>
              <h3 className="mt-4 font-serif text-2xl">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-paper/70">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
