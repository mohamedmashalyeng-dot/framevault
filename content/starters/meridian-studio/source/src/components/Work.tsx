import { useEffect, useRef, useState } from "react";
import { projects, projectTypes, type Project } from "../data/projects";
import { ProjectArt } from "./ProjectArt";

export function Work() {
  const [filter, setFilter] = useState<(typeof projectTypes)[number]>("All");
  const [active, setActive] = useState<Project | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (active && !dialog.open) dialog.showModal();
    if (!active && dialog.open) dialog.close();
  }, [active]);

  const visible = filter === "All" ? projects : projects.filter((p) => p.type === filter);

  return (
    <section id="work" className="border-t border-ink/10 bg-paper-deep/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-serif text-4xl tracking-tight md:text-5xl">Selected work</h2>
          <div role="group" aria-label="Filter projects" className="flex flex-wrap gap-2">
            {projectTypes.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={filter === t}
                onClick={() => setFilter(t)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  filter === t ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-12 grid gap-x-8 gap-y-14 md:grid-cols-2">
          {visible.map((p, i) => (
            <li key={p.id} className={i % 2 === 1 ? "md:mt-16" : ""}>
              <button type="button" onClick={() => setActive(p)} className="group block w-full text-left">
                <div className="overflow-hidden rounded-sm">
                  <ProjectArt
                    project={p}
                    className="aspect-[4/3] w-full transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h3 className="font-serif text-2xl">{p.name}</h3>
                  <span className="text-sm text-ink-soft">{p.year}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {p.type} · {p.location}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setActive(null)}
        aria-labelledby="project-title"
        className="m-auto w-[min(92vw,56rem)] rounded-sm bg-paper p-0 text-ink backdrop:bg-ink/60"
      >
        {active && (
          <div className="grid md:grid-cols-2">
            <ProjectArt project={active} className="aspect-[4/3] h-full w-full" />
            <div className="p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
                {active.type} · {active.year}
              </p>
              <h3 id="project-title" className="mt-3 font-serif text-3xl">
                {active.name}
              </h3>
              <p className="mt-4 leading-relaxed text-ink-soft">{active.summary}</p>
              <dl className="mt-6 divide-y divide-ink/10 border-y border-ink/10 text-sm">
                {[["Location", active.location], ["Area", active.area], ...active.facts].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-ink-soft">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="mt-6 rounded-full border border-ink/25 px-5 py-2 text-sm hover:border-ink"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
