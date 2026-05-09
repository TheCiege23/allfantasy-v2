# World Cup Bracket — Launch Notes

Operational guidance for production/staging. See also [world-cup-env-vars.md](./world-cup-env-vars.md) and [world-cup-bracket-qa-checklist.md](./world-cup-bracket-qa-checklist.md).

---

## Live scoring provider recommendation

1. **Primary:** **`api_sports`** (API-Football) when `API_SPORTS_KEY` (or compatible keys) and league id are configured — broad coverage and structured statuses aligned with `worldCupLiveScoreNormalizer`.
2. **Secondary:** Configure **`thesportsdb`**, **`reality_sports`**, or **`clear_sports`** in `WORLD_CUP_LIVE_PROVIDER_CHAIN` as fallbacks when the primary returns no rows or errors.
3. **Final fallback:** **`manual`** via `WORLD_CUP_MANUAL_LIVE_JSON` / `WORLD_CUP_MANUAL_LIVE_JSON_BODY` for operator-controlled JSON during outages or edge cases.

The sync pipeline walks the chain until a provider returns at least one normalized match (`fetchWorldCupLiveMatchesFromChain`).

---

## Manual override fallback

Keep a validated JSON file or env body ready for **`manual`** provider.

- **Platform-wide operator:** `POST /api/admin/world-cup/scores/sync-live` — authenticated **platform admin**, JSON body includes `challengeId` (and optional provider chain / flags).
- **League commissioner:** `POST /api/brackets/world-cup/[challengeId]/admin/sync-live` — authenticated user who **manages that challenge** (`assertWorldCupManager`), same sync behaviors scoped to the URL challenge.

Document rotation procedure for whoever runs operations.

---

## Cron recommendations

### Live scoring / score ingestion

There is **no** dedicated `cron/world-cup-live-sync` route in-repo at the time of writing; live sync is triggered via authenticated APIs. For production, schedule a job (or internal worker) that:

- Calls **`POST /api/admin/world-cup/scores/sync-live`** (platform admin session) with `{ "challengeId": "<id>", "recalculate": true }` for each active challenge, **or**
- Calls **`POST /api/brackets/world-cup/[challengeId]/admin/sync-live`** using a **league manager** token per challenge, **or**
- Implements a batch job that wraps those endpoints for all open challenges.

**Suggested frequency during tournament:** **every 1–3 minutes** while matches are in progress; **every 5–15 minutes** overnight when no games.

Tune to provider rate limits (`API_SPORTS_KEY` quota).

### Lock reminders

- Route: **`GET /api/cron/world-cup-bracket-reminders`**
- Auth: **`Authorization: Bearer <CRON_SECRET>`** (must match `process.env.CRON_SECRET`)

**Suggested frequency:** **every 15–60 minutes** in the days leading to lock; increase density on lock day if product requires it.

---

## Known limitation: knockout mapping

The **official 2026 FIFA World Cup knockout bracket** (exact slot mapping for Round of 16 through Final) may need a **data/template update** once FIFA publishes the **final** knockout pairing rules and slot assignments. Until then, simulation and imports rely on the internal template (`worldCupBracketBuilder` / seed data). Plan a verification pass when official schedules are frozen.

---

## AF Pro & Bracket Brain

- AI-assisted commissioner actions require **`OPENAI_API_KEY`** **and** user entitlement **`league_ai_coaching`** (AF Pro).
- Non-Pro users should see gated UI; server routes must still enforce entitlement where applicable.

---

## Final verification commands

Run from repository root after `npm ci` / `pnpm install` as appropriate.

```bash
# Prisma client
npx prisma generate

# Migration status (needs DATABASE_URL)
npx prisma migrate status
```

**Focused World Cup tests:**

```bash
# Reliable on Windows/macOS/Linux (shell glob may not expand on PowerShell):
npx vitest run world-cup --maxWorkers=4
```

**Optional — full TypeScript check with larger heap** (large repos):

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

**Optional — production build** (may require env):

```bash
npm run build
```

Adjust script name if your `package.json` uses `pnpm build` / `next build` only.

---

## Dev QA routes (non-production smoke)

Documented in [world-cup-bracket-qa-checklist.md](./world-cup-bracket-qa-checklist.md) § *Dev-only QA helpers*. Do not expose `WORLD_CUP_DEV_QA_SECRET` in client code.
