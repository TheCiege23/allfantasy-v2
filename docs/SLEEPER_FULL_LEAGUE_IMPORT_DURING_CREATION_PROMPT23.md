# Sleeper Full League Import During League Creation (Prompt 23)

## 1. Sleeper import during creation architecture

Users can choose **Create New AF League** or **Import Existing League** at the start of league creation. When they choose Import, they select **Sleeper**, enter the Sleeper League ID, fetch a preview, then create the AF league from that import.

### Flow

1. **UI** — Mode selector (Create vs Import). Form uses **LeagueCreationModeSelector**; **LeagueCreationImportSelector** exists as an alternative with Sleeper-focused copy. If import: **ImportProviderSelector** (Sleeper selected) → **ImportSourceInputPanel** (Sleeper League ID) → **Fetch & Preview** → **ImportedLeaguePreviewPanel** shows league name, team count, managers, data quality, draft/transaction/matchup counts → **Create League from Import** → success redirect to the **created AF league** (`/leagues/{id}`).
2. **Preview API** — `POST /api/league/import/sleeper/preview` with `{ leagueId }`. Uses `SleeperLeagueFetchService` → `runImportNormalizationPipeline` (Prompt 22) → `ImportedLeaguePreviewBuilder` → returns preview (league, managers, dataQuality, rosterPositions, playerMap, counts).
3. **Create from import** — `POST /api/league/create` with `createFromSleeperImport: true` and `sleeperLeagueId`. Backend runs `runImportedLeagueNormalizationPipeline(sleeperLeagueId)` (fetch + normalize), creates `League` from normalized data (name, sport, season, leagueSize, scoring, isDynasty, settings, avatarUrl, importBatchId, importedAt), then runs **SleeperLeagueCreationBootstrapService** to create `LeagueTeam` and `Roster` per roster and `TeamPerformance` from schedule. Native bootstrap is **not** run for this path.
4. **Native creation** — Unchanged: same form and `POST /api/league/create` without `createFromSleeperImport`; `LeagueDefaultsOrchestrator` and `runPostCreateInitialization` run as before.

### Core modules

| Module | Role |
|--------|------|
| **LeagueCreationImportSelector** | UI: choice between "Create New AF League" and "Import Existing League". |
| **SleeperImportPreviewService** | Implemented as **SleeperLeagueFetchService** (fetch) + **runImportedLeagueNormalizationPipeline** (fetch + normalize) + **ImportedLeaguePreviewBuilder** (normalized → preview payload). |
| **SleeperLeagueImportAdapter** | Existing Prompt 22 adapter: `adapters/sleeper/SleeperAdapter` + mappers; used inside `runImportNormalizationPipeline`. |
| **SleeperLeagueCreationBootstrapService** | After League create from import: creates/upserts `LeagueTeam` (externalId, ownerName, teamName, avatarUrl, wins, losses, ties, pointsFor, pointsAgainst, currentRank), `Roster` (platformUserId, playerData with players/starters/reserve/taxi), and `TeamPerformance` from normalized schedule. |
| **ImportedLeagueNormalizationPipeline** | `runImportedLeagueNormalizationPipeline(sleeperLeagueId)`: fetches via `fetchSleeperLeagueForImport`, then `runImportNormalizationPipeline('sleeper', payload)`. |
| **ImportedLeaguePreviewBuilder** | `buildImportedLeaguePreview(normalized)`: builds `ImportPreviewResponse` (dataQuality, league, managers, rosterPositions, playerMap, draftPickCount, transactionCount, matchupWeeks, source) for the UI. |

---

## 2. Frontend workflow updates

