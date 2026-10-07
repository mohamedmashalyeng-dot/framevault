# Build "Contour Field": an animated topographic background

## Goal
Write a dependency-free ES module, `src/contour-field.js`, that draws slowly drifting topographic contour lines on a `<canvas>`, plus a demo page with live controls.

## Public API
```js
const field = createContourField(canvas, options);
field.setOptions(partialOptions); // redraws immediately
field.getOptions();
field.destroy();                  // stops animation, disconnects observers and listeners
```
Throw a TypeError if the first argument is not an HTMLCanvasElement.

Options and defaults: background "#16171a", lineColor "#e8e4dc", accentColor "#7cf2c4", levels 14, accentEvery 5, cellSize 12 (CSS px), scale 0.0026, speed 0.35, lineWidth 1, opacity 0.55, maxFps 30, seed 7.

## Algorithm
1. Implement compact seeded 3D simplex noise (Gustavson style: permutation table shuffled with an xorshift PRNG from the seed, 12 gradient vectors, output scaled to roughly -1..1).
2. Every frame, sample a grid of (cols x rows) points spaced `cellSize` apart. Height = 0.5 + 0.38 * noise(x, y, t) + 0.12 * noise(2.3x, 2.3y, 1.6t), with x/y multiplied by `scale`.
3. For each of `levels` thresholds (l / (levels + 1)), run marching squares: compute the 4-bit corner index (a=8, b=4, c=2, d=1), skip 0 and 15, linearly interpolate edge crossings, and add the 1–2 segments from a lookup table to a single path; stroke once per level.
4. Every `accentEvery`-th level uses the accent colour and a 1.6x line width.
5. Fill the background each frame; use `globalAlpha = opacity` for lines.

## Rendering and performance
- Size from `getBoundingClientRect`, device pixel ratio capped at 2, `setTransform(dpr, …)`; observe size changes with ResizeObserver.
- requestAnimationFrame loop capped at `maxFps`; advance time by `delta * speed * 0.12` (clamp delta to 100ms).
- Pause when off screen (IntersectionObserver) or when `document.hidden`; resume on return.
- If `prefers-reduced-motion: reduce` matches (and react to changes), render a single still frame and do not animate. Speed 0 also means a still frame.

## Demo page (index.html)
- Full-viewport hero with the canvas absolutely positioned behind centred copy: a mono accent eyebrow "Contour Field · Canvas 2D", headline "Every surface / tells a story." (clamp 40–84px, tight tracking) and a short paragraph. Mark the canvas aria-hidden.
- A fixed, blurred settings panel (bottom right, max 300px wide) with labelled range inputs for Density (levels 6–24), Speed (0–1.5) and Zoom (scale), each with an `<output>`, and three theme buttons with aria-pressed: Graphite (#16171a / #e8e4dc / #7cf2c4), Paper (#f3efe7 / #2b2925 / #c2502e) and Night (#0b1020 / #7f9cff / #f6c177). Switching theme also updates the page background and headline colour.
- Visible focus outlines in the accent colour.

## Also provide
A zero-dependency `serve.mjs` static server (port 5173, path traversal safe), package.json with `"start": "node serve.mjs"`, and a README with usage, an options table, a React `useEffect` example and performance/accessibility notes.

Output every file in full with its path.
