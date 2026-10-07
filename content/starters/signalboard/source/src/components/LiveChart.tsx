import { useEffect, useMemo, useState } from "react";

const POINTS = 40;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function initialSeries(): number[] {
  const rand = seeded(42);
  const out: number[] = [];
  let v = 52;
  for (let i = 0; i < POINTS; i++) {
    v = Math.max(18, Math.min(92, v + (rand() - 0.45) * 10));
    out.push(v);
  }
  return out;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A small, self-updating line chart drawn with SVG. Pauses for reduced motion. */
export function LiveChart() {
  const [series, setSeries] = useState(initialSeries);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const rand = seeded(Date.now() % 100000);
    const id = window.setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(18, Math.min(92, last + (rand() - 0.46) * 12));
        return [...prev.slice(1), next];
      });
    }, 1100);
    return () => window.clearInterval(id);
  }, []);

  const { line, area, last } = useMemo(() => {
    const step = 600 / (POINTS - 1);
    const pts = series.map((v, i) => [i * step, 200 - v * 2] as const);
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    return { line: d, area: `${d} L600 200 L0 200 Z`, last: series[series.length - 1] };
  }, [series]);

  const sessions = Math.round(last * 47);

  return (
    <div className="rounded-xl border border-edge bg-panel/80 p-5 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between font-mono text-xs text-fog">
        <span className="flex items-center gap-2">
          <span className="blink inline-block size-2 rounded-full bg-volt" aria-hidden />
          live · active sessions
        </span>
        <span>last 60 min</span>
      </div>
      <p className="mt-3 font-mono text-4xl tracking-tight" aria-live="off">
        {sessions.toLocaleString("en-US")}
      </p>
      <svg viewBox="0 0 600 200" className="mt-4 h-40 w-full" role="img" aria-label="Line chart of active sessions over the last hour">
        <defs>
          <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#c6f36b" stopOpacity="0.28" />
            <stop offset="1" stopColor="#c6f36b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[50, 100, 150].map((y) => (
          <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#232a33" strokeDasharray="3 6" />
        ))}
        <path d={area} fill="url(#fill)" />
        <path d={line} fill="none" stroke="#c6f36b" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-xs">
        {[
          ["p95 latency", "182 ms"],
          ["error rate", "0.21%"],
          ["events/s", "3.4k"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-edge px-3 py-2">
            <p className="text-fog">{k}</p>
            <p className="mt-1 text-snow">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
