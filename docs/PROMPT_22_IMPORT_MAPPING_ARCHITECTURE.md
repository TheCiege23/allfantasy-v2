# Prompt 22 — Import Mapping Architecture for Sleeper, ESPN, Yahoo, Fantrax, and MFL + Full UI Click Audit

## 1. Import mapping architecture

- **Single normalization contract:** All providers produce a **NormalizedImportResult** (source tracking, league settings, rosters, scoring, schedule, draft_picks, transactions, standings, player_map, league_branding, previous_seasons). Provider-specific quirks stay inside adapters; the rest of the product consumes only this shape.
- **LeagueImportRegistry** (`lib/league-import/LeagueImportRegistry.ts`): Maps each **ImportProvider** (sleeper, espn, yahoo, fantrax, mfl) to an **ILeagueImportAdapter**. Sleeper uses the full SleeperAdapter; ESPN, Yahoo, Fantrax, MFL use stub adapters that return a placeholder NormalizedImportResult. `getAdapter(provider)`, `getSupportedProviders()`, `hasFullAdapter(provider)`.
- **ImportProviderResolver** (`lib/league-import/ImportProviderResolver.ts`): Resolves platform strings (e.g. `myfantasyleague`, `my-fantasy-league`) to canonical **ImportProvider**; `resolveProvider(platform)`, `isSupportedProvider(platform)`.
- **ImportNormalizationPipeline** (`lib/league-import/ImportNormalizationPipeline.ts`): Single entry point: `runImportNormalizationPipeline({ provider, raw })` → resolve provider, get adapter, call `adapter.normalize(raw)` → **NormalizedImportResult**. Does not create leagues or persist; output is used by league creation and legacy transfer.
- **Adapter contract (ILeagueImportAdapter):** `provider: ImportProvider`; `normalize(raw: P): Promise<NormalizedImportResult>`. Each provider implements this; full adapters (e.g. Sleeper) compose provider-specific mappers.
- **Mapper interfaces (per domain):**
  - **IExternalLeagueMapper** → NormalizedLeagueSettings
  - **IExternalRosterMapper** → NormalizedRoster[]
  - **IExternalScoringMapper** → NormalizedScoring | null
  - **IExternalScheduleMapper** → NormalizedMatchup[]
  - **IExternalHistoryMapper** → NormalizedHistory (draft_picks, transactions, standings)
  - **IExternalIdentityMapper** → resolve/build identity mappings (source id → AF id or stable key)
- **Sleeper:** SleeperAdapter composes SleeperLeagueMapper, SleeperRosterMapper, SleeperScoringMapper, SleeperScheduleMapper, SleeperHistoryMapper; builds SourceTracking (source_provider, source_league_id, source_season_id, import_batch_id, imported_at) and fills NormalizedImportResult including league_branding and previous_seasons.
- **Stub adapters (ESPN, Yahoo, Fantrax, MFL):** Return a minimal NormalizedImportResult with placeholder league name and empty rosters/schedule/etc.; used so UI can show “coming soon” and registry does not throw.
- **ImportedLeagueNormalizationPipeline** (`lib/league-import/ImportedLeagueNormalizationPipeline.ts`): Sleeper-specific: fetches via `fetchSleeperLeagueForImport(sleeperLeagueId)` then runs `runImportNormalizationPipeline({ provider: 'sleeper', raw })`. Returns success with normalized result or error (LEAGUE_NOT_FOUND, NORMALIZATION_FAILED). Used by import preview API and by league create-from-import.
- **ImportedLeaguePreviewBuilder** (`lib/league-import/ImportedLeaguePreviewBuilder.ts`): Builds **ImportPreviewResponse** from NormalizedImportResult for the UI (data quality, league summary, managers, roster positions, player map, draft/transaction/matchup counts, source). Aligns with AF Legacy league transfer preview expectations (managers, data quality, settings).
- **LeagueCreationImportSubmissionService** (`lib/league-import/LeagueCreationImportSubmissionService.ts`): Client-facing: `fetchImportPreview(provider, sourceInput)` (Sleeper → POST /api/league/import/sleeper/preview); `submitImportCreation(provider, sourceInput, userId)` (Sleeper → POST /api/league/create with createFromSleeperImport + sleeperLeagueId). Other providers return `{ ok: false, error: '...' }` so UX degrades gracefully.

---

## 2. Provider adapter and normalization design

