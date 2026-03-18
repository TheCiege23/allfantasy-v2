# PROMPT 330 — Production Deployment Plan

## Objective

Prepare the app for **real users**: environment variables, production build, domain, SSL, and monitoring.

---

## 1. Environment Variables

### Required (core)

| Variable | Description | Example / notes |
|----------|-------------|------------------|
| `NODE_ENV` | Set to `production` in production | `production` |
| `DATABASE_URL` | PostgreSQL connection string (Prisma) | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `DIRECT_URL` | Direct DB URL for migrations (Prisma) | Same as `DATABASE_URL` or pooler bypass |
| `NEXTAUTH_SECRET` | Secret for NextAuth session signing | 32+ char random; `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical app URL (scheme + host, no path) | `https://allfantasy.ai` |
| `SESSION_SECRET` | Internal / legacy session crypto | 32+ char random |
| `APP_URL` | Base URL for emails, links (often same as NEXTAUTH_URL) | `https://allfantasy.ai` |

### Required (admin)

| Variable | Description |
|----------|-------------|
| `ADMIN_SESSION_SECRET` or `ADMIN_PASSWORD` | Admin auth; at least one must be set in production (see `lib/adminSession.ts`) |
| `ADMIN_EMAILS` | Comma-separated emails allowed as admin (optional but recommended) |

### Optional but recommended for full features

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY`, `RESEND_FROM` | Transactional email (notifications, auth, feedback) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments, donations, bracket checkout |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (or API key/secret), `TWILIO_PHONE_NUMBER`, `TWILIO_VERIFY_SERVICE_SID` | SMS and phone verification |
| `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` | AI (Chimmy, trade, waiver, etc.); optional base URL override |
| `XAI_API_KEY` or `GROK_API_KEY` | xAI/Grok for some AI features |
| `DEEPSEEK_API_KEY` | DeepSeek provider |
| `REDIS_URL` or `REDIS_HOST` + `REDIS_PORT` | Background jobs (BullMQ): notifications, AI, simulations |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_MAILTO` | Web push notifications |
| `LEAGUE_AUTH_ENCRYPTION_KEY` | Encrypted league credentials (32+ chars) |

### Optional (integrations)

- Yahoo: `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`, `YAHOO_REDIRECT_URI` (set to production callback URL).
- Cron / internal: `LEAGUE_CRON_SECRET`, `BRACKET_ADMIN_SECRET`, `BRACKET_CRON_SECRET`, `SESSION_SECRET` (for internal APIs).
- Early access: `EARLY_ACCESS_CONFIRM_SECRET`, `EARLY_ACCESS_SYNC_SECRET`, `EARLY_ACCESS_SYNC_ALLOWED_ORIGINS`.
- Analytics / Meta: `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `META_CONVERSIONS_API_TOKEN`, etc.
- Sports/data: `CLEARSPORTS_*`, `NEWS_API_KEY`, `CFBD_KEY`, `THESPORTSDB_*`, etc.

**Reference:** `.env.example` lists all variables; add any missing in deployment (e.g. VAPID) from this plan. Never commit real secrets; use the platform’s secret store (Vercel, etc.).

---

## 2. Production Build

### Commands

```bash
# Install dependencies
npm ci

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Build Next.js (already runs prisma generate via package.json "build")
npm run build

# Start production server
npm start
```

- **Build script** (package.json): `prisma generate && next build`.
- **Start:** `next start` (Node server). For serverless (e.g. Vercel), the host runs `next build` and serves via their runtime; no long-lived `next start` on a single box.

### Pre-deploy checks

- Run `npm run typecheck` and fix any type errors.
- Run `npm run test` if applicable.
- Ensure `DATABASE_URL` and `NEXTAUTH_URL` are set in the target environment before build (or at least before first request) so Prisma and NextAuth work.

### Worker process (optional)

If using background jobs (Redis + BullMQ):

```bash
npm run worker:simulations
```

Run this as a separate process (same env as API); ensure Redis is reachable.

---

## 3. Domain Setup

### Primary domain

- Point your **production domain** (e.g. `allfantasy.ai`, `www.allfantasy.ai`) to the hosting provider:
  - **Vercel:** Add domain in project → Domains; follow DNS instructions (A/CNAME).
  - **Self-hosted:** Point A or CNAME to the server or load balancer IP/hostname.

### URLs to set in env

- `NEXTAUTH_URL` = `https://<your-domain>` (no trailing slash).
- `APP_URL` = same as `NEXTAUTH_URL` (used in emails and links).
- Callback URLs for OAuth (Yahoo, Google, Apple) must use this domain (e.g. `https://<domain>/api/auth/callback/yahoo`).