- **StartupDynastyForm** (`components/StartupDynastyForm.tsx`):
  - State: `creationMode` ('create' | 'import'), `importProvider`, `importSourceInput`, `importPreview`, `importPreviewLoading`, `createFromImportLoading`.
  - At top: **LeagueCreationModeSelector** to choose Build New League vs Import Existing League.
  - When **Import**: **ImportProviderSelector** (Sleeper available; ESPN/Yahoo/Fantrax/MFL “coming soon”) → **ImportSourceInputPanel** (Sleeper League ID + “Fetch & Preview”) → `handleFetchImportPreview` calls `fetchImportPreview(provider, sourceInput)` → `POST /api/league/import/sleeper/preview` with `{ leagueId }` → result stored in `importPreview`. **ImportedLeaguePreviewPanel** shows league name, data quality tier/score/signals, manager list, draft/transaction/matchup counts, and “Create League from Import”. On that button, `handleCreateFromImport` calls `submitImportCreation(provider, sourceInput, userId)` → `POST /api/league/create` with `createFromSleeperImport: true`, `sleeperLeagueId` → on success redirects to **created AF league** (`/leagues/${data.league.id}`); fallback `/af-legacy` if no `league.id`.
  - When **Create**: existing form (sport, preset, name, platform, league ID, format, size, scoring) and “Create Dynasty League” button unchanged; success redirect also to `/leagues/${data.league.id}` when available.
- **LeagueCreationImportSelector** (optional): Same concept as mode selector; options “Create New AF League” and “Import Existing League” with Sleeper-specific description. Exported from league-creation index; form currently uses **LeagueCreationModeSelector**.
- **ImportedLeaguePreviewPanel**: Displays preview (league title, avatar, data quality, settings summary, managers with avatars/W-L-T/points, counts) and “Create League from Import” button; shows loading state while fetching preview.

---

## 3. Backend import and normalization updates

- **SleeperLeagueFetchService** (`lib/league-import/sleeper/SleeperLeagueFetchService.ts`): Fetches Sleeper API (league, users, rosters, drafts, transactions by week, matchups by week, previous seasons), resolves player names via `getAllPlayers()`, returns `SleeperImportPayload` for the Prompt 22 pipeline.
- **ImportedLeagueNormalizationPipeline** (`lib/league-import/ImportedLeagueNormalizationPipeline.ts`): `runImportedLeagueNormalizationPipeline(sleeperLeagueId)` → fetch → `runImportNormalizationPipeline('sleeper', payload)` → returns `NormalizedImportResult` or error (LEAGUE_NOT_FOUND / NORMALIZATION_FAILED).
- **ImportedLeaguePreviewBuilder** (`lib/league-import/ImportedLeaguePreviewBuilder.ts`): `buildImportedLeaguePreview(normalized)` → `ImportPreviewResponse` (dataQuality with tier/signals, league summary, managers, rosterPositions, playerMap, counts).
- **POST /api/league/import/sleeper/preview**: Auth required; body `{ leagueId }`; runs pipeline + preview builder; returns preview or 400/404/500.
- **POST /api/league/create**: Schema extended with `createFromSleeperImport` (optional boolean) and `sleeperLeagueId` (optional string). When both set:
  - Check no existing league for user + platform sleeper + platformLeagueId.
  - Run `runImportedLeagueNormalizationPipeline(sleeperLeagueId)`; on failure return 404/500.
  - Create League with: name, sport, season, leagueSize, scoring, isDynasty, rosterSize, starters, avatarUrl, settings (from normalized), platform 'sleeper', platformLeagueId, importBatchId, importedAt.
  - Run `bootstrapLeagueFromSleeperImport(league.id, normalized)` (LeagueTeam, Roster, TeamPerformance).
  - Do **not** call `runPostCreateInitialization` for this path.
- **SleeperLeagueCreationBootstrapService** (`lib/league-import/sleeper/SleeperLeagueCreationBootstrapService.ts`): For each normalized roster: upsert LeagueTeam (externalId = source_team_id, ownerName, teamName, avatarUrl, wins, losses, ties, pointsFor, pointsAgainst, currentRank from standings); upsert Roster (platformUserId = source_manager_id, playerData = { players, starters, reserve, taxi, source_team_id, imported_at }). For each matchup week/matchup: upsert TeamPerformance (teamId, week, season, points, opponent, result).

---

## 4. Import preview design

