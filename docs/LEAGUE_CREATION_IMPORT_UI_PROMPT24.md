# League Creation Import UI for All Providers + Sleeper First (Prompt 24)

## 1. Import UI architecture

The league creation screen supports two modes selected at the top:

- **Build New League** — Manual setup: sport, preset, name, platform, size, scoring, format (unchanged).
- **Import Existing League** — User picks a provider (Sleeper, ESPN, Yahoo, Fantrax, MFL), enters provider-specific source input (e.g. Sleeper League ID), fetches a preview, then creates the AF league from the import.

The UI is **provider-ready**: all five providers appear in the selector; only **Sleeper** is wired end-to-end. Others show “(coming soon)” and a graceful “not yet available” message when selected.

### Flow

1. **LeagueCreationModeSelector** — Choice: “Build New League” or “Import Existing League”.
2. If **Import**: **ImportProviderSelector** — Dropdown: Sleeper, ESPN, Yahoo, Fantrax, MFL (Sleeper first; others disabled with “coming soon”).
3. **ImportSourceInputPanel** — For Sleeper: League ID input + “Fetch & Preview”. For others: message “Import from [X] is not yet available.”
4. User clicks **Fetch & Preview** → **LeagueCreationImportSubmissionService.fetchImportPreview(provider, sourceInput)** → preview stored in state.
5. **ImportedLeaguePreviewPanel** — Shows sport, league name, source provider, data quality, settings (roster, scoring, playoff, draft), historical data availability, managers/teams with logos, and “Create League from Import”.
6. User clicks **Create League from Import** → **LeagueCreationImportSubmissionService.submitImportCreation(provider, sourceInput, userId)** → redirect on success.

### Core modules

| Module | Role |
|--------|------|
| **LeagueCreationModeSelector** | UI: “Build New League” vs “Import Existing League”. |
| **ImportProviderSelector** | UI: provider dropdown (Sleeper, ESPN, Yahoo, Fantrax, MFL); unavailable providers disabled with “(coming soon)”. |
| **ImportSourceInputPanel** | Provider-specific input: Sleeper = League ID + Fetch button; others = “not yet available” message. |
| **ImportedLeaguePreviewPanel** | Expanded preview: sport, league name, source provider, data quality, roster/scoring/playoff/draft settings, historical data, managers & teams with avatars, draft/transaction/matchup counts, and Create button. |
| **LeagueCreationImportSubmissionService** | Client-side: `fetchImportPreview(provider, sourceInput)` and `submitImportCreation(provider, sourceInput, userId)`. Sleeper calls existing APIs; other providers return `{ ok: false, error }` for graceful failure. |

Provider availability is driven by **provider-ui-config** (`IMPORT_PROVIDER_UI_OPTIONS`, `isImportProviderAvailable`), kept in sync with backend `hasFullAdapter()` (Sleeper only for now).

---

## 2. Frontend component updates

- **LeagueCreationModeSelector** (new): Select with “Build New League” and “Import Existing League”. Replaces previous mode selector labels; type `CreationMode` remains `'create' | 'import'`.
- **ImportProviderSelector** (new): Select with all five providers; options for ESPN, Yahoo, Fantrax, MFL are disabled and show “(coming soon)”.
- **ImportSourceInputPanel** (new): Renders per-provider: for Sleeper, League ID input + “Fetch & Preview”; for others, an info box that “Import from [Provider] is not yet available.”
- **ImportedLeaguePreviewPanel** (new): Provider-agnostic preview panel. Displays:
  - **Sport, league name, source provider** (header with optional league avatar).
  - **Data quality** (tier, score, signals).
  - **Settings**: roster positions, scoring (PPR/Superflex/TEP), playoff teams, draft pick count.
  - **Historical data**: “Previous seasons available” or “No previous seasons”.
  - **Managers & teams**: list with avatars, display name, W-L-T, points.
  - **Counts**: draft picks, transactions, matchup weeks.
  - **Create League from Import** button.
- **SleeperImportPreviewPanel**: Retained for backward compatibility; can be deprecated in favor of ImportedLeaguePreviewPanel.
- **StartupDynastyForm**:
  - Uses **LeagueCreationModeSelector** instead of the old import selector.
  - When mode is Import: **ImportProviderSelector** (default Sleeper), **ImportSourceInputPanel**, **ImportedLeaguePreviewPanel**.
  - State: `importProvider` (default `'sleeper'`), `importSourceInput`, `importPreview`, loading flags.
  - Fetch preview via **fetchImportPreview(importProvider, importSourceInput)**; submit via **submitImportCreation(importProvider, importSourceInput, userId)**.
  - Native “Build New League” form unchanged (sport selector, preset selector, settings preview, platform, name, size, scoring, submit).