- **Canonical types** (`lib/league-import/types.ts`):
  - **SourceTracking:** source_provider, source_league_id, source_season_id?, import_batch_id?, imported_at.
  - **NormalizedLeagueSettings:** name, sport, season, leagueSize, rosterSize, scoring, isDynasty, playoff_team_count, regular_season_length, schedule_unit, waiver_type, faab_budget, etc.
  - **NormalizedRoster:** source_team_id, source_manager_id, owner_name, team_name, avatar_url, wins, losses, ties, points_for, points_against, player_ids, starter_ids, reserve_ids?, taxi_ids?, faab_remaining?, waiver_priority?.
  - **NormalizedScoring:** scoring_format, rules (stat_key, points_value, multiplier?).
  - **NormalizedMatchup:** week, season, matchups (roster_id_1, roster_id_2, points_1?, points_2?).
  - **NormalizedDraftPick:** round, pick_no, source_roster_id, source_player_id, player_name?, position?, team?.
  - **NormalizedTransaction:** source_transaction_id, type, status, created_at, adds?, drops?, roster_ids, draft_picks?.
  - **NormalizedStandingsEntry:** source_team_id, rank, wins, losses, ties, points_for, points_against?.
  - **ExternalIdentityMapping:** source_provider, source_id, entity_type (player | manager | team | league), af_id?, stable_key?.

- **Sleeper adapter:** Fetches league, users, rosters, matchups, transactions, drafts, player map, previous seasons via SleeperLeagueFetchService; passes raw payload to Sleeper* mappers; assembles NormalizedImportResult with source, league, rosters, scoring, schedule, draft_picks, transactions, standings, player_map, league_branding, previous_seasons.

- **Adding a new provider (e.g. ESPN):** (1) Implement ILeagueImportAdapter (e.g. EspnAdapter) that composes ESPN-specific league/roster/scoring/schedule/history mappers. (2) Add fetch service (e.g. fetchEspnLeagueForImport) to get raw payload from ESPN API. (3) Register adapter in LeagueImportRegistry. (4) Add preview API route (e.g. POST /api/league/import/espn/preview) and extend LeagueCreationImportSubmissionService to call it when provider === 'espn'. (5) Set `available: true` for ESPN in provider-ui-config. (6) Optionally add create-from-import path in POST /api/league/create for createFromEspnImport + espnLeagueId. Provider-specific quirks stay in the adapter and mappers; no leakage into League/Roster/LeagueTeam models.

---

## 3. Schema additions for source tracking

- **League** (existing): **platform** (e.g. 'sleeper') = source provider; **platformLeagueId** = source_league_id; **importBatchId** (optional); **importedAt** (optional). Unique (userId, platform, platformLeagueId). Index on importBatchId.
- **Roster:** No dedicated source_team_id/source_manager_id columns; platformUserId is used to link to platform identity. For imported leagues, roster rows are created by SleeperLeagueCreationBootstrapService with platform user/team mapping from normalized rosters; externalId on LeagueTeam can hold source_team_id.
- **LeagueTeam:** **externalId** holds the external (source) team id; ownerName, teamName, avatarUrl, wins, losses, ties, pointsFor, pointsAgainst are populated from NormalizedRoster. No extra schema change required for source tracking at team level.
- **NormalizedImportResult** and **SourceTracking** in types carry source_provider, source_league_id, source_season_id, import_batch_id, imported_at; these are stored in League (platform, platformLeagueId, importBatchId, importedAt) and in settings or metadata as needed. No additional Prisma fields are required for the current import flow; optional future: source_player_id on a player-identity or roster-spot table if we need to persist per-player source id.

---

## 4. Integration points with league creation and history systems

- **League creation (POST /api/league/create):** When `createFromSleeperImport` and `sleeperLeagueId` are present, the API (1) runs `runImportedLeagueNormalizationPipeline(sleeperLeagueId)` to get normalized result, (2) creates League with platform 'sleeper', platformLeagueId = sleeper league id, settings from normalized league, (3) runs `bootstrapLeagueFromSleeperImport(league.id, normalized)` (rosters, teams, etc.), (4) runs gap-fill bootstrap (draft, waiver, playoff, schedule). Native creation path is unchanged.
- **Import preview:** POST /api/league/import/sleeper/preview with `{ leagueId }` → runImportedLeagueNormalizationPipeline → buildImportedLeaguePreview → return ImportPreviewResponse to UI.
- **LeagueCreationImportSubmissionService:** Used by StartupDynastyForm: fetchImportPreview(provider, sourceInput) for “Fetch & Preview”; submitImportCreation(provider, sourceInput, userId) for “Create League from Import”. Only Sleeper is wired; others get “not yet available” and disabled UI.
- **AF Legacy / league transfer:** ImportedLeaguePreviewBuilder and data quality (FULL/PARTIAL/MINIMAL, signals, roster coverage, matchup weeks, draft/transaction counts) are designed to align with Legacy expectations for imported league visibility and completeness. Historical data (previous_seasons) and league_branding are included in NormalizedImportResult and preview where the provider exposes them.

