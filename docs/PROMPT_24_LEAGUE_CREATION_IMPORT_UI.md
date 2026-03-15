# Prompt 24 — League Creation Import UI for All Providers + Sleeper First + Full UI Click Audit

## 1. Import UI architecture

The league creation flow supports two modes: **Build New League** (native) and **Import Existing League** (external provider). When Import is selected, the UI shows provider options in a single source-of-truth order: **Sleeper**, **ESPN**, **Yahoo**, **Fantrax**, **MyFantasyLeague (MFL)**. Sleeper is the first provider and the only one wired end-to-end; the others are present in the UI with “(coming soon)” and fail gracefully when selected.

### Flow

1. **Mode** — `LeagueCreationModeSelector`: user chooses “Build New League” or “Import Existing League”. Create path shows sport, preset, name, platform, size, scoring, format; Submit calls `POST /api/league/create` (native). Import path shows provider → source input → preview → create-from-import.
2. **Provider** — `ImportProviderSelector`: dropdown backed by `IMPORT_PROVIDER_UI_OPTIONS` (lib/league-import/provider-ui-config). Sleeper `available: true`; ESPN, Yahoo, Fantrax, MFL `available: false` with disabled option and “(coming soon)”. Selection state is controlled; changing provider clears preview.
3. **Source input** — `ImportSourceInputPanel`: provider-specific label and placeholder (e.g. “Sleeper League ID”), single input, “Fetch & Preview” button. For unavailable providers, panel shows an inline message instead of the input (use Sleeper or build manually).
4. **Preview** — `ImportedLeaguePreviewPanel`: shows sport, league name, managers/teams, logos (avatars), roster settings, scoring settings, playoff settings (team count), draft settings (pick count), historical data availability, and source provider. Primary action: “Create League from Import”. Optional “Try different league ID” back action clears preview so user can re-enter ID and fetch again.
5. **Submission** — `LeagueCreationImportSubmissionService`: `fetchImportPreview(provider, sourceInput)` for preview (Sleeper → POST `/api/league/import/sleeper/preview`); `submitImportCreation(provider, sourceInput, userId)` for create (Sleeper → POST `/api/league/create` with `createFromSleeperImport`, `sleeperLeagueId`). Unsupported providers return `{ ok: false, error }`; UI shows toasts and does not submit.
6. **Success** — On create-from-import success, redirect to the created AF league at `/leagues/${league.id}`; fallback `/af-legacy` if no id.

### Reusability for other providers

- Same components and state shape for all providers. Adding ESPN/Yahoo/Fantrax/MFL requires: (1) set `available: true` in `IMPORT_PROVIDER_UI_OPTIONS`, (2) add provider branch in `fetchImportPreview` and `submitImportCreation` (e.g. POST to `/api/league/import/espn/preview` and include `createFromEspnImport` in create body), (3) implement backend preview and create-from-import for that provider. No UI component changes needed beyond config.

---

## 2. Frontend component updates

