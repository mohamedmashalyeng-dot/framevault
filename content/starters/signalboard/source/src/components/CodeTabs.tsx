import { useRef, useState, type KeyboardEvent } from "react";

const samples = {
  JavaScript: `import { Signalboard } from "@signalboard/js";

const sb = new Signalboard({ key: process.env.SB_KEY });

sb.track("checkout_completed", {
  plan: "team",
  value: 49,
});`,
  Python: `from signalboard import Client

sb = Client(key=os.environ["SB_KEY"])

sb.track("checkout_completed", {
    "plan": "team",
    "value": 49,
})`,
  cURL: `curl https://api.signalboard.dev/v1/events \\
  -H "Authorization: Bearer $SB_KEY" \\
  -d '{"name":"checkout_completed",
       "props":{"plan":"team","value":49}}'`,
} as const;

type Lang = keyof typeof samples;
const langs = Object.keys(samples) as Lang[];

/** Accessible tabs (arrow keys move between tabs) showing an install snippet. */
export function CodeTabs() {
  const [active, setActive] = useState<Lang>("JavaScript");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + langs.length) % langs.length;
    setActive(langs[next]);
    refs.current[next]?.focus();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-panel">
      <div role="tablist" aria-label="Code samples" className="flex border-b border-edge">
        {langs.map((lang, i) => (
          <button
            key={lang}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`tab-${i}`}
            aria-selected={active === lang}
            aria-controls="code-panel"
            tabIndex={active === lang ? 0 : -1}
            onClick={() => setActive(lang)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`px-4 py-3 font-mono text-xs transition-colors ${
              active === lang ? "border-b-2 border-volt text-snow" : "text-fog hover:text-snow"
            }`}
          >
            {lang}
          </button>
        ))}
      </div>
      <pre
        id="code-panel"
        role="tabpanel"
        aria-labelledby={`tab-${langs.indexOf(active)}`}
        tabIndex={0}
        className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-snow/90"
      >
        <code>{samples[active]}</code>
      </pre>
    </div>
  );
}