---

## 3. Backend workflow integration updates

- No new backend routes. Existing endpoints used:
  - **POST /api/league/import/sleeper/preview** — body `{ leagueId }`; used when `provider === 'sleeper'`.
  - **POST /api/league/create** — when `createFromSleeperImport: true` and `sleeperLeagueId`, create-from-import path runs (Prompt 23).
- **LeagueCreationImportSubmissionService** (client-only) maps provider + input to these APIs; for non-Sleeper providers it returns `{ ok: false, error }` without calling the backend, so unsupported providers fail gracefully in the UI.
- Imported creation still goes through AF validation and bootstrap (SleeperLeagueCreationBootstrapService); preview data shape matches **ImportPreviewResponse** from the existing import normalization pipeline.

---

## 4. QA findings

- **Native league creation**: Unchanged; “Build New League” path and submit flow work as before.
- **Import mode toggles cleanly**: Switching to Import shows provider selector and source input; switching back to Build hides them and clears preview.
- **Sleeper**: Provider selected by default; League ID + Fetch & Preview loads preview; expanded panel shows sport, name, settings, managers with avatars, source provider; Create League from Import submits and redirects.
- **Unsupported providers**: Selecting ESPN, Yahoo, Fantrax, or MFL shows “(coming soon)” in the dropdown and the “not yet available” message in ImportSourceInputPanel; no fetch is attempted; no crash.
- **Preview vs created data**: Preview content (league name, sport, managers, settings) is produced by the same normalization pipeline used on create, so values shown in the preview match the created league.

---

## 5. Issues fixed

- None reported; implementation was additive. Existing league creation and Sleeper import (Prompt 23) behavior preserved; only labels and structure were refactored for provider-ready UX.

---

## 6. Final QA checklist

- [ ] **Native creation** — “Build New League” selected; sport, preset, name, platform, size, scoring, format work; submit creates league and redirects.
- [ ] **Import mode** — “Import Existing League” selected; provider dropdown shows Sleeper (first), ESPN, Yahoo, Fantrax, MFL with “(coming soon)” where applicable.
- [ ] **Sleeper import** — Sleeper selected; enter League ID; Fetch & Preview loads preview; preview shows sport, league name, source provider, settings, managers with logos, historical data note; Create League from Import succeeds and redirects.
- [ ] **Unsupported provider** — Select ESPN (or Yahoo, Fantrax, MFL); message indicates not yet available; no fetch; no error thrown.
- [ ] **Preview matches created league** — After creating from Sleeper import, league name, sport, team count, and manager/team data match the preview.

---

## 7. Explanation of league creation import UI

The **league creation import UI** is the part of the league creation flow that lets users **import an existing league** from an external platform instead of building one from scratch.

1. **Choice of mode** — At the top of the form, the user chooses **Build New League** (manual setup) or **Import Existing League**. That choice determines whether they see the classic sport/preset/name/size form or the import path.

2. **Provider-ready design** — When they choose Import, they see a single **import provider** list: **Sleeper, ESPN, Yahoo, Fantrax, MyFantasyLeague (MFL)**. Sleeper is implemented first and is the only one that is fully wired (preview + create). The others appear in the list as “(coming soon)” and show a clear “not yet available” message so the UX is ready when those integrations are added.

3. **Source input and preview** — For Sleeper, the user enters the **Sleeper League ID** and clicks **Fetch & Preview**. The app then shows an **import preview** that includes sport, league name, source provider, data quality, roster/scoring/playoff/draft settings, historical data availability, and managers/teams with logos. This matches the backend import normalization output and sets expectations for what will be created.

4. **Create from import** — A single **Create League from Import** button submits the request. The client uses **LeagueCreationImportSubmissionService** so that only Sleeper calls the real APIs; other providers return a friendly error without calling the server. Imported leagues still go through AF validation and the same bootstrap rules (e.g. SleeperLeagueCreationBootstrapService) so the created league is consistent and valid.

5. **No breakage to normal creation** — The “Build New League” path is unchanged: same sport selector, preset selector, settings preview, and submission flow. Only the mode selector labels and the import branch were added or refactored to support multiple providers with Sleeper first.
