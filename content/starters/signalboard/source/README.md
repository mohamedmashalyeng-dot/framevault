# Signalboard — SaaS analytics landing page

A dark, technical landing page for a developer-facing SaaS product: live
animated chart in the hero, waitlist form, numbered feature grid, accessible
code-sample tabs, monthly/yearly pricing switch, FAQ and closing call to
action.

Built with **Vite 8, React 19, TypeScript and Tailwind CSS 4**. No other
runtime dependencies and no external requests (system font stacks, inline
SVG), so it loads fast and works offline.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+ (or pnpm / yarn)

## Run it

```bash
npm install
cp .env.example .env   # optional, see "Configuration"
npm run dev            # http://localhost:5173
```

## Build for production

```bash
npm run build          # type-checks, then writes static files to dist/
npm run preview        # serves the production build locally
```

Deploy the `dist/` folder to any static host.

## Configuration

| Variable                 | Required | Purpose |
| ------------------------ | -------- | ------- |
| `VITE_WAITLIST_ENDPOINT` | No       | URL that receives `POST { "email": "..." }` as JSON when someone joins the waitlist (for example a Formspree, Basin or your own API endpoint). When empty, the form runs in demo mode: it validates the address and shows the confirmation without sending anything. |

`VITE_` variables are public and embedded in the build. Do not put secrets in them.

## Project structure

```
src/
  App.tsx                    page layout, feature and FAQ content
  index.css                  Tailwind import, colour tokens, grid background
  components/
    LiveChart.tsx            SVG line chart that updates every second
    WaitlistForm.tsx         validated email form with demo / endpoint modes
    CodeTabs.tsx             ARIA tabs with arrow-key navigation
    Pricing.tsx              plans with a monthly / yearly switch
```

## Customising

- **Brand colours:** `--color-volt` (accent) and `--color-cyan` in `src/index.css`.
- **Copy:** features and FAQs are arrays at the top of `App.tsx`; plans live in `Pricing.tsx`.
- **Chart:** `LiveChart.tsx` generates sample data. Replace the interval with
  your own data source if you want to show real numbers.

## Accessibility notes

Keyboard-operable tabs and pricing switch (`role="switch"`), labelled inputs
with inline errors, native `<details>` for the FAQ, visible focus styles, and
the live chart stops animating when `prefers-reduced-motion` is set.

See `LICENCE.txt` for the terms of use.