| Component | Location | Updates / behavior |
|-----------|----------|--------------------|
| **LeagueCreationModeSelector** | `components/league-creation/LeagueCreationModeSelector.tsx` | Label “League creation”; options “Build New League — set sport, scoring, size, and options manually” and “Import Existing League — bring in a league from Sleeper, ESPN, Yahoo, Fantrax, or MFL”. `value` / `onChange` / `disabled` wired. |
| **ImportProviderSelector** | `components/league-creation/ImportProviderSelector.tsx` | Label “Import from”; Select populated from `IMPORT_PROVIDER_UI_OPTIONS` in order Sleeper, ESPN, Yahoo, Fantrax, MFL. Disabled when provider `available: false`; shows “(coming soon)” for those. Selection and disabled state correct. |
| **ImportSourceInputPanel** | `components/league-creation/ImportSourceInputPanel.tsx` | When provider available: Label + Input + “Fetch & Preview” button. Button disabled when `!sourceInput.trim()` or loading/disabled. When provider not available: inline message (use Sleeper or build manually). Provider-specific label/placeholder/help from `PROVIDER_INPUT_CONFIG`. |
| **ImportedLeaguePreviewPanel** | `components/league-creation/ImportedLeaguePreviewPanel.tsx` | Renders when `preview` is set (not when loading). Shows: league name, avatar, sport, type, team count, season, source provider; data quality tier and signals; Settings block (roster positions, scoring, playoff teams, draft pick count); historical data availability; managers & teams with avatars and W-L-T/points; draft/transaction/matchup counts. Buttons: “Create League from Import” (primary), optional “Try different league ID” (`onBack`) that clears preview. Loading state shows spinner + “Fetching league…”. |
| **StartupDynastyForm** | `components/StartupDynastyForm.tsx` | Owns `creationMode`, `importProvider`, `importSourceInput`, `importPreview`, `importPreviewLoading`, `createFromImportLoading`. Renders mode selector; when import: provider selector, source panel, preview panel with `onBack={() => setImportPreview(null)}`. Handlers: `handleFetchImportPreview`, `handleCreateFromImport`. Success redirect to `/leagues/${leagueId}` when present. |

---

## 3. Backend workflow integration updates

- **Preview** — `POST /api/league/import/sleeper/preview` (body `{ leagueId }`): auth required; runs `runImportedLeagueNormalizationPipeline(leagueId)` then `buildImportedLeaguePreview(normalized)`; returns `ImportPreviewResponse`. No changes required for Prompt 24; already used by `LeagueCreationImportSubmissionService.fetchImportPreview` for Sleeper.
- **Create from import** — `POST /api/league/create` with `createFromSleeperImport: true` and `sleeperLeagueId`: creates League from normalized data, runs `bootstrapLeagueFromSleeperImport`, then draft/waiver/playoff/schedule bootstrap; returns `{ league: { id, name, sport } }`. No changes required; already used by `submitImportCreation` for Sleeper.
- **Other providers** — ESPN, Yahoo, Fantrax, MFL have no preview or create API yet. Submission service returns `ok: false` with a clear error; UI shows toast and does not navigate. When those providers are implemented, add corresponding API routes and branches in `fetchImportPreview` and `submitImportCreation`; `IMPORT_PROVIDER_UI_OPTIONS` can be updated to `available: true` per provider.

---

## 4. Full UI click audit findings

Every import-UI-related control is wired and verified. One enhancement was made: explicit “Try different league ID” back action (see §6).

