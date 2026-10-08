# FRAMEVAULT

A digital product store for website templates, UI components, page sections,
backgrounds and AI prompts. Visitors preview each product live in a sandbox,
buy it, then copy its prompt or download versioned source code.
"FRAMEVAULT" is a placeholder name; change it with `NEXT_PUBLIC_BRAND_NAME`.

**Stack:** Next.js 16 (App Router, Cache Components, React 19), TypeScript,
Tailwind CSS 4, SQLite / libSQL via Drizzle ORM, Better Auth (email +
password), Stripe Checkout (with a clearly labelled simulated provider for
local development), sharp for images, Vitest and Playwright for tests.

---

## Quick start

Requirements: Node.js 20.19+ (tested on 24), npm 10+. Google Chrome is only
needed for the end-to-end tests and the screenshot script.

```bash
npm install
cp .env.example .env        # then fill in the three secrets (see below)
npm run setup               # create the database and seed demo inventory + accounts
npm run dev                 # http://localhost:3000
```

Generate each secret with `openssl rand -base64 48` (or any 32+ character
random string): `BETTER_AUTH_SECRET`, `DOWNLOAD_TOKEN_SECRET`,
`SIMULATED_WEBHOOK_SECRET`. Set `SEED_ADMIN_*` and `SEED_CUSTOMER_*` before
`npm run setup` to choose the seeded accounts' credentials.

Things to try locally:

| Where | What |
| --- | --- |
| `/` and `/catalogue` | Storefront, search, filters, sorting, pagination |
| `/products/meridian-studio` | Live sandboxed preview, deliverables, purchase panel |
| `/products/bento-features` | Free product: copy the prompt and download the ZIP without an account |
| Buy a paid product | Goes to `/checkout/simulated/...` (development only): pay, delay, decline or cancel |
| `/account` | Library, favourites, orders, settings |
| `/admin` | Sign in with the seeded admin account |
| `/admin/products/new` | **Upload a product** on one page: details, poster and screenshots, source code ZIP, live demo ZIP (or the source itself for plain HTML/CSS/JS), AI prompt, publish |
| `/dev/outbox` | Emails (password reset links) when no email provider is configured |

If port 3000 is busy, run on another port and keep the URLs consistent:
`APP_URL=http://localhost:3100 BETTER_AUTH_URL=http://localhost:3100 npx next dev -p 3100`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development, production build, production server (`build` runs migrations first) |
| `npm run setup` | `db:migrate` + `db:seed` |
| `npm run db:migrate` | Apply SQL migrations in `drizzle/` |
| `npm run db:seed` | Seed categories, the six starter products and the seed accounts (idempotent; `-- --reset` recreates the demo inventory) |
| `npm run db:generate` | Generate a migration after changing `src/db/schema.ts` |
| `npm run typecheck` / `lint` | TypeScript and ESLint |
| `npm test` | Unit and integration tests (Vitest, throwaway databases) |
| `npm run test:e2e` | Browser tests against an isolated production build (port 3210, `data/e2e.db`, `storage-e2e/`) |
| `npm run starters:build` | Clean-install and build the starter sources and refresh their demo bundles |
| `npm run starters:media` | Re-capture starter posters and screenshots from the real demos (uses Chrome) |

## Environment

Every variable is documented in [.env.example](.env.example) and validated
at startup in [src/server/env.ts](src/server/env.ts). Production refuses to
start with the simulated payment provider or without Stripe keys, and
refuses live Stripe keys outside production.

## Payments

Prices, currency and product identifiers are always decided on the server.
The browser only names what it wants to buy. Access is granted only when a
**signature-verified webhook** confirms a successful payment whose amount and
currency match the order; visiting the success URL never unlocks anything.
Webhook events are stored by id in the same transaction as their effects, so
duplicates and retries are acknowledged without being applied twice. Orders
move through `pending → paid | failed | cancelled | expired`, and a full
refund moves `paid → refunded` and revokes the entitlements it granted.

### Simulated provider (default for local development)

`PAYMENT_PROVIDER=simulated` replaces the hosted checkout with
`/checkout/simulated/[session]`, labelled as development only. Its buttons
send **signed webhooks over HTTP** to `/api/webhooks/simulated`, the same
pipeline Stripe events use. It is disabled when `APP_ENV=production`.

### Stripe (remaining setup)

The Stripe integration ([src/server/payments/stripe.ts](src/server/payments/stripe.ts))
uses hosted Checkout with server-built `price_data`. It has **not** been run
against a Stripe account yet, because no credentials were available. To enable
it:

1. Create a Stripe account and copy the **test mode** secret key (`sk_test_…`).
2. In `.env`: `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY=sk_test_…`.
3. Local webhooks with the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe \
     --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,charge.refunded
   ```
   Put the printed `whsec_…` value in `STRIPE_WEBHOOK_SECRET` and restart.
4. Buy a product with card `4242 4242 4242 4242`, and test refunds from
   `/admin/orders`.
5. For production, add a Dashboard webhook endpoint for
   `https://<your-domain>/api/webhooks/stripe` with the same five events, and
   use live keys only with `APP_ENV=production`.

**Check provider suitability before going live.** Stripe's availability,
your tax obligations (VAT/GST on digital goods) and invoicing needs depend on
where you and your customers are. A merchant of record such as Paddle or
Lemon Squeezy handles sales tax for you; it can be added by implementing the
`PaymentProvider` interface in [src/server/payments/types.ts](src/server/payments/types.ts).

## Security model

- **Protected deliverables** (prompt text, source archives) are never
  selected by public queries, never rendered into page HTML and never cached
  in shared caches. Prompts are fetched on demand by a Server Action that
  checks access each time.
- **Downloads** use five-minute HMAC-signed links bound to the requesting
  account. The download route re-checks the session and entitlement before
  streaming, so refunds and unpublishing take effect immediately. Archives
  live under `storage/private` with random keys, outside `public/`.
- **Demos** are static files served from `/demo/<random-key>/` with
  `Content-Security-Policy: sandbox …; connect-src 'none'` and loaded in a
  sandboxed `<iframe>`: demo code runs in an opaque origin with no access to
  this site's cookies, storage or APIs. Set `DEMO_ORIGIN` to serve demos from
  a separate hostname in production. Uploaded code is never executed by the
  server.
- **Uploads**: images are decoded and re-encoded by sharp (originals and
  metadata discarded); ZIPs are checked for path traversal, symlinks,
  encryption, entry counts and expanded size; demo bundles accept static file
  types only. Size limits: images 10 MB, archives 50 MB, demos 40 MB.
- **Roles**: `customer` and `admin`. Admin pages return 404 to everyone else,
  and every admin Server Action re-checks the role. Roles are read from the
  database on each request.
- Account, admin, checkout and API routes send `X-Robots-Tag: noindex` and
  are disallowed in `robots.txt`.

## Project structure

```
content/starters/<slug>/   starter products: product.json, prompt.md, source/, demo/, media/
drizzle/                   SQL migrations (0001 adds the FTS5 search index)
scripts/                   migrate, seed, starter build/screenshot, e2e preparation
src/app/(site)/            storefront, account, checkout and admin pages
src/app/api/               auth, signed downloads, Stripe and simulated webhooks
src/app/demo, src/app/media  sandboxed demo files and image renditions
src/server/                data access: access control, orders, payments, ingest, admin
src/db/schema.ts           database schema
tests/unit, tests/e2e      Vitest and Playwright suites
```

## Starter products (demo inventory)

Six original products seeded from `content/starters` and flagged as **Demo
inventory** in the admin:

| Product | Category | Style | Price | Deliverables |
| --- | --- | --- | --- | --- |
| Meridian Architecture Studio | Full Websites | Editorial / light | $49 | Vite + React + TS + Tailwind source, prompt |
| Signalboard SaaS Landing | Landing Pages | Technical / dark | $29 | Vite + React + TS + Tailwind source, prompt |
| Tally Pricing Component | Components | Neo-brutalist | $12 | Web Component source, prompt |
| Bento Feature Grid | Sections | Pastel | Free | HTML/CSS source, prompt |
| Contour Field Background | Backgrounds | Generative / dark | Free | Canvas module source, prompt |
| Terminal Folio Prompt | Landing Pages | Retro / dark | $9 | Prompt only (no source download) |

Prices are demo pricing. Each demo is built from the exact source that is
downloaded: `npm run starters:build` performs a clean `npm install` and
`npm run build` (including a type check) for the Vite starters. Posters and
screenshots are real captures of the demos. Every archive contains the
source, configuration, a README with install/run/build steps, a LICENCE
file, and a `.env.example` where the project reads environment variables.

## Data and hosting notes

- The default database is a local SQLite file. For hosted deployments point
  `DATABASE_URL` at libSQL/Turso (`DATABASE_AUTH_TOKEN`).
- For Hostinger deployment, see [HOSTINGER_DEPLOYMENT.md](HOSTINGER_DEPLOYMENT.md).
- File storage (`src/server/storage.ts`) uses the local disk. Serverless hosts
  need persistent storage: swap that module for an S3-compatible
  implementation with the same functions.
- `npm run build` prerenders public pages from the database, so the database
  must be reachable at build time (`prebuild` applies migrations).
- Public catalogue data is cached with `use cache` and refreshed immediately
  after admin changes via `updateTag`. The price next to every buy button is
  read live.
- Server Actions accept bodies up to 100 MB so admins can upload archives;
  put a reverse-proxy limit in front of the app if you need a tighter cap for
  public endpoints.
