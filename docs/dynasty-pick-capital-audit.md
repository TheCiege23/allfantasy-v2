# Dynasty Pick-Capital — Audit & Resolution

_Audited & resolved 2026-06-14 against live Neon. Resolves the known dynasty gap:
`FutureDraftPick` / `RookieDraftWindow` models existed in code but the live DB lacked
the tables. Dynasty-only; no fabrication of picks or pick values._

## Schema audit

| Concern | Finding |
| --- | --- |
| Models defined? | **Yes** — `FutureDraftPick` (`future_draft_picks`) + `RookieDraftWindow` (`rookie_draft_windows`) in `prisma/schema.prisma` (added commit `2474e04f`, "Phase 7B-7E"), with enums `FutureDraftPickStatus` / `RookieDraftWindowStatus` and `League` back-relations (`futureDraftPicks`, `rookieDraftWindows`). |
| Intentionally native dynasty? | **Yes** — `FutureDraftPick` carries full trade-aware ownership (`originalRosterId` immutable, `currentOwnerId` post-trade, `traded`, `sourceTradeId`, `status`, used/forfeited audit). `RookieDraftWindow` carries draft-order snapshot + lifecycle. This is first-class native dynasty modeling, not a stub. |
| Migration present? | **No** — `grep` over `prisma/migrations` found neither table. The models drifted ahead of migrations. |
| Tables in live DB? | **No** (before this change) — `prisma.futureDraftPick.findFirst()` raised **P2021** "table does not exist". |
| Existing provider/import path? | The **MFL import adapter** (`lib/league-import/adapters/mfl/MflAdapter.ts`) normalizes `draftPicks` into a JSON payload, but nothing persisted them into `future_draft_picks`. No service wrote to either table. |
| Dynasty settings re: pick years | `DynastySettingsService` exposes `futurePicksYearsOut` (default 3) + rookie-draft settings; `offseasonEngine` has an `allowPickTrades` phase flag — but neither touches the pick tables. |
| Prior pick valuation code | None for native picks. Connected-league trades use FantasyCalc via `trade-evaluator`. |

## Safety analysis (can we create the tables now?)

- **Additive only.** Creating `future_draft_picks` + `rookie_draft_windows` (+ 2 enums)
  adds new objects. No existing table gains/loses a column. The only foreign keys point
  **FROM** the new tables **INTO** the existing `leagues` table. **Zero impact to existing
  production data.**
- **Why not `prisma migrate dev` / `db push`?** The live Neon DB has **significant
  unrelated drift** from `schema.prisma` (a `migrate diff` from the live datasource shows
  many `DROP COLUMN` / `DROP INDEX` / `ALTER ENUM` on unrelated tables — `Player`,
  `draft_sessions`, `playoff_bracket_entries`, etc.). Running `migrate dev`/`db push`
  against schema would emit those **destructive** statements. Unsafe.
- **Chosen approach:** a **scoped, hand-authored, idempotent** migration that creates ONLY
  these two tables + enums + indexes, applied via `prisma db execute` (raw SQL), then
  recorded in history with `prisma migrate resolve --applied`. Migration status afterward:
  **"Database schema is up to date!" (93 migrations).**

## Resolution (this change)

- **Migration:** `prisma/migrations/20260614000000_add_dynasty_future_picks_rookie_windows/migration.sql`
  - Idempotent: enums via `DO $$ … EXCEPTION WHEN duplicate_object` blocks; `CREATE TABLE
    IF NOT EXISTS`; `CREATE [UNIQUE] INDEX IF NOT EXISTS`; FK adds guarded by `DO` blocks.
  - Column types/indexes/`@@map` match exactly what Prisma generates (verified via
    `migrate diff --from-empty --to-schema-datamodel`).
  - Applied to Neon with `prisma db execute --file …`; both tables verified queryable
    (count 0). Recorded with `migrate resolve --applied`.
  - Safe to re-run anywhere (idempotent) and safe for fresh deploys via `migrate deploy`.

### Neon SQL notes
The migration is plain Postgres DDL and runs as-is on Neon. To apply manually elsewhere:
```
node node_modules/prisma/build/index.js db execute \
  --file prisma/migrations/20260614000000_add_dynasty_future_picks_rookie_windows/migration.sql \
  --schema prisma/schema.prisma
node node_modules/prisma/build/index.js migrate resolve \
  --applied 20260614000000_add_dynasty_future_picks_rookie_windows
```
Because every statement is `IF NOT EXISTS` / duplicate-guarded, re-running is a no-op.

## Pick valuation policy (no fabrication)

Picks are priced by a **deterministic structural TIER**, not a market value:
`pickHeuristicValue(round, seasonsOut)` in `lib/dynasty-war-room/dynastyPlayerValue.ts`
— base by round (R1 18 / R2 10 / R3 5 / else 2) × recency discount (this/next year ~1.0,
2 yrs 0.85, 3+ yrs 0.7). This is a transparent function of the pick's own attributes
(the well-known "earlier round + nearer draft = more valuable" scaling), explicitly
labeled a tier in the UI/prompt — never a fabricated external market value, and never an
invented pick the team does not hold.

## Availability states (truthful)

`context.availability.futurePicks`:
- `missing` — table not migrated in this environment → `pickValue` feature off,
  engines report `needsProviderIntegration`, UI shows "tracking not enabled."
- `available_empty` — table exists, no picks recorded for the league yet → honest empty
  state (not provider-limited).
- `available` — real picks summarized and priced by tier.

## Outcome

Dynasty pick capital is now **REAL** (migrated + wired end-to-end), no longer a
provider-limited blocker. See `docs/dynasty-war-room-runtime.md` for runtime verification.