- **Data quality**: Tier (FULL / PARTIAL / MINIMAL), completeness score (0–100), and signals (e.g. missing rosters, no trades, few matchup weeks) so the user knows what to expect.
- **League summary**: Name, sport, type (Dynasty/Redraft), team count, season, playoff teams, avatar; settings (PPR, Superflex, TEP, roster positions).
- **Managers**: List of display name, W-L-T, points for (and roster size / starters / players / reserve / taxi in the payload; UI shows a short list of managers with records and points).
- **Counts**: Draft picks, transactions, matchup weeks; player map size is implicit in resolution.
- **Create League from Import**: Single primary action after preview; creates the league with one API call and redirects.

Preview shape matches the expectations of the AF Legacy league transfer tool (league + managers + data quality + key counts).

---

## 5. Full UI click audit

Every Sleeper-import-related interaction is wired as follows. No dead buttons or broken transitions were found; the only fix applied was success redirect (see §7).

| Element | Component | Handler | API / behavior | Verification |
|--------|-----------|---------|----------------|--------------|
| **Build New League vs Import Existing League** | `LeagueCreationModeSelector` | `onChange` → `setCreationMode(mode)`; if `mode === 'create'` clears `importPreview` | N/A | Mode switch shows/hides import vs create form; preview cleared on switch to create. |
| **Import from (provider)** | `ImportProviderSelector` | `onChange` → `setImportProvider(p)`; clears `importPreview` | N/A | Sleeper selectable; ESPN/Yahoo/Fantrax/MFL disabled with “(coming soon)”. |
| **Sleeper League ID input** | `ImportSourceInputPanel` (Input) | `onSourceInputChange` → `setImportSourceInput` | N/A | Value drives Fetch & Preview enablement. |
| **Fetch & Preview** | `ImportSourceInputPanel` (Button) | `onFetchPreview` → `handleFetchImportPreview()` | `fetchImportPreview(provider, sourceInput)` → POST `/api/league/import/sleeper/preview` with `{ leagueId }` | Disabled when `!sourceInput.trim()` or `loading` or `disabled`. On success sets `importPreview`; on error toasts and leaves preview null. |
| **Preview section** | `ImportedLeaguePreviewPanel` | N/A (display only) | Data from `importPreview` (same shape as `ImportPreviewResponse` from `buildImportedLeaguePreview`) | Preview shows league, dataQuality, managers, rosterPositions, draftPickCount, transactionCount, matchupWeeks; matches normalization output. |
| **Continue / Back** | Implicit | Switching mode to “create” or changing provider/source | N/A | Back = select “Build New League” or change provider/ID; preview cleared appropriately. |
| **Create League from Import** | `ImportedLeaguePreviewPanel` (Button) | `onCreateFromImport` → `handleCreateFromImport()` | `submitImportCreation(provider, sourceInput, userId)` → POST `/api/league/create` with `createFromSleeperImport: true`, `sleeperLeagueId` | Disabled when `createFromImportLoading` or `!importPreview`. On success redirect to `/leagues/${data.league.id}`; on 409 toasts “already exists”; else toasts error. |
| **Validation (empty ID)** | `ImportSourceInputPanel` | Fetch button disabled when `!sourceInput.trim()` | — | User cannot submit empty; client-side trim in service returns error if empty. |
| **Retry** | Same as Fetch & Preview | Re-enter ID and click Fetch & Preview again | Same preview API | No dedicated Retry button; retry = change input + fetch again. |
| **Cancel** | Mode selector or navigate away | Set mode to “create” or leave page | N/A | No explicit Cancel button; cancel = switch to create or close. |
| **Success redirect** | `StartupDynastyForm` (setTimeout after toast) | After `submitImportCreation` or native create success | — | Redirects to **created AF league** at `/leagues/${data.league.id}`; fallback `/af-legacy` if no `league.id`. |

- **Preview data vs normalization**: Preview is built from the same `NormalizedImportResult` used for creation (`buildImportedLeaguePreview(normalized)`). Persisted league/teams/rosters come from the same normalized data via `bootstrapLeagueFromSleeperImport`; preview and created league are consistent.
- **Error handling**: 400 (missing ID), 401 (unauthorized), 404 (league not found), 409 (league already in account), 500 (normalization/server error) surface via toast; preview load and create buttons do not leave UI stuck.

---

## 6. QA findings

