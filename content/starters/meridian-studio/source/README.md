# Meridian — architecture studio website

A calm, editorial single-page website for an architecture or design practice:
hero, filterable project index with detail dialogs, studio principles, a
four-stage process band and a validated contact form.

Built with **Vite 8, React 19, TypeScript and Tailwind CSS 4**. No other
runtime dependencies, no external fonts or images: the project artwork is
drawn with inline SVG so the site works offline.

## Requirements

- Node.js 20.19+ or 22.12+ (Vite 8 requirement)
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
npm run preview        # serves dist/ locally to check the build
```

`dist/` is plain static HTML, CSS and JS. Upload it to any static host
(Netlify, Vercel, Cloudflare Pages, S3, nginx). `vite.config.ts` sets
`base: "./"` so the build also works from a sub-folder.

## Configuration

| Variable             | Required | Purpose                                                              |
| -------------------- | -------- | -------------------------------------------------------------------- |
| `VITE_CONTACT_EMAIL` | No       | Address the contact form opens in the visitor's mail app. Defaults to `studio@example.com`. |

Variables prefixed with `VITE_` are embedded in the client build, so never
put secrets in them.

## Project structure

```
src/
  App.tsx                 page composition
  index.css               Tailwind import, colour and font tokens (@theme)
  data/projects.ts        project content: edit this to add your own work
  components/
    Header.tsx            sticky header with mobile menu
    Hero.tsx              headline and calls to action
    Work.tsx              filter chips, project grid, <dialog> detail view
    ProjectArt.tsx        SVG elevation drawings used instead of photos
    Studio.tsx            principles list
    Process.tsx           four-stage process band
    Contact.tsx           validated enquiry form (mailto)
```

## Customising

- **Colours and fonts:** edit the `@theme` block in `src/index.css`
  (`--color-paper`, `--color-ink`, `--color-clay`, `--font-serif`, ...).
- **Projects:** edit `src/data/projects.ts`. To use photography, replace
  `<ProjectArt>` in `Work.tsx` with an `<img>` and add `image` to each project.
- **Contact form:** it opens a pre-filled email. To post to a form service
  instead, replace the `mailto:` redirect in `Contact.tsx` with a `fetch`.

## Accessibility notes

Skip link, visible focus rings, labelled form controls with inline error
messages, a native `<dialog>` for project details (Esc closes it) and
`prefers-reduced-motion` support are built in.

See `LICENCE.txt` for the terms of use.
