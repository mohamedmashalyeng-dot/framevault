const principles = [
  [
    "Fewer, better materials",
    "We specify a short palette of honest materials and detail them carefully so they weather rather than wear out.",
  ],
  ["Light before form", "Every project starts with a sun study. Rooms are placed by the light they need at the hour they are used."],
  ["Stay involved", "We return to each building after its first year, measure how it performs and share what we learn."],
];

export function Studio() {
  return (
    <section id="studio" className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-14 md:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="font-serif text-4xl tracking-tight md:text-5xl">The studio</h2>
          <p className="mt-6 leading-relaxed text-ink-soft">
            Eleven architects, landscape designers and makers working from a converted print works. We take on a handful
            of projects each year so that every one gets a partner&rsquo;s full attention.
          </p>
        </div>
        <ol className="space-y-10">
          {principles.map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[3rem_1fr] gap-4 border-t border-ink/15 pt-6">
              <span className="font-serif text-xl text-clay">0{i + 1}</span>
              <div>
                <h3 className="font-serif text-2xl">{title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