---

## 5. Full UI click audit findings

| Element | Component | Handler | State / API | Result / persistence | Status |
|--------|-----------|---------|-------------|----------------------|--------|
| Import mode | LeagueCreationModeSelector | onValueChange → setCreationMode; if create setImportPreview(null) | creationMode 'import' | N/A | OK |
| Provider | ImportProviderSelector | onValueChange → onChange((v \|\| null) as ImportProvider \|\| null) | importProvider | N/A | OK |
| Provider options | SelectContent | ImportProviderSelector | IMPORT_PROVIDER_UI_OPTIONS; disabled when !opt.available | ESPN/Yahoo/Fantrax/MFL show “(coming soon)” | OK |
| League ID input | ImportSourceInputPanel | onChange → onSourceInputChange(e.target.value) | sourceInput from parent | N/A | OK |
| Fetch & Preview | ImportSourceInputPanel | Button onClick → onFetchPreview (parent: handleFetchImportPreview) | setImportPreviewLoading(true); fetchImportPreview(provider, sourceInput) | POST /api/league/import/sleeper/preview (Sleeper); result → setImportPreview(result.data) | OK |
| Preview panel (display) | ImportedLeaguePreviewPanel | N/A | preview (ImportPreviewResponse) | League, managers, data quality, settings, draft/transaction/matchup counts | OK |
| Create League from Import | ImportedLeaguePreviewPanel | Button onClick → onCreateFromImport (parent: handleCreateFromImport) | setCreateFromImportLoading(true); submitImportCreation(provider, sourceInput, userId) | POST /api/league/create createFromSleeperImport + sleeperLeagueId; success → redirect /af-legacy | OK |
| Unavailable provider message | ImportSourceInputPanel | When !isImportProviderAvailable(provider) | Renders “Import from X is not yet available” + use Sleeper or build manually | N/A | OK |
| Loading (fetch) | ImportedLeaguePreviewPanel | loading true | Spinner “Fetching league…” | N/A | OK |
| Loading (create) | ImportedLeaguePreviewPanel | createLoading true | Button “Creating League…” disabled | N/A | OK |
| Error (fetch) | StartupDynastyForm | !result.ok → toast.error(result.error) | setImportPreviewLoading(false) | User sees toast; no stale preview | OK |
| Error (create 409) | StartupDynastyForm | res.status === 409 → toast.error('This league already exists') | setCreateFromImportLoading(false) | User sees toast | OK |
| Success redirect | StartupDynastyForm | toast.success then window.location.href = '/af-legacy' | After submitImportCreation ok | League created and user redirected | OK |

**Notes:** No explicit “Cancel” or “Back” on the preview card; user can switch mode to “create” or change provider/source and fetch again. Provider response data flows: Sleeper → fetch → runImportedLeagueNormalizationPipeline → buildImportedLeaguePreview → preview state → ImportedLeaguePreviewPanel; create → same pipeline → league create API → bootstrap. All wired; no dead buttons. ESPN/Yahoo/Fantrax/MFL: provider selector shows them disabled with “(coming soon)”; selecting one shows ImportSourceInputPanel with “not yet available” message and no fetch button that submits.

---

## 6. QA findings

- **Provider adapters map to AF shape:** Sleeper adapter produces NormalizedImportResult with all required fields; stub adapters return valid minimal result. runImportNormalizationPipeline returns only NormalizedImportResult; no provider-specific types leak.
- **Imported settings:** Normalized league settings (name, sport, leagueSize, playoff_team_count, scoring, etc.) are persisted via League.settings and League fields at create; bootstrap fills roster/teams/waiver/draft/playoff/schedule from normalized data or defaults.
- **Manager/team/player mapping:** NormalizedRoster has source_team_id, source_manager_id; LeagueTeam.externalId stores source team id; player_map and roster player_ids use source player ids where available. Mapping is stable for the same import batch.
- **Import failures:** runImportedLeagueNormalizationPipeline returns LEAGUE_NOT_FOUND or NORMALIZATION_FAILED; preview API returns 404/500 with error message; fetchImportPreview returns { ok: false, error }; toast shows to user. Safe fallback and no uncaught throws in the audited path.
- **Native league creation:** Unchanged; create path without createFromSleeperImport works as before.
- **Import click paths:** Mode → provider → source input → Fetch & Preview → preview → Create League from Import → redirect; all handlers present and state/API aligned. No dead buttons in the audited flow.

