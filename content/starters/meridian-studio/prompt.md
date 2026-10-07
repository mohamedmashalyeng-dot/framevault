# Build "Meridian": an editorial architecture studio website

## Role
You are a senior front-end engineer and art director. Build a complete, production-ready single-page website for a small architecture practice called Meridian.

## Stack
- Vite + React 19 + TypeScript (strict mode)
- Tailwind CSS v4 via the @tailwindcss/vite plugin, with design tokens declared in an @theme block
- No UI libraries, no icon packs, no external fonts or images. Draw all artwork with inline SVG.
- Set `base: "./"` in vite.config.ts so the build runs from any folder.

## Visual direction
- Warm paper background (#f4efe6), near-black ink (#1d1b18), muted ink (#5d574e), one clay accent (#b4532a) and one moss accent (#5f6b4e).
- Typography: a classic serif for display (Iowan Old Style / Palatino / Georgia stack) and a humanist sans for body (Avenir Next / Segoe UI / system-ui).
- Editorial rhythm: very large serif headlines with tight tracking, thin 1px rules, generous whitespace, small uppercase eyebrow labels with wide letter-spacing.
- Calm motion only: a short "rise" fade-in on hero elements, a slow 700ms image scale on hover. Respect prefers-reduced-motion by disabling all animation and smooth scrolling.

## Page structure
1. **Skip link** to the main content, visible on focus.
2. **Sticky header**: serif wordmark, links to Work, Studio, Process, Contact. The header gains a translucent background and bottom border after 8px of scroll. On small screens, a "Menu" button toggles a full-width list of large serif links (aria-expanded, aria-controls).
3. **Hero**: eyebrow "Architecture & landscape · Est. 2011", headline "Buildings that *hold* the light." (the word "hold" italic in the clay colour), a ruled divider, a two-column row with a short studio introduction and two pill buttons ("View selected work" solid, "Start a project" outlined).
4. **Selected work**: heading plus filter chips (All, Residential, Cultural, Workplace) using aria-pressed. A two-column grid where every second card is offset downward on desktop. Each card shows an SVG elevation drawing at 4:3, the project name, year, type and location. Clicking a card opens a native `<dialog>` (showModal) with the drawing, type and year, name, summary and a definition list of facts (location, area, structure, envelope...). Esc and a Close button dismiss it.
   - Store projects in `src/data/projects.ts` with: id, name, location, year, type, area, summary, facts, a three-colour palette and a shape key ("terrace", "vault", "tower", "courtyard").
   - `ProjectArt.tsx` renders a 400x300 SVG: flat ground colour, a sun circle in the accent colour, and simple line elevations that differ by shape key. Give it role="img" and a descriptive aria-label.
5. **Studio**: two columns. Left: heading and a paragraph. Right: an ordered list of three principles, each with a clay "01/02/03" index, serif title and body, separated by thin rules.
6. **Process**: a dark band (ink background, paper text) with four stages (Listen, Sketch, Develop, Build) in a 1/2/4-column grid separated by 1px gaps.
7. **Contact**: intro text and email link on the left; a form on the right with name, email, project type (select) and message. Validate on submit without native browser bubbles (noValidate): name required, email format, message at least 20 characters. Show inline errors linked with aria-describedby and aria-invalid. On success, open a mailto: link to the address from `import.meta.env.VITE_CONTACT_EMAIL` (fallback studio@example.com) with subject and body pre-filled, and show a polite status message.
8. **Footer**: wordmark, address line, copyright with the current year.

## Quality bar
- Fully responsive from 360px to 1440px+; no horizontal scrolling.
- Semantic landmarks (header, nav with aria-label, main, footer), one h1, logical heading order.
- Visible focus rings in the clay colour on every interactive element.
- Lighthouse accessibility and best-practices 100; no console errors.
- Provide `.env.example` documenting VITE_CONTACT_EMAIL, and a README with install, dev, build and deploy steps.

## Deliverable
Output every file of the project with its full path: package.json, vite.config.ts, tsconfig.json, index.html, src/main.tsx, src/App.tsx, src/index.css, src/vite-env.d.ts, src/data/projects.ts and each component in src/components/. Do not omit files or use placeholders like "rest of code here".