### Redirects

- Prefer a single canonical host (e.g. `allfantasy.ai` with redirect from `www`, or vice versa) and use it consistently in `NEXTAUTH_URL` and `APP_URL`.

---

## 4. SSL (HTTPS)

- **Vercel / managed platforms:** HTTPS is automatic; they provision and renew certificates.
- **Self-hosted:** Use a reverse proxy (e.g. Nginx, Caddy) with Let’s Encrypt (e.g. Certbot) or another ACME provider. Terminate TLS at the proxy and forward to the Node process (e.g. `next start` on a local port).
- Ensure all redirects and links use `https://`; NextAuth and cookies should use `secure: true` in production (already handled when `NODE_ENV === 'production'` in auth callbacks).

---

## 5. Monitoring

### Health endpoints

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `GET /api/health` | Liveness: app responding | None; returns `{ ok: true, timestamp, analytics }` |
| `GET /api/admin/system/health` | Full system health (API + DB) | Admin only |

- Use **GET /api/health** for load balancer health checks and simple uptime checks.
- Use **GET /api/admin/system/health** for internal dashboards and alerts (admin auth required).

### Recommended monitoring

1. **Uptime / HTTP checks:** Poll `GET /api/health` every 1–5 minutes; alert on non-200 or timeout.
2. **Error tracking:** Use an error reporting service (e.g. Sentry) with `NODE_ENV=production`; ensure no sensitive data in reported payloads.
3. **Logging:** Send app logs to a central log store (e.g. Vercel Logs, Datadog, Logtail). Avoid logging secrets or full request bodies.
4. **Database:** Monitor DB connections, query latency, and disk; set alerts on connection failures or high latency.
5. **Redis (if used):** Monitor memory and connectivity for BullMQ.
6. **Stripe:** Use Stripe Dashboard and webhook logs to monitor payment and subscription events.
7. **Cron / workers:** If using cron (e.g. bracket sync, AI ADP), monitor success/failure and alert on repeated failures.

### Vercel-specific

- **Vercel Analytics** (optional) for Web Vitals and traffic.
- **Vercel Logs** and **Vercel Monitoring** for serverless function logs and errors.
- Env vars and secrets are set in Project → Settings → Environment Variables; use “Production” for live.

---

## 6. Deployment Checklist (summary)

- [ ] **Env:** All required variables set for production; secrets from secure store.
- [ ] **URLs:** `NEXTAUTH_URL` and `APP_URL` = production HTTPS domain.
- [ ] **Auth:** `NEXTAUTH_SECRET`, `SESSION_SECRET`, admin secret or password set.
- [ ] **DB:** `DATABASE_URL` (and `DIRECT_URL`) point to production DB; migrations deployed.
- [ ] **Build:** `npm run build` (and typecheck) succeeds.
- [ ] **Domain:** DNS points to host; SSL in place (automatic on Vercel).
- [ ] **Health:** Load balancer or uptime tool checks `GET /api/health`.
- [ ] **Monitoring:** Uptime, errors, logs, and (if used) DB/Redis/Stripe/workers monitored.
- [ ] **Workers:** If using queues, worker process running with same env and Redis.
- [ ] **Webhooks:** Stripe (and any other) webhook URLs use production domain; signing secrets set.

---

## 7. Deliverable Summary

- **Environment variables:** Required and optional vars documented; `.env.example` updated with VAPID for push.
- **Production build:** Commands and pre-deploy checks documented.
- **Domain:** Canonical URL and OAuth callback requirements.
- **SSL:** Handled by platform or reverse proxy; app uses HTTPS in production.
- **Monitoring:** Public health endpoint (`/api/health`), admin system health, and recommended uptime, errors, logs, DB, Redis, Stripe, and workers monitoring.

This plan is the **deployment plan** for taking the app to production with real users.