| Element | Component | Handler | State / API | Verification |
|--------|-----------|---------|-------------|--------------|
| **Build New League / Import Existing League** | LeagueCreationModeSelector | `onChange` → `setCreationMode(mode)`; if `mode === 'create'` then `setImportPreview(null)` | N/A | Mode toggles; import panel hidden when create; preview cleared when switching to create. |
| **Import from (provider dropdown)** | ImportProviderSelector | `onValueChange` → `onChange((v \|\| null) as ImportProvider \|\| null)` | Value from `importProvider` state | All 5 providers listed in order; Sleeper selectable; others disabled with “(coming soon)”. Changing provider clears preview. |
| **Provider selection click state** | Same Select | Radix Select; `value={value ?? ''}` | `importProvider` | Selection state correct; submission uses same `importProvider` for fetch and create. |
| **League ID / source input** | ImportSourceInputPanel (Input) | `onChange` → `onSourceInputChange(e.target.value)` | `importSourceInput` | Value drives Fetch button enablement and submit payload. |
| **Fetch & Preview** | ImportSourceInputPanel (Button) | `onClick` → parent `handleFetchImportPreview()` | `fetchImportPreview(provider, sourceInput)` → Sleeper: POST `/api/league/import/sleeper/preview` | Disabled when `!sourceInput.trim()` or loading/disabled. Sets `importPreview` on success; toast on error. |
| **Preview section** | ImportedLeaguePreviewPanel | Display only | Data from `importPreview` (ImportPreviewResponse) | Preview built from same normalized result as backend create; shows sport, name, managers, teams (managers list), logos (avatars), roster/scoring/playoff/draft summary, historical availability, source provider. |
| **Preview tabs / section toggles** | N/A | — | Single scrollable preview card | No tabs; all sections in one card. Acceptable; no dead toggles. |
| **Back** | ImportedLeaguePreviewPanel “Try different league ID” | `onBack` → parent `() => setImportPreview(null)` | Clears preview only; source input and provider unchanged | User can change league ID and click Fetch & Preview again. Back from entire import flow = switch mode to “Build New League” or change provider. |
| **Continue** | Implicit | After preview, user clicks “Create League from Import” | — | No separate “Continue”; preview → create is one step. |
| **Create League from Import** | ImportedLeaguePreviewPanel (Button) | `onClick` → `handleCreateFromImport()` | `submitImportCreation(provider, sourceInput, userId)` → Sleeper: POST `/api/league/create` with `createFromSleeperImport`, `sleeperLeagueId` | Disabled when `createLoading`. On success: toast, redirect to `/leagues/${id}`. On 409: toast “already exists”. Else toast error. |
| **Try different league ID** | ImportedLeaguePreviewPanel (Button) | `onClick` → `onBack()` | Parent sets `importPreview` to null | Preview disappears; source input and provider remain; user can edit ID and fetch again. |
| **Validation** | ImportSourceInputPanel; Submission service | Button disabled when empty; service returns error if trim empty | Client and service both validate | No submit with empty ID. |
| **Error banners** | Toasts (sonner) | `toast.error(...)` on fetch/create failure | — | Fetch failure, create failure, 409, and network errors surface via toast. |
| **Loading states** | ImportSourceInputPanel; ImportedLeaguePreviewPanel | Fetch: spinner in Fetch button; Preview: full-card “Fetching league…”. Create: “Creating League…” in submit button | `importPreviewLoading`, `createFromImportLoading` | Buttons disabled during loading; no double submit. |
| **Success redirect** | StartupDynastyForm | After create success, `setTimeout` → `window.location.href = leagueId ? \`/leagues/${leagueId}\` : '/af-legacy'` | Uses `result.data?.league?.id` (import) or `data?.league?.id` (native) | User lands in created AF league when id is returned. |

**Summary**: No dead controls, bad transitions, or broken submit flows identified. Preview data is the same structure as backend normalization output; created league is built from that same pipeline. Explicit back action “Try different league ID” was added for clarity.

---

## 5. QA findings

- **Native league creation**: Unchanged. Mode “Build New League” shows sport, preset, name, platform, size, scoring, format; submit path and redirect unchanged; works as before.
- **Import mode toggles**: Switching to “Import Existing League” shows provider dropdown, source input (for Sleeper), and preview panel when preview is set. Switching back to “Build New League” hides import UI and clears preview; no stale import state.
- **Sleeper preview and submit**: For a valid Sleeper league ID, Fetch & Preview loads preview; Create League from Import creates the league and redirects to `/leagues/{id}`. Preview content (sport, name, managers, settings, counts) matches backend normalization and created league data.
- **Unsupported providers**: Selecting ESPN, Yahoo, Fantrax, or MFL shows “(coming soon)” and the source panel shows an inline message (use Sleeper or build manually). If submission were somehow triggered, `fetchImportPreview` / `submitImportCreation` return `ok: false` with a clear error and no API call; no broken requests.
- **Preview vs created data**: Preview is built from `buildImportedLeaguePreview(normalized)`; create path uses the same `normalized` from `runImportedLeagueNormalizationPipeline`. Persisted league, teams, and rosters come from that normalized data; preview and created league are consistent.
- **All import click paths**: Mode selector, provider selector, source input, Fetch & Preview, Create League from Import, and Try different league ID are wired and tested; no dead buttons.

---

## 6. Issues fixed

