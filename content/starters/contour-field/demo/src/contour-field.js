/**
 * Contour Field — animated topographic contour lines on a <canvas>.
 *
 *   import { createContourField } from "./contour-field.js";
 *   const field = createContourField(canvas, { lineColor: "#e8e4dc" });
 *   field.setOptions({ speed: 0.5 });
 *   field.destroy();
 *
 * Contours are traced with marching squares over 3D simplex noise (x, y,
 * time). The animation runs at a capped frame rate, pauses when the canvas is
 * off screen or the tab is hidden, and renders a single still frame when the
 * visitor prefers reduced motion.
 */

const DEFAULTS = {
  background: "#16171a",
  lineColor: "#e8e4dc",
  accentColor: "#7cf2c4",
  levels: 14, // number of contour thresholds
  accentEvery: 5, // every Nth contour is drawn in the accent colour
  cellSize: 12, // CSS pixels between samples; larger is faster and smoother
  scale: 0.0026, // noise zoom; smaller means broader hills
  speed: 0.35, // animation speed (0 disables animation)
  lineWidth: 1,
  opacity: 0.55,
  maxFps: 30,
  seed: 7,
};

export function createContourField(canvas, options = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError("createContourField expects a <canvas> element");
  const ctx = canvas.getContext("2d");
  let opts = { ...DEFAULTS, ...options };
  let noise = createNoise3D(opts.seed);
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let last = 0;
  let time = 0;
  let visible = true;
  let running = false;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    draw();
  }

  function draw() {
    const { cellSize, scale, levels, lineWidth, opacity, accentEvery } = opts;
    const cols = Math.ceil(width / cellSize) + 1;
    const rows = Math.ceil(height / cellSize) + 1;
    const field = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = x * cellSize * scale;
        const ny = y * cellSize * scale;
        // Two octaves give natural-looking terrain.
        field[y * cols + x] = 0.5 + 0.38 * noise(nx, ny, time) + 0.12 * noise(nx * 2.3, ny * 2.3, time * 1.6);
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.globalAlpha = opacity;

    for (let l = 1; l <= levels; l++) {
      const threshold = l / (levels + 1);
      const accent = accentEvery > 0 && l % accentEvery === 0;
      ctx.strokeStyle = accent ? opts.accentColor : opts.lineColor;
      ctx.lineWidth = accent ? lineWidth * 1.6 : lineWidth;
      ctx.beginPath();
      for (let y = 0; y < rows - 1; y++) {
        for (let x = 0; x < cols - 1; x++) {
          const a = field[y * cols + x];
          const b = field[y * cols + x + 1];
          const c = field[(y + 1) * cols + x + 1];
          const d = field[(y + 1) * cols + x];
          const index = (a > threshold ? 8 : 0) | (b > threshold ? 4 : 0) | (c > threshold ? 2 : 0) | (d > threshold ? 1 : 0);
          if (index === 0 || index === 15) continue;
          const px = x * cellSize;
          const py = y * cellSize;
          const t = (p, q) => (threshold - p) / (q - p || 1e-6);
          const top = [px + cellSize * t(a, b), py];
          const right = [px + cellSize, py + cellSize * t(b, c)];
          const bottom = [px + cellSize * t(d, c), py + cellSize];
          const left = [px, py + cellSize * t(a, d)];
          for (const [p, q] of SEGMENTS[index](top, right, bottom, left)) {
            ctx.moveTo(p[0], p[1]);
            ctx.lineTo(q[0], q[1]);
          }
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    frame = requestAnimationFrame(loop);
    const interval = 1000 / opts.maxFps;
    if (now - last < interval) return;
    const delta = last ? Math.min(now - last, 100) : interval;
    last = now;
    time += (delta / 1000) * opts.speed * 0.12;
    draw();
  }

  function start() {
    if (running || reduceMotion.matches || opts.speed <= 0 || !visible || document.hidden) return;
    running = true;
    last = 0;
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  });
  intersection.observe(canvas);

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVisibility);
  const onMotionChange = () => (reduceMotion.matches ? (stop(), draw()) : start());
  reduceMotion.addEventListener("change", onMotionChange);

  resize();
  start();

  return {
    setOptions(next) {
      const seedChanged = next.seed !== undefined && next.seed !== opts.seed;
      opts = { ...opts, ...next };
      if (seedChanged) noise = createNoise3D(opts.seed);
      draw();
      if (opts.speed <= 0) stop();
      else start();
    },
    getOptions() {
      return { ...opts };
    },
    destroy() {
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", onMotionChange);
    },
  };
}

/* Marching-squares segment table: corner bits are a=8, b=4, c=2, d=1. */
const SEGMENTS = {
  1: (t, r, b, l) => [[l, b]],
  2: (t, r, b) => [[b, r]],
  3: (t, r, b, l) => [[l, r]],
  4: (t, r) => [[t, r]],
  5: (t, r, b, l) => [[l, t], [b, r]],
  6: (t, r, b) => [[t, b]],
  7: (t, r, b, l) => [[l, t]],
  8: (t, r, b, l) => [[l, t]],
  9: (t, r, b) => [[t, b]],
  10: (t, r, b, l) => [[l, b], [t, r]],
  11: (t, r) => [[t, r]],
  12: (t, r, b, l) => [[l, r]],
  13: (t, r, b) => [[b, r]],
  14: (t, r, b, l) => [[l, b]],
};

/* Compact 3D simplex noise (after Stefan Gustavson), returns roughly -1..1. */
function createNoise3D(seed) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256).map((_, i) => i);
  let s = seed * 2654435761 >>> 0 || 1;
  for (let i = 255; i > 0; i--) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const j = (s >>> 0) % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const grad = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
  ];
  const F3 = 1 / 3;
  const G3 = 1 / 6;

  return function noise3D(x, y, z) {
    const s3 = (x + y + z) * F3;
    const i = Math.floor(x + s3);
    const j = Math.floor(y + s3);
    const k = Math.floor(z + s3);
    const t = (i + j + k) * G3;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const z0 = z - (k - t);

    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 1, 0];
      else if (x0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 0, 1];
      else [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 1, 0, 1];
    } else if (y0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 0, 1, 1];
    else if (x0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 0, 1, 1];
    else [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 1, 1, 0];

    const corners = [
      [x0, y0, z0, 0, 0, 0],
      [x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3, i1, j1, k1],
      [x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3, i2, j2, k2],
      [x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3, 1, 1, 1],
    ];

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    let n = 0;
    for (const [cx, cy, cz, di, dj, dk] of corners) {
      let tt = 0.6 - cx * cx - cy * cy - cz * cz;
      if (tt < 0) continue;
      const g = grad[perm[ii + di + perm[jj + dj + perm[kk + dk]]] % 12];
      tt *= tt;
      n += tt * tt * (g[0] * cx + g[1] * cy + g[2] * cz);
    }
    return 32 * n;
  };
}
