# Tally — neo-brutalist pricing component

A pricing table with a monthly/yearly switch, built as a framework-agnostic
**Web Component** (`<tally-pricing>`). Plain JavaScript, Shadow DOM styles, no
dependencies and no build step. It works in React, Vue, Svelte, Astro, plain
HTML or any CMS that lets you add a script tag.

## Requirements

- Any evergreen browser (Chrome, Edge, Firefox, Safari 15.4+)
- Node.js 18+ only for the bundled local preview server (optional)

## Run the demo

ES modules are not loaded from `file://` URLs, so serve the folder over HTTP:

```bash
npm start              # runs node serve.mjs, open http://localhost:5173
```

No `npm install` is needed: the server uses only Node's standard library.
Any static server works too, for example `python3 -m http.server 5173`.

## Use it in your project

1. Copy `src/tally-pricing.js` into your project.
2. Load it once and describe your plans:

```html
<script type="module" src="/tally-pricing.js"></script>

<tally-pricing currency="EUR" locale="de-DE" billing="yearly" yearly-discount="15">
  <script type="application/json">
    [
      { "id": "free", "name": "Free", "monthly": 0, "features": ["1 project"] },
      { "id": "pro", "name": "Pro", "monthly": 19, "featured": true, "badge": "Popular",
        "features": ["Unlimited projects", "Custom domain"], "cta": "Go Pro" }
    ]
  </script>
</tally-pricing>
```

### Plan fields

| Field         | Type       | Notes                                   |
| ------------- | ---------- | --------------------------------------- |
| `id`          | string     | Returned in the `plan-select` event      |
| `name`        | string     | Card title                              |
| `description` | string     | One-line summary                        |
| `monthly`     | number     | Monthly price; `0` renders as "Free"    |
| `features`    | string[]   | Bullet list                             |
| `featured`    | boolean    | Highlights the card                     |
| `badge`       | string     | Small label above the title             |
| `cta`         | string     | Button text (default "Choose {name}")   |

### Attributes

`currency` (default `USD`), `locale` (default `en-US`), `billing`
(`monthly` or `yearly`) and `yearly-discount` (percentage, default `20`).
You can also set `element.plans = [...]` from JavaScript.

### Events

```js
document.querySelector("tally-pricing").addEventListener("plan-select", (event) => {
  const { id, name, billing, price } = event.detail;
  // e.g. start your checkout here
});
```

`billing-change` fires with `{ billing }` when the switch is toggled.

### Theming

Override the CSS custom properties on the element:

```css
tally-pricing {
  --tp-accent: #b8f35a;     /* featured card and active switch */
  --tp-accent-2: #ff6b9a;   /* button shadow, savings badge */
  --tp-accent-3: #5ab8ff;   /* badges and focus ring */
  --tp-radius: 8px;
}
```

Use `::part(card)`, `::part(cta)`, `::part(grid)` and `::part(save)` for
deeper styling.

## Accessibility

The billing toggle is a real `<button role="switch">` with `aria-checked`,
buttons are keyboard-operable with visible focus rings, and transitions are
disabled for `prefers-reduced-motion`.

## Files

```
src/tally-pricing.js   the component (the only file you need)
index.html             demo page with an event log
serve.mjs              tiny static server for local preview
```

See `LICENCE.txt` for the terms of use.
