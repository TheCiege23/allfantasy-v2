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
- **ESPN, Yahoo, Fantrax, MFL:** Stub adapters that return a minimal `NormalizedImportResult` with a placeholder league name (e.g. `[ESPN import not implemented]`) and empty rosters/schedule/history so the pipeline never throws and callers can detect “not implemented” by name or `hasFullAdapter(provider)`.

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
  - **Create-from-import** (future or existing): Call `runImportNormalizationPipeline({ provider, raw })`, then create `League` with name/sport/season/leagueSize/scoring/isDynasty from `normalized.league`, and set `platform`, `platformLeagueId`, `importBatchId`, `importedAt` from `normalized.source`. Create `LeagueTeam` per `normalized.rosters` (externalId = source_team_id, ownerName, teamName, avatarUrl, wins, losses, pointsFor, etc.). Create `Roster` per roster (platformUserId = source_manager_id, playerData from player_ids + player_map). Scoring/schedule/history can be applied via existing bootstrap or dedicated import persistence (e.g. TeamPerformance, draft history, transactions) as needed.
- **Legacy transfer**
  - AF Legacy league transfer tool (`/api/legacy/transfer`) remains the **product guide** for what imported data should look like. It currently fetches Sleeper only and returns a **preview** (no AF league created). The Sleeper adapter and mappers were designed so that `NormalizedImportResult` aligns with that preview (managers/rosters, stats, draft, trades, storylines input data). The pipeline can be fed the same Sleeper payload (e.g. assembled from the same API calls as the transfer route) to get a normalized result that could later drive both preview and “create from import.”
- **History**
  - Normalized draft_picks, transactions, and standings can be stored in existing or new tables (e.g. draft history, trade history, standings snapshots). The architecture does not require schema changes for history beyond the League.importBatchId/importedAt addition; persistence of history is left to the integration that performs “create from import.”

---

## 5. QA findings

- **Provider resolution** — `resolveProvider('sleeper')` → `sleeper`, `resolveProvider('myfantasyleague')` → `mfl`. Unsupported string returns `null`.
- **Sleeper adapter** — Maps league, users, rosters, matchups, transactions, draft picks, and player map into `NormalizedImportResult`; source tracking and roster/team/player IDs are consistent with legacy transfer expectations.
- **Stub adapters** — ESPN, Yahoo, Fantrax, MFL return a valid minimal result (no throw); `hasFullAdapter(provider)` is false for them.
- **League creation** — Not exercised in this task; existing `POST /api/league/create` and bootstrap flow were not modified and should be re-tested in regression.

---

## 6. Issues fixed

- None reported; this was a greenfield implementation. Mapper logic was aligned with existing legacy transfer data shapes to avoid mismatches (e.g. Sleeper roster_id as string, manager display name from user, points from fpts + fpts_decimal).

---

## 7. Final QA checklist

- [ ] **Provider adapters** — Sleeper maps all source fields into AF canonical fields; stub adapters return without throwing.
- [ ] **Imported settings** — Sleeper league settings (PPR, Superflex, TEP, playoff teams, roster size) match source league settings in normalized output.
- [ ] **Manager/team/player mapping** — source_team_id and source_manager_id are stable and match legacy transfer preview (rosterId, ownerId, displayName, etc.).
- [ ] **Import failures** — Invalid payload or missing league in Sleeper payload yields safe fallbacks (e.g. default league name, empty rosters) and does not throw from pipeline; errors can be logged inside adapter.
- [ ] **Native league creation** — Existing league create and bootstrap still work (no changes to create route or LeagueDefaultsOrchestrator).
- [ ] **Schema** — Migration applied for `League.importBatchId` and `League.importedAt`; existing League/Roster/LeagueTeam usage unchanged.

---

## 8. Explanation of external league import mapping

**External league import mapping** is the process of taking league data from an external platform (Sleeper, ESPN, Yahoo, Fantrax, MFL) and converting it into the same shapes AllFantasy uses internally for leagues, rosters, scoring, schedule, and history.

1. **Why mapping** — Each platform uses different field names, IDs, and structures. A single mapping layer lets the rest of the product work with one canonical model and one set of APIs, regardless of source.

2. **What gets mapped** — League settings (name, sport, season, size, scoring, dynasty, playoffs), rosters (teams, managers, wins/losses, points, player and starter IDs), scoring rules, schedule (matchups by week), and history (draft picks, transactions, standings). Where the provider exposes it, we also carry branding, previous seasons, and a player map (source player id → name/position/team).

3. **Source tracking** — Every normalized entity can be tied back to the provider and the source IDs (league, team, manager, player, season). We also record an import batch id and timestamp. This supports future sync (e.g. “re-import from Sleeper”), deduplication (same platform + platformLeagueId), and auditing.

4. **How it’s implemented** — Each provider has an **adapter** that accepts that provider’s raw payload and calls **mappers** (league, roster, scoring, schedule, history). The mappers return the canonical AF shapes. The **ImportNormalizationPipeline** resolves the provider, gets the adapter, and returns a single **NormalizedImportResult**. That result is then used by the legacy transfer (preview) and/or by a “create league from import” flow that creates and persists League, LeagueTeam, Roster, and optional history, using the same source tracking fields so the imported league is fully traceable and consistent with AF Legacy expectations.
