# Deploying FRAMEVAULT on Hostinger

FRAMEVAULT is a full-stack Next.js app. It needs a Node.js runtime, a database
available during build and runtime, and persistent storage for private archives,
demo bundles, media renditions, and the development email outbox.

## Recommended Hostinger Product

Use one of these:

- **Hostinger VPS**: best fit for this app as-is. The local SQLite/libSQL file
  and `storage/` directory can live on the server disk, and you control PM2,
  Nginx, backups, Stripe CLI testing, and file permissions.
- **Hostinger Business or Cloud Node.js Web App**: works for a managed Node.js
  deploy, especially with a remote libSQL/Turso database. For long-term
  production, avoid keeping important uploads only inside the application
  deployment directory because redeploys can replace app files.

Static hosting is not enough. The app uses Server Components, Server Actions,
auth, payments, webhooks, protected downloads, and route handlers.

## Production Environment Variables

Set these in Hostinger's Node.js app environment settings or on the VPS:

```bash
APP_ENV=production
APP_URL=https://your-domain.com
BETTER_AUTH_URL=https://your-domain.com

DATABASE_URL=file:./data/framevault.db
DATABASE_AUTH_TOKEN=

BETTER_AUTH_SECRET=generate-a-32-plus-character-secret
DOWNLOAD_TOKEN_SECRET=generate-a-different-32-plus-character-secret

STORAGE_DIR=./storage
DEMO_ORIGIN=

STORE_CURRENCY=USD
DEMO_PRICING=false
NEXT_PUBLIC_BRAND_NAME=FRAMEVAULT
NEXT_PUBLIC_SUPPORT_EMAIL=support@your-domain.com

PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_or_sk_test_value
STRIPE_WEBHOOK_SECRET=whsec_value
SIMULATED_WEBHOOK_SECRET=

EMAIL_FROM=FRAMEVAULT <no-reply@your-domain.com>
RESEND_API_KEY=
```

For a test deployment without Stripe, use `APP_ENV=staging` and
`PAYMENT_PROVIDER=simulated`. Do not use simulated payments for production.

Generate secrets with:

```bash
openssl rand -base64 48
```

## Managed Node.js Web App

1. Push this repository to GitHub.
2. In Hostinger hPanel, create a **Node.js Web App** and import the GitHub repo.
3. Select Node.js `24.x` if available, otherwise `22.x` or `20.x`.
   The app requires Node.js `20.19+`; older Node versions will fail.
4. Configure environment variables from the section above.
   Add them as Hostinger environment variables. Do not put
   `--env-file=.env.hostinger` in `NODE_OPTIONS`; Next.js build workers reject
   that flag.
5. Use the default commands:

```bash
npm install
npm run build
npm run start
```

The build script runs database migrations before `next build`.

If Hostinger asks for a port, let the platform provide `PORT`. Next will use it
when `npm run start` runs.

## VPS Deployment

On an Ubuntu VPS:

```bash
git clone https://github.com/mohamedmashalyeng-dot/framevault.git
cd framevault
npm install
cp .env.example .env
nano .env
npm run db:migrate
npm run db:seed
npm run build
npm run start
```

For a real VPS service, run it with PM2 and put Nginx in front of it:

```bash
npm install -g pm2
pm2 start npm --name framevault -- run start
pm2 save
```

Configure Nginx to proxy your domain to the app port, then enable HTTPS.

## First Production Checklist

- Set `APP_URL` and `BETTER_AUTH_URL` to the final HTTPS domain.
- Replace all development secrets.
- Use Stripe webhook endpoint:
  `https://your-domain.com/api/webhooks/stripe`
- Run `npm run db:seed` once if you want the demo inventory and seed accounts.
- Change seed account passwords or remove seed accounts before going live.
- Confirm protected downloads work after a purchase.
- Back up `data/` and `storage/` if using local disk.
