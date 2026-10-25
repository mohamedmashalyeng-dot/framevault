import type { Metadata } from "next";
import { LANGUAGE_COLORS, WORKS, type Work } from "@/config/works";

export const metadata: Metadata = {
  title: "My works",
  description: "Websites and web apps I have built: what each one does, its stack and the languages it is written in.",
  alternates: { canonical: "/my-works" },
};

const colorOf = (language: string) => LANGUAGE_COLORS[language] ?? LANGUAGE_COLORS.Other;

export default function MyWorksPage() {
  const languageCount = new Set(WORKS.flatMap((w) => Object.keys(w.languages)).filter((l) => l !== "Other")).size;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20">
      <p className="eyebrow">My works</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">Websites and systems I have built.</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Company sites, CRMs, ERPs and AI tools, from Arabic right-to-left marketing sites to multi-company SaaS. For each
        project: what it is about, what it does, and the languages it is written in.
      </p>

      <dl className="mt-10 grid max-w-xl grid-cols-2 gap-4">
        <Stat label="Projects" value={WORKS.length} />
        <Stat label="Languages" value={languageCount} />
      </dl>

      <ul className="mt-14 grid gap-5 lg:grid-cols-2">
        {WORKS.map((work) => (
          <li key={work.slug}>
            <WorkCard work={work} />
          </li>
        ))}
      </ul>

      <p className="mt-10 text-xs text-subtle">
        Language shares are the percentage of source code per language in each project, excluding dependencies and build
        output.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-graphite-900 p-5">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-2 text-3xl font-semibold tracking-tight">{value}</dd>
    </div>
  );
}

function WorkCard({ work }: { work: Work }) {
  const languages = Object.entries(work.languages);
  const headingId = `work-${work.slug}`;

  return (
    <article aria-labelledby={headingId} className="flex h-full flex-col rounded-2xl border border-line bg-graphite-900 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{work.kind}</span>
        <span className="text-xs text-subtle">{work.year}</span>
      </div>
      <h2 id={headingId} className="mt-4 text-2xl font-semibold tracking-tight">
        {work.name}
      </h2>
      <p className="mt-3 leading-relaxed text-paper-dim">{work.summary}</p>

      <ul className="mt-5 space-y-2 text-sm text-muted">
        {work.highlights.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-mint" />
            {item}
          </li>
        ))}
      </ul>

      <ul aria-label="Built with" className="mt-5 flex flex-wrap gap-1.5">
        {work.stack.map((tool) => (
          <li key={tool} className="chip">
            {tool}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <h3 className="eyebrow">Languages</h3>
        <div aria-hidden className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
          {languages.map(([language, share]) => (
            <span key={language} style={{ width: `${share}%`, background: colorOf(language) }} />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {languages.map(([language, share]) => (
            <li key={language} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full" style={{ background: colorOf(language) }} />
              <span className="text-paper-dim">{language}</span>
              <span className="font-mono text-xs text-muted">{share.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
