# Draft room — production cleanup & launch gate

Database: **Neon (Postgres) + Prisma** only for persisted draft/ADP data. The draft UI may use optional Supabase Realtime for presence/chat when `NEXT_PUBLIC_SUPABASE_*` is configured; that path is not the data layer. Do not add Supabase for new draft data features.

## Automated gate commands

| Command | Purpose |
|--------|---------|
| `npm run check:draft-env` | Print SET/MISSING for common env keys (no values). |
| `npm run test:draft` | Run all Vitest specs under `__tests__/draft/`. |
| `npm run gate:draft` | `tsc --noEmit` + `test:draft` (CI-friendly default). |
| `npm run gate:draft:full` | `prisma validate` + `tsc` + `test:draft` + optional smoke (see below). |
| `npm run gate:draft:tests` | `test:draft` only (use if full-repo `tsc` is still blocked by non-draft TypeScript debt). |
| `npx prisma validate` | Schema validity. |
| `npx prisma generate` | Client regeneration (also runs on `postinstall`). |
| `npx prisma migrate status` | Check for pending migrations (run against target DB with care). |
| `npm run smoke:full-draft -- --league=<leagueId>` | Full draft smoke audit (needs `.env` + real/test league). |

**Optional smoke in `gate:draft:full`:** set `DRAFT_SMOKE_LEAGUE` to a league id before running so the script appends the smoke step.

**Example:**

```bash
# Windows PowerShell
$env:DRAFT_SMOKE_LEAGUE="your-test-league-id"
npm run gate:draft:full
```

## Full draft suite & smoke

- Unit/integration: `__tests__/draft/` (hundreds of tests; use `npm run test:draft`).
- Scripted audit: `scripts/smoke-full-draft.ts` via `npm run smoke:full-draft -- --league=...` (uses `--env-file=.env` when present).

## Clear Next.js dev cache (Windows)

Stuck HMR, stale RSC, or odd bundling after large refactors:

1. Stop the dev server.
2. Delete the Next cache folder: `.next` in the project root (`Remove-Item -Recurse -Force .next` in PowerShell).
3. Optionally run `node scripts/clean-next-dev.cjs` if your workflow uses the repo’s dev wrapper (`npm run dev` already chains cleaning in some setups).
4. `npm run dev` again.

## Run AI ADP recompute manually

Cron route: `GET` or `POST` `/api/cron/recompute-allfantasy-adp` with auth:

- Header: `Authorization: Bearer <CRON_SECRET>`, or `x-cron-secret: <CRON_SECRET>`.

Local example (do not commit secrets; use your real token from env):

```bash
curl -sS -H "Authorization: Bearer $env:CRON_SECRET" "http://localhost:3000/api/cron/recompute-allfantasy-adp"
```

Query options (gated by the same auth): `sport`, `season`, `includeTest=true`, `dryRun=true`. Defaults: NFL, real mode, `includeTest` off.

`vercel.json` should register a daily schedule for this path (covered in `d5-scheduler-cron-route.test.ts`).

## Dev-only route: `/dev/d6-preview`

- Structural preview for D.6 layout; not linked in production nav.
- **Disabled in production:** `isD6PreviewRouteEnabled()` is false when `NODE_ENV === 'production'`, and the page calls `notFound()`.
- Do not re-enable in production without a product decision and auth.

## Env checklist (concepts)

Run `npm run check:draft-env` for a live report. Typical keys:

- **DATABASE_URL** — Neon connection string for Prisma.
- **DIRECT_URL** — Optional direct (non-pooler) URL for migrations.
- **NEXTAUTH_SECRET** — Session/crypto for NextAuth.
- **CRON_SECRET** — Protects `/api/cron/*` (including AI ADP recompute).
- **NEXT_PUBLIC_USE_ALLFANTASY_ADP** — `'true'` to enable AllFantasy AI ADP in the client; default off when unset.
- **NEXT_PUBLIC_ALLFANTASY_ADP_DRAFT_MODE** — `real` \| `test` \| `mock`; when unset, draft mode defaults to **real** (`lib/adp/allFantasyAdpFlag.ts`).
- **Rolling Insights / SportsDB / TheSportsAPI / model keys** — As required by your deployed features; keep server-only where possible.
- **Stripe** — If any draft path touches paid flows.

## AllFantasy ADP — production behavior

- Feature flag **defaults OFF** (`isAllFantasyAdpEnabled({})` is false) until ops sets `NEXT_PUBLIC_USE_ALLFANTASY_ADP=true`.
- When the flag is on, **default draft mode is `real`**; `?adpMode=test` or env `test` is for dev/harness only.
- The recompute cron defaults to `draftMode: 'real'` and does not include test harness rows unless `includeTest=true` is passed explicitly.

## Optional Playwright

If `@draft-room` or `@mock-draft-room` tests are configured: `npm run test:e2e:draft-room:chromium`.

## Known acceptable warnings

- Local Vitest may warn about RSC or dynamic imports; focus on **exit code 0** and test failures, not one-off console noise.
- `prisma migrate status` on a **branch** DB may differ from production; treat “pending” as a signal, not always a blocker in dev.
- **Neon / baseline:** if your team used a one-off baseline fix, keep `prisma/migrations` as the source of truth; do not re-run destructive resets against shared envs.

## TypeScript and memory

- Full-repo `npx tsc --noEmit` can take several minutes and may require a larger Node heap, for example:  
  `set NODE_OPTIONS=--max-old-space-size=8192` (Windows `cmd`) or `$env:NODE_OPTIONS='--max-old-space-size=8192'` (PowerShell) before `tsc`.
- The draft room and `__tests__/draft/` are expected to stay green; unrelated packages may still have their own `tsc` issues until the wider codebase is brought back to a clean `typecheck`. Use `gate:draft:tests` for a draft-only bar when needed.

## Hard blockers (typical)

- `tsc` or `__tests__/draft/` failures.
- `prisma validate` errors.
- Missing `DATABASE_URL` on deploy target.
- `CRON_SECRET` not set in production but cron routes are expected to be protected.
- `NEXT_PUBLIC_ALLFANTASY_ADP_DRAFT_MODE=test` accidentally set in a public demo (forces test harness data).

## Manual final smoke (pre-demo)

1. Open the live draft route; start or resume a draft.
2. Draft / queue / autopick; undo if applicable.
3. Open Roster, Chat, War Room; rookie/DEF filters.
4. Mobile width: Board / Players / Queue / Roster / Chat; horizontal scroll only inside Board/Players; no full-page sideways scroll.
5. Run `npm run smoke:full-draft -- --league=<id>` when credentials allow.
6. Watch server logs for 500s.

## Test coverage for this gate

- `__tests__/draft/draft-launch-gate.test.ts` — d6 preview guard, ADP default `real`, cron 401 without secret, no `https?://` in `DraftRoomPageClient`, dock + `PlayerPanel` free of new Supabase imports.
- `__tests__/draft/d5-scheduler-cron-route.test.ts` — full cron contract.
- `__tests__/draft/d5-proper-feature-flag.test.ts` — AllFantasy ADP flags and URLs.

## Known production risks (draft)

- **Optional Supabase Realtime** in `DraftRoomPageClient` / `DraftShell` for presence and chat event hints when configured; if keys are missing, those features degrade silently. Core draft state is API + Prisma.
- **URL override `?adpMode=test`** can force test data when the AllFantasy ADP flag is on; avoid sharing such links in public demos.
- **Seed / cron scripts** are not started automatically by the app; do not wire them in `package.json` `postinstall` for production.
