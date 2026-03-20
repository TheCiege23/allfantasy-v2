# Import Mapping Architecture (Prompt 22)

## 1. Import mapping architecture

The import mapping layer normalizes provider-specific league data into AllFantasy (AF) canonical shapes so that:

- **League creation from import** can consume a single normalized payload (league settings, rosters, scoring, schedule, history).
- **Source tracking** is preserved (`source_provider`, `source_league_id`, `source_team_id`, `source_manager_id`, `source_player_id`, `source_season_id`, `import_batch_id`, `imported_at`) for sync and history.
- **Provider quirks** stay inside provider adapters and do not leak into AF domain models.

### High-level flow

1. **Resolve provider** — `ImportProviderResolver.resolveProvider(platform)` maps UI/API platform strings to a canonical `ImportProvider` (`sleeper` | `espn` | `yahoo` | `fantrax` | `mfl`).
2. **Get adapter** — `LeagueImportRegistry.getAdapter(provider)` returns the adapter for that provider.
3. **Normalize** — The adapter’s `normalize(raw)` runs provider-specific mappers and returns a `NormalizedImportResult`.
4. **Consume** — The normalized result is used by:
   - Legacy transfer (preview) and/or
   - “Create league from import” (persist League, LeagueTeam, Roster, history, etc.).

### Core modules

| Module | Role |
|--------|------|
| **LeagueImportRegistry** | Maps `ImportProvider` → `ILeagueImportAdapter`; `getAdapter(provider)`, `getSupportedProviders()`, `hasFullAdapter(provider)`. |
| **ImportProviderResolver** | `resolveProvider(platform: string)` → `ImportProvider \| null`; handles aliases (e.g. `myfantasyleague` → `mfl`). |
| **ImportNormalizationPipeline** | Entry point: `runImportNormalizationPipeline({ provider, raw })` → `Promise<NormalizedImportResult>`. |
| **ExternalLeagueMapper** | Raw league → `NormalizedLeagueSettings`. |
| **ExternalRosterMapper** | Raw rosters/users → `NormalizedRoster[]`. |
| **ExternalScoringMapper** | Raw scoring → `NormalizedScoring \| null`. |
| **ExternalScheduleMapper** | Raw matchups → `NormalizedMatchup[]`. |
| **ExternalHistoryMapper** | Raw draft/transactions/standings → `NormalizedHistory` (draft_picks, transactions, standings). |
| **ExternalIdentityMapper** | Optional: source IDs → AF IDs / stable keys (for persistence and future sync). |

All mappers are **interfaces**; each provider implements them inside its adapter (e.g. `adapters/sleeper/`).

---

## 2. Provider adapter and normalization design

### Adapter contract

- **Interface:** `ILeagueImportAdapter<P>` with `provider: ImportProvider` and `normalize(raw: P): Promise<NormalizedImportResult>`.
- **Sleeper:** Full implementation. Input: `SleeperImportPayload` (league, users, rosters, matchupsByWeek, transactions, draftPicks, playerMap, previousSeasons). Uses dedicated Sleeper mappers for league, roster, scoring, schedule, and history; builds `SourceTracking` and fills all normalized fields to match AF Legacy transfer preview expectations.
- **ESPN:** Full implementation. Input: `EspnImportPayload` (league, settings, teams, schedule, transactions, draftPicks, playerMap, previousSeasons). Detects PPR/half/standard from `scoringItems` statId 53 reception points; detects dynasty from `keeperCount` in raw settings. Maps all 11 coverage buckets.
- **Yahoo:** Full implementation. Input: `YahooImportPayload` (league, settings, teams, schedule, transactions, draftPicks, playerMap, previousSeasons). Detects PPR/half/standard from stat modifier value for the reception stat category; detects dynasty from keeper-related keys (`keeper_players`, `is_keeper`, `uses_keepers`, `keeper_deadline`) in raw settings. Maps all 11 coverage buckets.
- **MFL:** Full implementation. Input: `MflImportPayload` (league, settings, teams, schedule, transactions, draftPicks, playerMap, previousSeasons). Detects PPR from `scoringType` string containing "ppr"; detects dynasty from 8 keeper/dynasty/salary-cap keys in raw settings. Maps all 11 coverage buckets.
- **Fantrax:** Full implementation. Input: `FantraxImportPayload` (sourceInput, league, settings, teams, schedule, transactions, draftPicks, playerMap, previousSeasons). Uses dedicated Fantrax mappers (league, roster, scoring, schedule, history). Maps all 11 coverage buckets. `isDevy` flag maps to `isDynasty`.

All five providers have a **full adapter** and `hasFullAdapter(provider)` returns `true` for each.

### Normalized output shape

