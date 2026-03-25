# E2E Test Runbook

## Referral Growth DB Lane (Local)

Use this lane to validate the full referral flow against a real database:

- click tracking (`/?ref=...`)
- signup attribution
- reward issuance
- reward redemption

### 1) Point to a disposable Postgres database

Use a local/dev-only database URL. Example:

- `postgresql://postgres:postgres@127.0.0.1:5432/allfantasy_e2e`

### 2) Prepare schema

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/allfantasy_e2e npx prisma db push --skip-generate
```

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/allfantasy_e2e"; npx prisma db push --skip-generate
```

### 3) Run consolidated referral suite

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/allfantasy_e2e PLAYWRIGHT_PORT=3000 npx playwright test e2e/referral-growth-suite.spec.ts --project=chromium
```

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/allfantasy_e2e"; $env:PLAYWRIGHT_PORT="3000"; npx playwright test e2e/referral-growth-suite.spec.ts --project=chromium
```

Using npm script:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/allfantasy_e2e PLAYWRIGHT_PORT=3000 npm run test:e2e:referral-db
```

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/allfantasy_e2e"; $env:PLAYWRIGHT_PORT="3000"; npm run test:e2e:referral-db
```

## Notes

- The Playwright config starts Next.js via `scripts/playwright-dev-server.cjs`.
- Avoid using shared production-like DB URLs for this suite.
- If you see `DB_UNAVAILABLE` or connection pool errors, switch to a dedicated local Postgres DB and rerun.

## Click Audit Grouped Suite

Run all click-audit specs (including Prompt 117 player comparison lab, Prompt 118 fantasy news aggregator, Prompt 119 league power rankings, Prompt 120 fantasy coach mode, and Prompt 121 viral social sharing) via grep tag:

```bash
npm run test:e2e:click-audits
```

Chromium-only lane:

```bash
npm run test:e2e:click-audits:chromium
```

List included click-audit specs:

```bash
npm run test:e2e:click-audits:list
```

Chromium list only:

```bash
npm run test:e2e:click-audits:list:chromium
```
