# Lesaal Marketing CMS (Next.js)

This project now includes:

- Public landing page rendered from database-driven section configuration
- Secure admin login and protected admin dashboard
- Landing page CMS controls (sections, variants, animations, order, visibility, items)
- Campaign form builder and campaign submission inbox persistence
- Profile security flows (change password, email change with OTP verification)
- Gmail SMTP integration for OTP and campaign notifications
- Prisma + PostgreSQL (Prisma Postgres) persistence

## Run locally

```bash
npm install
npm run prisma:generate
npm run prisma:init
npm run seed:admin
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public landing page and [http://localhost:3000/admin/login](http://localhost:3000/admin/login) for admin.

If you ever see client runtime errors like `__webpack_modules__[moduleId] is not a function` during development, restart dev server to rebuild chunks cleanly:

```bash
pkill -f "next dev" || true
npm run dev
```

## Environment setup

Create `.env` from `.env.example` and configure:

- `DATABASE_URL`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `CSRF_SECRET`
- `TURNSTILE_SECRET_KEY`, `TURNSTILE_SITE_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `NOTIFY_EMAIL`
- `RATE_LIMIT_WINDOW_MINUTES`, `RATE_LIMIT_MAX_LOGIN_IP`, `RATE_LIMIT_MAX_LOGIN_EMAIL`
- `RATE_LIMIT_MAX_PUBLIC_IP`, `RATE_LIMIT_MAX_PUBLIC_CAMPAIGN_IP`, `RATE_LIMIT_MAX_OTP_REQUESTS`

For Gmail SMTP, use a Gmail app password (not your normal account password).

### Vercel deployment note

- Set `DATABASE_URL` to your Prisma Postgres connection string.
- Keep `.env` out of version control.
- Add `DATABASE_URL` in Vercel Project Settings -> Environment Variables for Production/Preview.

## Useful scripts

```bash
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:init
npm run seed:admin
```

## Project structure

- `app/` - Next.js app routes, admin pages, and API handlers
- `components/` - public landing and admin UI components
- `lib/` - auth, prisma, landing config, security, and mail services
- `prisma/` - schema and migrations
- `scripts/seed-admin.mjs` - initial admin bootstrap script
