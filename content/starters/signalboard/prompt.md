# Build "Signalboard": a dark, technical SaaS landing page

## Role
You are a product designer who codes. Build a complete landing page for Signalboard, a real-time product analytics tool for developers.

## Stack
- Vite + React 19 + TypeScript (strict)
- Tailwind CSS v4 via @tailwindcss/vite with tokens in an @theme block
- No component libraries, no external fonts, no images: use system font stacks and inline SVG.
- `base: "./"` in vite.config.ts.

## Visual direction
- Near-black background #0b0d10, panels #12161b, borders #232a33, muted text #8b96a5, primary text #e8edf3.
- One electric accent: volt lime #c6f36b. Secondary accent cyan #5ad1e6 used sparingly (a single status dot).
- Sans for headings and body (Inter / Segoe UI / system-ui), monospace (JetBrains Mono / Consolas) for labels, numbers, eyebrows and code.
- A faint 48px measurement grid behind the hero, faded out with a radial mask. No glow effects, no gradient blobs.

## Sections
1. **Sticky nav** (blurred translucent background): logo mark (an SVG polyline in volt) + wordmark, mono links (Features, Developers, Pricing, FAQ) hidden on mobile, and a small outlined "Get access" link.
2. **Hero** (two columns on large screens):
   - Left: a pill badge "v3.2 · funnels now update live" with a cyan dot, headline "Product analytics / in real time." (second line in volt), a short paragraph, the waitlist form and a mono footnote "Free up to 1M events a month. No card required."
   - Right: a live chart card. Show a blinking dot, "live · active sessions", a large mono number, and an SVG line + gradient-filled area chart of 40 points that shifts one point every ~1.1s with a seeded random walk clamped to a range. Add dashed horizontal guides and three small stat tiles (p95 latency, error rate, events/s). Stop the animation entirely when prefers-reduced-motion is set.
3. **Features**: eyebrow, headline "Everything between an event and a decision.", and six numbered cards (01–06) in a 1/2/3-column grid separated by 1px borders: Live by default, Funnels that explain, Alerts with context, Schema guardrails, Warehouse native, Private by design. Cards lighten slightly on hover.
4. **Developers**: copy on the left; on the right an accessible tabs component (role="tablist"/"tab"/"tabpanel", aria-selected, roving tabindex, ArrowLeft/ArrowRight to move) showing the same tracking call in JavaScript, Python and cURL.
5. **Pricing**: a `role="switch"` monthly/yearly toggle (yearly = 20% off, rounded) and three plans (Starter $0, Team $49 highlighted with a volt border, Scale $199) with feature lists and CTA links to the closing section.
6. **FAQ**: four native `<details>` items with a "+" that rotates 45° when open.
7. **Closing CTA**: a bordered panel with heading, line of copy and a second instance of the waitlist form.
8. **Footer**: copyright and a status line in mono.

## Waitlist form behaviour (reusable component, used twice with unique ids)
- noValidate; validate the email on submit and show an inline error (aria-invalid, aria-describedby).
- If `import.meta.env.VITE_WAITLIST_ENDPOINT` is set, POST `{ "email": "..." }` as JSON, show "Joining…" while sending, and an error message on failure.
- If not set, run in demo mode: validate and show the success state without any network request.
- Success replaces the form with a polite status message.

## Quality bar
- Responsive 360px–1440px+, keyboard accessible, visible volt focus outlines, one h1, landmarks.
- All animations disabled for reduced motion. No console errors. Type-check passes with `tsc --noEmit`.
- Include `.env.example` and a README (install, dev, build, configuration table, customisation notes).

## Deliverable
Output every file with its full path: package.json, vite.config.ts, tsconfig.json, index.html, src/main.tsx, src/App.tsx, src/index.css, src/vite-env.d.ts and src/components/{LiveChart,WaitlistForm,CodeTabs,Pricing}.tsx. Complete code only, no placeholders.
