# AllFantasy — Staging Deployment Runbook

> **Purpose:** Validate every production-bound change in a real cloud environment before it reaches `www.allfantasy.ai`. Staging uses the same Vercel/Neon/Upstash stack as production with isolated resources.

---

## Architecture overview

| Layer | Production | Staging |
|---|---|---|
| Hosting | Vercel (`main` → Production) | Vercel Preview (feature branch → Preview) |
| Database | Neon production branch | Neon staging branch (forked from prod schema) |
| Redis | Upstash production | Upstash separate database (or same with key prefix) |
| Auth | `NEXTAUTH_URL=https://www.allfantasy.ai` | `NEXTAUTH_URL=https://<preview>.vercel.app` |
| Error tracking | Sentry production project | Sentry staging environment |
| Domain | `www.allfantasy.ai` | `allfantasy-v2-<hash>.vercel.app` |

---

## 1. One-time staging setup

### 1a. Create a Neon staging branch

```bash
# Using Neon CLI (install: npm i -g neonctl)
neonctl branches create --name staging --project-id <your-project-id>

# Get the connection strings:
neonctl connection-string staging --project-id <your-project-id> --role-name neondb_owner --database-name neondb --pooled
# → STAGING_DATABASE_URL (pooled, for app runtime)

neonctl connection-string staging --project-id <your-project-id> --role-name neondb_owner --database-name neondb
# → STAGING_DIRECT_URL (non-pooled, for Prisma Migrate)
```

Or from the Neon dashboard: **Project → Branches → Create Branch → from main**.

### 1b. Create Upstash staging database

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new Redis database named `allfantasy-staging`
3. Copy **REST URL** and **REST Token**

### 1c. Set Vercel Preview environment variables

```bash
# Install Vercel CLI if needed:
npm i -g vercel

# Log in:
vercel login

# Set vars scoped to Preview (not Production):
vercel env add DATABASE_URL          preview
# paste the POOLED staging Neon URL

vercel env add DIRECT_URL            preview
# paste the NON-POOLED staging Neon URL

vercel env add NEXTAUTH_SECRET       preview
# generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

vercel env add NEXTAUTH_URL          preview
# set AFTER the first preview deploy to the actual preview URL
# tip: use a stable alias or set it to a wildcard — see step 2b

vercel env add UPSTASH_REDIS_REST_URL   preview
vercel env add UPSTASH_REDIS_REST_TOKEN preview
```

> **Tip:** The Vercel Preview URL changes with each deployment. Use a stable preview alias:
> `vercel alias set <deployment-url> staging.allfantasy.ai` (requires a domain under your Vercel account).
> Then set `NEXTAUTH_URL=https://staging.allfantasy.ai` permanently.

---

## 2. Per-PR staging deploy flow

### 2a. Push branch and trigger preview

```bash
git push origin feat/your-branch --set-upstream
```

Vercel auto-deploys any pushed branch as a Preview. Find the URL in:
- GitHub PR → **Checks → Vercel Preview** → "Visit Preview"
- Vercel Dashboard → **Deployments** → filter by branch

### 2b. Update NEXTAUTH_URL (first deploy only)

Once the preview URL is known, update the env var:

```bash
vercel env rm NEXTAUTH_URL preview
vercel env add NEXTAUTH_URL preview
# enter: https://allfantasy-v2-<hash>.vercel.app
```

> Skip this step if you set up a stable alias in 1c.

### 2c. Run Prisma migrations

```bash
# Non-interactive Prisma migrate against staging DB
DIRECT_URL="<your-staging-direct-url>" \
DATABASE_URL="<your-staging-pooled-url>" \
  npx prisma migrate deploy
```

Or via the npm script wrapper:

```powershell
$env:STAGING_DATABASE_URL = "postgresql://user:pw@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
$env:BASE_URL = "https://allfantasy-v2-<hash>.vercel.app"
powershell -ExecutionPolicy Bypass -File scripts/staging-deploy.ps1 -SkipMigrate
```

### 2d. Run automated smoke validation

```bash
BASE_URL=https://allfantasy-v2-<hash>.vercel.app node scripts/staging-validate.mjs
```

