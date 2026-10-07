# Build "Bento": a soft pastel feature grid section

## Goal
Create a drop-in "bento box" feature section in plain HTML and CSS (no JavaScript, no framework, no external assets). It must be safe to paste into any existing page: scope every selector under `.bento`.

## Visual direction
- Cream background #fbf7f1, plum-ink text #2b2633, muted text #6e6878.
- Pastel tiles: peach #ffd9c7, lilac #e4dcff, mint #d3f2e3, sky #d6e9ff, butter #fff1bf.
- Rounded 28px tiles, 16px gaps, rounded friendly sans ("Nunito" / Segoe UI / system-ui), headings at weight 800 with slight negative tracking.
- All values exposed as custom properties on `.bento` (--bento-bg, --bento-ink, --bento-muted, the five pastel colours, --bento-radius, --bento-gap).

## Layout
- Section padding `clamp(56px, 8vw, 112px) 20px`; inner container max-width 1120px.
- Header (max 640px): uppercase eyebrow "Why teams switch", headline "Everything your team needs, nothing it doesn't." (clamp 32–52px) and a lede paragraph.
- Six-column CSS grid with `grid-auto-rows: minmax(210px, auto)` and modifier classes: `tile--wide` (span 4), `tile--narrow` (span 2), `tile--half` (span 3), `tile--tall` (row span 2).
- Below 900px: two columns (wide and half span 2, narrow span 1, tall resets). Below 560px: one column.
- Tiles are flex columns with the text block at the top and an illustration at the bottom; they lift 4px on hover with a springy easing.

## The six tiles, each with a CSS-only illustration (aria-hidden="true")
1. Wide, peach — "Progress you can see": a white card with seven rounded bars in alternating coral (#ff9f7f) and violet (#b8a6ff) at different heights that grow from the bottom on load with staggered delays.
2. Narrow + tall, lilac — "Quiet notifications": a white card with four rows (Mentions, Due today, New comments, Weekly digest), each with a pill toggle; three are on (green #4cc38a, knob right) and one off.
3. Narrow, mint — "Threads, not noise": two chat bubbles, one white, one dark aligned right.
4. Narrow, butter — "Faster weeks": a huge metric "−63%".
5. Half, sky — "Invite clients safely": overlapping circular avatars with initials and a "+4" chip, bordered in the tile colour.
6. Half, peach — "A calendar that plans with you": a 7-column mini calendar with weekday initials, busy days in peach and today in dark ink.

## Accessibility and motion
- `<section class="bento" aria-labelledby="bento-title">` with an h2; each tile is an `<article>` with an h3.
- Text contrast meets WCAG AA on every pastel.
- Under prefers-reduced-motion: no hover lift and no bar animation.
- Visible focus outline for any links or buttons added inside.

## Deliverables
- `styles.css` with all section styles, `index.html` demo page containing only the section (with a comment telling users what to copy), README with install/usage/theming/React notes, and a zero-dependency `serve.mjs` preview server with package.json `"start": "node serve.mjs"`.

Output every file in full with its path.