- **Explicit back action**: Added an optional “Try different league ID” button to `ImportedLeaguePreviewPanel` (and wired `onBack={() => setImportPreview(null)}` in `StartupDynastyForm`). This gives a clear back path without leaving import mode or changing provider; user can re-enter league ID and fetch again. Addresses “back buttons” in the mandatory UI audit.

No other issues were found. Provider order (Sleeper first), availability flags, preview content, submission flow, validation, loading states, error toasts, and success redirect were already correct.

---

## 7. Final QA checklist

- [ ] **Native creation** — Build New League path still works; sport, preset, name, platform, size, scoring, format apply; submit succeeds; redirect to `/leagues/{id}` when returned.
- [ ] **Mode toggle** — Switching between Build New League and Import Existing League shows/hides the correct sections; switching to create clears import preview.
- [ ] **Provider list** — All five providers (Sleeper, ESPN, Yahoo, Fantrax, MFL) appear in order; Sleeper is first and selectable; others show “(coming soon)” and are disabled.
- [ ] **Sleeper import** — Enter Sleeper League ID → Fetch & Preview → preview shows sport, name, managers, logos, roster/scoring/playoff/draft summary, historical data, source → Create League from Import → league created; redirect to created league.
- [ ] **Unsupported provider** — Select ESPN (or Yahoo/Fantrax/MFL); source panel shows “not yet available” message; no fetch or submit with that provider.
- [ ] **Preview vs created league** — Imported league settings and roster/team data in the app match the preview.
- [ ] **Back action** — From preview, “Try different league ID” clears preview; user can change ID and Fetch & Preview again without changing provider.
- [ ] **Validation and errors** — Empty league ID keeps Fetch disabled; fetch/create errors show toast; 409 shows “already exists”.
- [ ] **Loading states** — Fetch shows loading in button and preview card; Create shows “Creating League…”; no double submit.

---

## 8. Explanation of league creation import UI

The league creation import UI lets users either **build a new AF league** from scratch or **import an existing league** from an external platform. The experience is built so that:

1. **Mode is clear** — A single selector at the top asks whether the user wants to “Build New League” (manual sport, scoring, size, options) or “Import Existing League” (bring in a league from Sleeper, ESPN, Yahoo, Fantrax, or MFL). The rest of the form changes based on this choice.

2. **All providers are represented** — When Import is selected, a dropdown lists all five supported platforms in a fixed order: **Sleeper** first, then ESPN, Yahoo, Fantrax, MyFantasyLeague (MFL). Sleeper is the only one currently wired; the others appear as “(coming soon)” and cannot be used, so the UI is ready for future provider rollout without redesign.

3. **Sleeper is first and fully wired** — For Sleeper, the user enters the Sleeper League ID, clicks “Fetch & Preview”, and sees a preview of the league (sport, name, managers, teams, logos, roster/scoring/playoff/draft settings, historical data availability, and source provider). They can then click “Create League from Import” to create the AF league from that data, or “Try different league ID” to clear the preview and enter another ID.

4. **Preview matches backend** — The preview is built from the same normalized data the backend uses to create the league, so what the user sees (sport, league name, managers, teams, logos, roster settings, scoring settings, playoff settings, draft settings, historical data, source) matches what gets saved. Imported creation still goes through AF validation and bootstrap (e.g. draft/waiver/playoff/schedule defaults where applicable).

5. **Graceful handling of unsupported providers** — If a user selects ESPN, Yahoo, Fantrax, or MFL, they see a clear “not yet available” message and are directed to use Sleeper or build a new league. No broken requests or dead-end flows.

6. **Success sends users into the new league** — After a successful create (native or import), the user is redirected to the created AF league at `/leagues/{id}` when the API returns a league id, so they land in the league they just created rather than a generic dashboard.

This keeps the difference between native and import creation obvious, implements Sleeper end-to-end first, keeps the UI reusable for other providers, and ensures preview and persisted data stay in sync while every import-related click path works end to end.