- **Native creation**: Unchanged; form and API path without `createFromSleeperImport` behave as before.
- **Import flow**: Preview API returns 404 for invalid Sleeper ID; preview builder produces valid payload; create-from-import path creates League with correct platform, importBatchId, importedAt, and populates LeagueTeam and Roster from normalized data.
- **Safe fallbacks**: Missing Sleeper fields (e.g. no avatar, no matchups) yield empty or default values in normalized result; preview signals indicate gaps (e.g. "No trade history available").
- **Source fields**: League stores platform ('sleeper'), platformLeagueId, importBatchId, importedAt; LeagueTeam uses externalId (source_team_id); Roster uses platformUserId (source_manager_id) and playerData with source_team_id and imported_at.

---

## 7. Issues fixed

- **Success redirect**: Previously both native create and create-from-import redirected to `/af-legacy` after success. Updated so that on success the user is sent into the **created AF league** at `/leagues/${data.league.id}` when `data.league.id` is present; otherwise fallback remains `/af-legacy`. Applied in `StartupDynastyForm` for both `handleSubmit` (native) and `handleCreateFromImport` (Sleeper import).
- Otherwise implementation was additive; native league creation and legacy transfer were not modified except for the extended create schema and new import path.

---

## 8. Final QA checklist

- [ ] **Native creation** — Create new AF league without import; sport, preset, name, platform, size, scoring, format apply; league and bootstrap run; redirect works.
- [ ] **Sleeper import during creation** — Choose Import → enter Sleeper League ID → Fetch & Preview → preview shows league, managers, data quality → Create League from Import → league is created with correct name, sport, size, rosters, and teams; redirect goes to created AF league (`/leagues/{id}`).
- [ ] **Settings and rosters** — Imported league settings (PPR, Superflex, TEP, playoff teams, roster size) and roster/team data (manager names, W-L-T, points, player lists) match source.
- [ ] **Source fields** — League has platform, platformLeagueId, importBatchId, importedAt; LeagueTeam has externalId; Roster has platformUserId and playerData with source_team_id.
- [ ] **Safe fallbacks** — Missing Sleeper data (e.g. no users, no matchups) does not break create; preview signals reflect gaps.
- [ ] **Existing league** — Creating from import when the same Sleeper league already exists for the user returns 409.

---

## 9. Explanation of Sleeper full league import during creation

**Sleeper full league import during creation** lets a user bring an existing Sleeper league into AllFantasy as part of the normal "create league" flow, instead of creating an empty league and linking or syncing later.

1. **Where it lives** — On the league creation screen, the user first chooses **Build New League** (manual setup) or **Import Existing League**. For import, they select **Sleeper** (other providers show “coming soon”), enter the **Sleeper League ID** (from the Sleeper app or URL), click **Fetch & Preview**, and the app loads league metadata, rosters, and data quality from the Sleeper API.

2. **What they see** — The **import preview** shows the league name, sport, type (Dynasty/Redraft), team count, season, data quality (FULL/PARTIAL/MINIMAL and a completeness score), any data gaps (e.g. no trades, few matchup weeks), and a list of managers with records and points. This mirrors what the AF Legacy league transfer tool shows so the experience is consistent.

3. **What gets created** — When the user clicks **Create League from Import**, the backend fetches the Sleeper league again, normalizes it with the same pipeline used in Prompt 22, creates a **League** record with name, sport, season, size, scoring, dynasty flag, settings, and avatar, and stores **source tracking** (platform, platformLeagueId, importBatchId, importedAt). It then runs **SleeperLeagueCreationBootstrapService**, which creates a **LeagueTeam** for each roster (with externalId, owner name, team name, avatar, wins/losses/ties, points) and a **Roster** for each manager (with platformUserId and playerData: players, starters, reserve, taxi). Where matchup data exists, it also creates **TeamPerformance** rows so weekly results are visible. No generic sport-default bootstrap is run for this path; the imported data is the source of truth, with safe fallbacks when Sleeper omits a field.

4. **Why it matters** — Users can start from a real Sleeper league in one flow: preview what will be imported, then create the AF league with teams, rosters, and history already populated. After creation they are redirected into the **created AF league** (`/leagues/{id}`). Source IDs are stored for future sync or audit, matching the quality expectations of the AF Legacy league transfer tool.