Expected output (all green):

```
── Health endpoint ─────────────────────────────────────
  ✅  /api/health HTTP 200 (243ms)
  ✅  /api/health ok:true (0ms)
  ✅  /api/health timestamp present (0ms)
  ✅  /api/health database.configured:true (0ms)
  ✅  /api/health database.connected:true (0ms)
  ✅  /api/health env.valid:true (0ms)
  ✅  /api/health env.features present (0ms)  — redis:true, redisFull:true, ...

── Core pages ──────────────────────────────────────────
  ✅  GET / (home, no 5xx) (341ms)
  ✅  GET /auth/signin (no 5xx) (189ms)
  ...

── Summary ─────────────────────────────────────────────
  ✅  All checks passed.
```

If any check fails, see [§ 5 Troubleshooting](#5-troubleshooting).

---

## 3. Manual verification checklist

Run after automated validation passes.

### 3a. Health endpoint deep check

```bash
curl -s https://<preview-url>/api/health | jq .
```

Confirm:
- `ok: true`
- `database.connected: true`
- `env.valid: true`
- `env.features.redis: true` (if Redis vars set)

### 3b. Draft room — SSE live sync

1. Open staging URL in two browser tabs (or DevTools device emulation for mobile)
2. Sign in as a test user
3. Navigate to a draft room
4. Open DevTools → Network → filter by `stream`
5. Confirm:
   - SSE connection establishes (status `200`, type `eventsource`)
   - Events appear in the EventStream panel when picks are made
   - Second tab updates within ~1 second of a pick in the first tab

### 3c. Reconnect handling

1. In DevTools → Network → throttle to "Slow 3G"
2. Make a pick
3. Disable network for 5 seconds, re-enable
4. Confirm the client reconnects and shows the correct draft state (no phantom picks, no missed picks)

### 3d. Mobile viewport

1. DevTools → Toggle device toolbar → iPhone 14 (390×844)
2. Navigate to the draft room
3. Verify:
   - Player pool is scrollable
   - Pick button is tappable (not hidden behind keyboard)
   - Timer visible

### 3e. Optimistic UI in production build

> Vercel Preview builds run `next build` (production mode) — optimistic UI should behave identically to `www.allfantasy.ai`.

1. Submit a pick
2. Verify the pick appears in the roster immediately (before server confirmation)
3. Verify no double-entry on server confirm

---

## 4. Load test against staging

Run k6 after manual checks pass. Requires a seeded league with an active draft.

### Seed a test league (one-time per staging DB)

```bash
# Set staging DB URL, then run seed
DIRECT_URL="<staging-direct-url>" \
DATABASE_URL="<staging-pooled-url>" \
  npm run seed
```

Or use the draft-specific seeder:

```bash
DIRECT_URL="<staging-direct-url>" \
DATABASE_URL="<staging-pooled-url>" \
  npx tsx scripts/seed-test-adp-drafts.ts
```

Note the `leagueId` and `draftId` from the seed output.

### Run k6

```bash
k6 run \
  --env BASE_URL=https://allfantasy-v2-<hash>.vercel.app \
  --env LEAGUE_ID=<staging-league-id> \
  --env DRAFT_ID=<staging-draft-id> \
  --env SESSION_COOKIE=<nextauth-session-token-for-test-user> \
  scripts/load-test/draft-pick.k6.js
```

Run a single scenario to isolate issues:

```bash
# Pick storm only (50 concurrent VUs, 30s)
k6 run --env SCENARIO=pick_storm \
  --env BASE_URL=https://allfantasy-v2-<hash>.vercel.app \
  --env LEAGUE_ID=<id> \
  --env SESSION_COOKIE=<token> \
  scripts/load-test/draft-pick.k6.js

# SSE reconnect storm only
k6 run --env SCENARIO=reconnect_storm \
  --env BASE_URL=https://allfantasy-v2-<hash>.vercel.app \
  --env DRAFT_ID=<id> \
  scripts/load-test/draft-pick.k6.js
```

### Acceptance thresholds

| Metric | Threshold | Notes |
|---|---|---|
| `http_req_duration` p95 | < 1500ms | All routes |
| `pick_duration_ms` p95 | < 800ms | Pick submission specifically |
| `poll_duration_ms` p95 | < 500ms | live-sync polling |
| `http_req_failed` | < 5% | Non-2xx or timeout |
| `pick_error_rate` | < 5% | Server errors on pick route |
| `reconnect_error_rate` | < 10% | SSE stream 5xx |

k6 exits with code 1 if any threshold is breached (these are enforced in the script options).

### Capturing metrics

```bash
# Write summary JSON for archiving
k6 run ... --summary-export staging-k6-<date>.json scripts/load-test/draft-pick.k6.js

# Stream to Grafana Cloud (if configured)
k6 run ... -o cloud scripts/load-test/draft-pick.k6.js
```

---

## 5. Troubleshooting

### `database.connected: false` in health response

1. Check that `DATABASE_URL` points to the staging Neon branch (not production)
2. Confirm the Neon branch is active (branches auto-pause after inactivity — click "Resume")
3. Check Vercel function logs: `vercel logs --token $VERCEL_TOKEN`

### `env.valid: false` / `errorCount > 0`

Run with `VERBOSE=1` to see full health payload:

```bash
VERBOSE=1 BASE_URL=https://<preview-url> node scripts/staging-validate.mjs
```

The error count tells you how many required vars are missing. Add them via:
```bash
vercel env add <VAR_NAME> preview
```
Then redeploy: `vercel --prod=false`

### SSE stream returns 401

The test user's session cookie is from production NextAuth. In staging:
1. Sign in directly on the staging preview URL (different `NEXTAUTH_URL`)
2. Extract the new `next-auth.session-token` cookie from DevTools
3. Pass it to k6 via `SESSION_COOKIE`

### Prisma migrate fails

```
Error: P1001 Can't reach database server
```

- Check `DIRECT_URL` is the **non-pooled** Neon URL (no `?pgbouncer=true`)
- Check the Neon staging branch is not paused
- Confirm sslmode: `...neondb?sslmode=require`

### Vercel Preview build fails

```bash
# Tail build logs
vercel logs <deployment-id> --token $VERCEL_TOKEN

# Or via Vercel dashboard: Deployments → <failed> → Build Output
```

Common causes:
- Missing env var that is required at build time (`NEXT_PUBLIC_SENTRY_DSN` etc.)
- TypeScript errors (run `npm run typecheck` locally first)
- Prisma generate failing — check `postinstall` script logs

---

## 6. Promoting staging → production

After all staging checks pass:

```bash
# 1. Merge PR to main
git checkout main && git merge feat/your-branch

# 2. Vercel auto-deploys main → Production
# Monitor: https://vercel.com/dashboard (or `vercel ls`)

# 3. Run production validation immediately after deploy
BASE_URL=https://www.allfantasy.ai node scripts/staging-validate.mjs

# 4. Check Sentry for error spikes (first 10 min)
# Sentry: Alerts → Performance → check for new issues

# 5. If anything fails: instant rollback via Vercel Dashboard
# Dashboard → Deployments → previous READY deploy → "Promote to Production"
```

See [deployment.md](./deployment.md) for the full production checklist and rollback procedure.

---

## 7. npm scripts reference

| Command | What it does |
|---|---|
| `node scripts/staging-validate.mjs` | HTTP smoke suite (requires `BASE_URL`) |
| `npm run secret-scan` | Static secret exposure audit (exits 1 on findings) |
| `npm run secret-scan:warn` | Same but exits 0 (CI-safe) |
| `npm run load-test:draft` | k6 all scenarios (requires `BASE_URL`, `LEAGUE_ID`, etc.) |
| `npm run gate:draft:full` | TypeScript + Vitest + optional smoke (pre-deploy gate) |
| `npm run db:verify` | Prisma validate + migrate status |
| `powershell -File scripts/staging-deploy.ps1` | Full staging deploy runbook (push → wait → migrate → validate) |
| `powershell -File scripts/staging-deploy.ps1 -ValidateOnly` | Validate only against `BASE_URL` |
| `powershell -File scripts/staging-deploy.ps1 -SkipMigrate` | Push + validate, skip migrate |