- **source** — `SourceTracking`: `source_provider`, `source_league_id`, `source_season_id`, `import_batch_id`, `imported_at`.
- **league** — `NormalizedLeagueSettings`: name, sport, season, leagueSize, rosterSize, scoring, isDynasty, playoff_team_count, etc., plus optional extras (e.g. roster_positions, scoring_settings).
- **rosters** — `NormalizedRoster[]`: source_team_id, source_manager_id, owner_name, team_name, avatar_url, wins/losses/ties, points_for, player_ids, starter_ids, reserve_ids, taxi_ids, faab_remaining, waiver_priority.
- **scoring** — `NormalizedScoring | null`: scoring_format, rules (stat_key, points_value), raw.
- **schedule** — `NormalizedMatchup[]`: week, season, matchups (roster_id_1, roster_id_2, points_1, points_2).
- **draft_picks** — `NormalizedDraftPick[]`: round, pick_no, source_roster_id, source_player_id, player_name, position, team.
- **transactions** — `NormalizedTransaction[]`: source_transaction_id, type, status, created_at, adds/drops, roster_ids.
- **standings** — `NormalizedStandingsEntry[]`: source_team_id, rank, wins, losses, ties, points_for, points_against.
- **player_map** — `Record<source_player_id, { name, position, team }>`.
- **league_branding** — optional avatar_url, name.
- **previous_seasons** — optional list of { season, source_league_id }.

Provider-specific details (e.g. Sleeper roster_id vs ESPN teamId) are hidden inside the adapter; only canonical field names and source IDs appear in the normalized result.

---

## 3. Schema additions for source tracking

- **League**
  - Existing: `platform` (source_provider), `platformLeagueId` (source_league_id).
  - Added: **importBatchId** (`String?`, VarChar 64), **importedAt** (`DateTime?`). Used when a league is created from an import so we can trace back to the import batch and time.
- **Roster** — No change. `platformUserId` continues to represent source_manager_id for the owning user.
- **LeagueTeam** — No change. `externalId` continues to represent source_team_id (e.g. Sleeper roster_id as string).
- **PlayerIdentityMap / SportsPlayer** — Already support multi-provider IDs (sleeperId, espnId, mflId, etc.); no schema change for import mapping. ExternalIdentityMapper can use these when resolving source_player_id to AF ids during persist.

Mapping of normalized fields to persistence:

- `source_provider` → `League.platform`
- `source_league_id` → `League.platformLeagueId`
- `source_season_id` → can be stored in `League.settings` or used only at import time
- `source_team_id` → `LeagueTeam.externalId`
- `source_manager_id` → `Roster.platformUserId`
- `import_batch_id` → `League.importBatchId`
- `imported_at` → `League.importedAt`

---

## 4. Integration points with league creation and history systems

- **League creation**
  - Current native flow is unchanged: `POST /api/league/create` uses `LeagueDefaultsOrchestrator` (getInitialSettingsForCreation, runPostCreateInitialization). No changes to that path.
  - **Unified import flow (all providers):** Two API routes handle provider-agnostic import end-to-end:
    - `POST /api/leagues/import/preview` — accepts `{ provider, sourceId }`, auth-gated via `requireVerifiedUser`, fetches + normalizes the provider payload, returns `ImportPreviewResponse` (data quality score, coverage summary, managers list, settings preview).
    - `POST /api/leagues/import/commit` — accepts `{ provider, sourceId }`, auth-gated, fetches + normalizes, then calls `persistImportedLeagueFromNormalization()`: upserts `League` with source-tracking fields, bootstraps `LeagueTeam`/`Roster`/`TeamPerformance` from normalized rosters/schedule, runs provider-specific historical backfill. Returns `{ leagueId, name, sport, league, historicalBackfill }`.
  - **Client service:** `LeagueCreationImportSubmissionService` wraps both routes; `fetchImportPreview()` calls the preview route and `submitImportCreation()` calls the commit route. UI availability (`isImportProviderAvailable`) gates which providers appear as options.
  - **Legacy Sleeper path:** `POST /api/league/import/sleeper/preview` and the `createFromSleeperImport` path in `POST /api/league/create` remain for backward compatibility; the unified routes are preferred for all new flows.
- **Legacy transfer**
  - AF Legacy league transfer tool (`/api/legacy/transfer`) remains the **product guide** for what imported data should look like. It currently fetches Sleeper only and returns a **preview** (no AF league created). The Sleeper adapter and mappers were designed so that `NormalizedImportResult` aligns with that preview (managers/rosters, stats, draft, trades, storylines input data). The pipeline can be fed the same Sleeper payload (e.g. assembled from the same API calls as the transfer route) to get a normalized result that could later drive both preview and “create from import.”
- **History**
  - Normalized draft_picks, transactions, and standings can be stored in existing or new tables (e.g. draft history, trade history, standings snapshots). The architecture does not require schema changes for history beyond the League.importBatchId/importedAt addition; persistence of history is left to the integration that performs “create from import.”

---

## 5. QA findings