---

## 7. Issues fixed

- None required. The import mapping architecture (registry, resolver, pipeline, mappers, adapter contract, Sleeper full adapter, stubs for ESPN/Yahoo/Fantrax/MFL), source tracking types and League schema (platform, platformLeagueId, importBatchId, importedAt), preview builder, submission service, and UI (provider selector, source input, fetch, preview panel, create button) are already implemented and wired. This deliverable documents the architecture and audit results.

---

## 8. Final QA checklist

- [ ] Sleeper: Enter valid Sleeper league ID → Fetch & Preview → preview shows league name, managers, data quality, settings, draft/transaction/matchup counts.
- [ ] Sleeper: Create League from Import → league is created with platform 'sleeper', platformLeagueId set, importBatchId/importedAt set when applicable; rosters/teams created; redirect to /af-legacy.
- [ ] Sleeper: Invalid or missing league ID → appropriate error (e.g. League not found); no crash; user can retry or change ID.
- [ ] ESPN/Yahoo/Fantrax/MFL: Shown in provider list with “(coming soon)”; selecting one shows “not yet available” and does not allow successful fetch or create.
- [ ] Native “Build New League” flow still works and is unchanged.
- [ ] Every import-related click (mode, provider, input change, Fetch & Preview, Create League from Import) works; loading and error states display correctly; success redirects to /af-legacy.

---

## 9. Explanation of external league import mapping

External league import maps provider-specific data into AllFantasy’s canonical league structures so that (1) the product can create and display leagues from Sleeper (and in the future ESPN, Yahoo, Fantrax, MFL) without provider-specific code outside the import layer, and (2) source identity and batch are tracked for sync and history.

1. **Provider → adapter:** Each provider (sleeper, espn, yahoo, fantrax, mfl) is registered in LeagueImportRegistry with an ILeagueImportAdapter. The adapter’s only job is to take the provider’s raw payload and return a NormalizedImportResult (source tracking, league settings, rosters, scoring, schedule, draft picks, transactions, standings, player map, optional branding and previous seasons). Sleeper has a full implementation; the others use stubs so the UI can list them and show “coming soon.”

2. **Normalization:** NormalizedImportResult is the single contract: same shape regardless of provider. League settings map to League.settings and League fields; rosters to NormalizedRoster (source_team_id, source_manager_id, player_ids, etc.); scoring to NormalizedScoring; schedule to NormalizedMatchup[]; history to draft_picks, transactions, standings. Player and identity mapping use source ids and optional ExternalIdentityMapping for future sync.

3. **Fetch → normalize → preview:** For Sleeper, the flow is: fetch raw data (SleeperLeagueFetchService) → runImportNormalizationPipeline({ provider: 'sleeper', raw }) → buildImportedLeaguePreview(normalized) → return preview to UI. The same normalized result is used again at league creation so preview and created league are consistent.

4. **Create from import:** When the user confirms import, the client calls submitImportCreation (Sleeper → POST /api/league/create with createFromSleeperImport and sleeperLeagueId). The server runs the same fetch + normalization, creates the League row (platform, platformLeagueId, settings, importBatchId, importedAt), runs bootstrapLeagueFromSleeperImport (rosters, teams, etc.), then gap-fill draft/waiver/playoff/schedule. No duplicate fetch; one normalization pipeline for both preview and create.

5. **Source tracking:** SourceTracking (source_provider, source_league_id, source_season_id, import_batch_id, imported_at) is stored on League via platform, platformLeagueId, importBatchId, importedAt. Roster/team mapping uses NormalizedRoster source_team_id/source_manager_id and LeagueTeam.externalId so future syncing or history can resolve back to provider identities.

6. **AF Legacy alignment:** ImportedLeaguePreviewBuilder and the data quality tier (FULL/PARTIAL/MINIMAL), signals, and counts are designed so that what the user sees in the import preview (managers, settings, draft/transaction/matchup coverage) matches Legacy expectations for imported league visibility and completeness. Historical seasons and league branding are included when the provider exposes them.

7. **Adding a new provider:** Implement an adapter and provider-specific mappers (league, roster, scoring, schedule, history), a fetch service, a preview API route, and optional create-from-import branch; register the adapter and set available in provider-ui-config. The rest of the app continues to consume only NormalizedImportResult and ImportPreviewResponse.
