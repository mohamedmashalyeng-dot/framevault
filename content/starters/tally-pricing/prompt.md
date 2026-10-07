# Build "Tally": a neo-brutalist pricing table Web Component

## Goal
Create `<tally-pricing>`, a framework-agnostic custom element written in plain JavaScript (ES module, no dependencies, no build step) that renders a bold neo-brutalist pricing table with a monthly/yearly switch.

## API
- Plans come from a child `<script type="application/json">` containing an array of objects:
  `{ id, name, description, monthly, features[], featured?, badge?, cta? }`. Also support setting `element.plans = [...]`.
- Observed attributes: `billing` ("monthly" | "yearly", default monthly), `currency` (default "USD"), `locale` (default "en-US"), `yearly-discount` (percent, default 20, clamp 0–90).
- Prices: show monthly price; when yearly, apply the discount and show "{total} billed yearly" under the price. A price of 0 renders "Free" with no "/mo" suffix. Format with Intl.NumberFormat (no decimals for whole amounts).
- Events (bubbling, composed): `plan-select` with `{ id, name, billing, price }` when a plan button is clicked, and `billing-change` with `{ billing }` when the switch toggles.
- Expose `::part(grid)`, `::part(card)`, `::part(cta)` and `::part(save)`.

## Structure and styling (Shadow DOM, styles inside a `<template>`)
- Theme via custom properties on :host: --tp-ink #111, --tp-paper #fffdf5, --tp-accent #ffd23f (yellow), --tp-accent-2 #ff6b9a (pink), --tp-accent-3 #5ab8ff (blue), --tp-radius 14px, --tp-shadow 6px 6px 0 ink.
- Heavy display type ("Archivo" / "Arial Black" stack), uppercase titles, system sans for body copy.
- Top bar: "Monthly" label, a pill switch (button role="switch", aria-checked, aria-labelledby both labels) with a sliding black knob that turns the track yellow when yearly, "Yearly" label, and a pink "Save 20%" pill.
- Responsive grid: `repeat(auto-fit, minmax(240px, 1fr))`, 28px gap.
- Card: paper background, 3px ink border, offset hard shadow, lifts 2px on hover with a larger shadow. Featured card has the yellow background. Optional blue badge pill above the title.
- Feature list items get a check mark inside a small bordered square.
- CTA button: ink background, paper text, uppercase, 4px pink offset shadow (paper shadow on the featured card), pressed state translates into its shadow.
- Visible blue focus outlines; disable transitions under prefers-reduced-motion.

## Implementation notes
- Use a private field for plans; parse JSON in connectedCallback with a console error and empty fallback on invalid JSON.
- Re-render on attribute changes when connected. Build DOM with createElement/textContent (never innerHTML with plan data) so content is XSS-safe.
- Guard `customElements.define` against double registration and export the class.

## Demo page (index.html)
- Dotted paper background, centred header with a blue "Pricing" pill, a huge uppercase headline "Simple plans. Loud value." and a short paragraph.
- Three plans: Solo (free), Studio ($24, featured, badge "Most popular"), Agency ($79).
- A dashed "event log" box with role="status" that prints plan-select and billing-change events.

## Also provide
- `serve.mjs`: a zero-dependency Node static server (default port 5173, prevents path traversal) and package.json with `"start": "node serve.mjs"`.
- README: usage snippet, plan field table, attributes, events, theming variables, parts, accessibility notes.

Output every file in full with its path.
