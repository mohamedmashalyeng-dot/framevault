# Bento — soft feature grid section

A responsive "bento box" feature section in a soft pastel style: six tiles of
different sizes, each with a small illustration drawn in pure HTML and CSS
(bar chart, notification toggles, chat thread, metric, avatars, calendar).

**Plain HTML and CSS.** No JavaScript, no framework, no build step, no
external fonts or images.

## Requirements

- Any modern browser (uses CSS Grid and custom properties)
- Node.js 18+ only if you want to use the bundled preview server (optional)

## Preview

Open `index.html` directly in a browser, or serve the folder:

```bash
npm start              # node serve.mjs, open http://localhost:5173
```

## Add it to your site

1. Copy `styles.css` into your project and include it:
   `<link rel="stylesheet" href="styles.css" />`
2. Copy the `<section class="bento">…</section>` block from `index.html`
   into your page.

All selectors are scoped under `.bento`, so the section will not restyle the
rest of your page.

### React / JSX

Paste the section markup into a component and rename `class` to
`className` (and `aria-hidden="true"` stays as is). Import `styles.css` from
the component or your global stylesheet.

## Theming

Change the custom properties on `.bento`:

```css
.bento {
  --bento-bg: #fbf7f1;
  --bento-ink: #2b2633;
  --bento-peach: #ffd9c7;
  --bento-lilac: #e4dcff;
  --bento-mint: #d3f2e3;
  --bento-sky: #d6e9ff;
  --bento-butter: #fff1bf;
  --bento-radius: 28px;
  --bento-gap: 16px;
}
```

Tile sizes use modifier classes: `tile--wide` (4 of 6 columns),
`tile--half` (3), `tile--narrow` (2) and `tile--tall` (two rows). The grid
collapses to two columns under 900px and one column under 560px.

## Accessibility

The section is labelled by its heading, decorative illustrations are hidden
from assistive technology with `aria-hidden="true"`, colours meet WCAG AA
contrast for text, and animations are disabled for `prefers-reduced-motion`.

See `LICENCE.txt` for the terms of use.
