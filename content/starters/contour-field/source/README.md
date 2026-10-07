# Contour Field — animated topographic background

A slowly drifting topographic map drawn on a `<canvas>`: contour lines are
traced with marching squares over 3D simplex noise, with every Nth line
highlighted in an accent colour. One small ES module, no dependencies.

## Requirements

- Any modern browser with Canvas 2D, `ResizeObserver` and `IntersectionObserver`
- Node.js 18+ only for the bundled preview server (optional)

## Run the demo

```bash
npm start              # node serve.mjs, open http://localhost:5173
```

The demo page has sliders for density, speed and zoom, plus three colour
themes. ES modules need to be served over HTTP (not opened from `file://`).

## Use it

```html
<section class="hero">
  <canvas id="bg" aria-hidden="true"></canvas>
  <h1>Your headline</h1>
</section>

<script type="module">
  import { createContourField } from "./contour-field.js";

  const field = createContourField(document.getElementById("bg"), {
    background: "#16171a",
    lineColor: "#e8e4dc",
    accentColor: "#7cf2c4",
  });

  // later: field.setOptions({ speed: 0.6 }); field.destroy();
</script>
```

Size the canvas with CSS (for example `position: absolute; inset: 0;
width: 100%; height: 100%`). It resizes itself and stays sharp on high-DPI
screens.

### Options

| Option        | Default    | Description                                        |
| ------------- | ---------- | -------------------------------------------------- |
| `background`  | `#16171a`  | Fill colour behind the lines                       |
| `lineColor`   | `#e8e4dc`  | Colour of regular contours                         |
| `accentColor` | `#7cf2c4`  | Colour of every `accentEvery`-th contour           |
| `levels`      | `14`       | Number of contour lines                            |
| `accentEvery` | `5`        | Highlight interval (`0` disables highlights)       |
| `cellSize`    | `12`       | Sampling grid in CSS px (bigger is faster)         |
| `scale`       | `0.0026`   | Noise zoom (smaller gives broader hills)           |
| `speed`       | `0.35`     | Drift speed; `0` renders a still image             |
| `lineWidth`   | `1`        | Stroke width in CSS px                             |
| `opacity`     | `0.55`     | Line opacity                                       |
| `maxFps`      | `30`       | Frame-rate cap                                     |
| `seed`        | `7`        | Changes the terrain                                |

### React

```jsx
useEffect(() => {
  const field = createContourField(canvasRef.current, { speed: 0.4 });
  return () => field.destroy();
}, []);
```

## Performance and accessibility

- Renders at most 30 frames per second and pauses when the canvas is off
  screen or the tab is hidden.
- Draws one still frame when the visitor has `prefers-reduced-motion` set,
  and reacts if that setting changes.
- Device pixel ratio is capped at 2 to keep large screens fast.
- Mark the canvas `aria-hidden="true"`; it is decorative.

## Files

```
src/contour-field.js   the module (copy this into your project)
index.html             demo page with live settings
serve.mjs              tiny static server for local preview
```

See `LICENCE.txt` for the terms of use.