- **Provider resolution** — `resolveProvider('sleeper')` → `sleeper`, `resolveProvider('myfantasyleague')` → `mfl`. Unsupported string returns `null`.
- **Sleeper adapter** — Maps league, users, rosters, matchups, transactions, draft picks, and player map into `NormalizedImportResult`; source tracking and roster/team/player IDs are consistent with legacy transfer expectations.
- **ESPN adapter** — Full implementation: PPR/half/standard detected from `scoringItems` statId 53; dynasty detected from `keeperCount`; all 11 coverage buckets populated.
- **Yahoo adapter** — Full implementation: PPR/half/standard detected from stat modifier value on reception stat category; dynasty detected from keeper-related raw keys; all 11 coverage buckets populated.
- **MFL adapter** — Full implementation: PPR detected from `scoringType` string; dynasty detected from 8 keeper/dynasty/salary-cap raw keys; all 11 coverage buckets populated.
- **Fantrax adapter** — Full implementation: uses dedicated Fantrax mappers (league, roster, scoring, schedule, history); `isDevy` maps to `isDynasty`; all 11 coverage buckets populated.
- **Unified API routes** — `POST /api/leagues/import/preview` and `POST /api/leagues/import/commit` handle all five providers with `requireVerifiedUser` auth gate.
- **Preview data quality** — `buildImportedLeaguePreview()` computes weighted completeness score (0–100) and assigns tier (FULL ≥ 80, PARTIAL ≥ 50, MINIMAL < 50) with per-bucket signals for missing/partial coverage.
- **Test suite** — `__tests__/import-mapping-architecture-prompt22.test.ts`: **71 tests pass** covering resolver, registry, pipeline, all 5 adapters, and preview builder.

---

## 6. Issues fixed

- Docs updated from original stub-only description to reflect full adapter implementations for ESPN, Yahoo, MFL, and Fantrax.
- Mapper logic was aligned with existing legacy transfer data shapes to avoid mismatches (e.g. Sleeper roster_id as string, manager display name from user, points from fpts + fpts_decimal).

---

## 7. Final QA checklist

- [x] **Provider adapters** — All five providers (Sleeper, ESPN, Yahoo, MFL, Fantrax) have full adapter implementations; `hasFullAdapter(provider)` returns `true` for all.
- [x] **Imported settings** — Sleeper, ESPN, Yahoo, MFL, Fantrax league settings (PPR/half/standard, dynasty, playoff teams, roster size) are detected and mapped to canonical fields.
- [x] **Manager/team/player mapping** — `source_team_id` and `source_manager_id` are stable per-provider; roster player IDs, starter IDs, and reserve IDs are all mapped.
- [x] **Coverage buckets** — All 11 coverage buckets are populated per adapter with appropriate `full`/`partial`/`missing` states, counts, and explanatory notes.
- [x] **Import failures** — Invalid/minimal payload returns safe fallbacks (e.g. default league name, empty rosters) and does not throw from pipeline.
- [x] **Unified API routes** — `POST /api/leagues/import/preview` and `POST /api/leagues/import/commit` exist and are auth-gated.
- [x] **Native league creation** — Existing `POST /api/league/create` and bootstrap flow were not modified.
- [x] **Schema** — `League.importBatchId`, `League.importedAt`, `League.platform`, `League.platformLeagueId`, `LeagueTeam.externalId`, `Roster.platformUserId` all exist; no migration required.
- [x] **Test suite** — 71 automated tests covering all providers, the pipeline, the resolver, the registry, and the preview builder.

---

## 8. Explanation of external league import mapping

**External league import mapping** is the process of taking league data from an external platform (Sleeper, ESPN, Yahoo, Fantrax, MFL) and converting it into the same shapes AllFantasy uses internally for leagues, rosters, scoring, schedule, and history.

1. **Why mapping** — Each platform uses different field names, IDs, and structures. A single mapping layer lets the rest of the product work with one canonical model and one set of APIs, regardless of source.

2. **What gets mapped** — League settings (name, sport, season, size, scoring, dynasty, playoffs), rosters (teams, managers, wins/losses, points, player and starter IDs), scoring rules, schedule (matchups by week), and history (draft picks, transactions, standings). Where the provider exposes it, we also carry branding, previous seasons, and a player map (source player id → name/position/team).

3. **Source tracking** — Every normalized entity can be tied back to the provider and the source IDs (league, team, manager, player, season). We also record an import batch id and timestamp. This supports future sync (e.g. “re-import from Sleeper”), deduplication (same platform + platformLeagueId), and auditing.

4. **How it’s implemented** — Each provider has an **adapter** that accepts that provider’s raw payload and calls **mappers** (league, roster, scoring, schedule, history). The mappers return the canonical AF shapes. The **ImportNormalizationPipeline** resolves the provider, gets the adapter, and returns a single **NormalizedImportResult**. That result is then used by the legacy transfer (preview) and/or by a “create league from import” flow that creates and persists League, LeagueTeam, Roster, and optional history, using the same source tracking fields so the imported league is fully traceable and consistent with AF Legacy expectations.
