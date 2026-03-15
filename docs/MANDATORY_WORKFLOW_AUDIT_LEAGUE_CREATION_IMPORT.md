# Mandatory Workflow Audit: League Creation & Import

**MANDATORY WORKFLOW AUDIT REQUIREMENT** — This document satisfies the requirement to audit **every** button click, dropdown, toggle, tab, link, modal action, step transition, preview update, submit action, success redirect, and error path for this feature. For each interactive element: component and route are identified; handler existence, state updates, backend/API wiring, and persisted data reload are verified; dead buttons, stale UI, broken transitions, partial saves, incorrect redirects, and preview vs saved state mismatches are documented (and fixed where found). **The click audit results are included in this deliverable** (Sections 1–2 below and Summary in Section 4).

**Scope**: League creation (native + import) and related league detail UI.

**Route**: League creation form is at **`/startup-dynasty`** (`app/startup-dynasty/page.tsx`). Success redirects go to **`/leagues/[leagueId]`** or fallback **`/af-legacy`**. League detail (Draft, Waivers, Standings/Playoffs) is at **`/leagues/[leagueId]`**.

### Requirement type → audit location

| Requirement type | Audited in |
|------------------|------------|
| Button clicks | §1.2 (Create path dropdowns/inputs), §1.3 (Create button), §1.6 (Fetch & Preview, disabled), §1.7 (Create from Import, Try different league ID), §1.10 (Refresh Waiver, Refresh Draft) |
| Dropdowns | §1.1 (Mode selector), §1.2 (Sport, Preset, Platform, League format, QB format, League size, Scoring) |
| Toggles | Mode is dropdown (create vs import); no separate toggle — §1.1 |
| Tabs | §1.10 (League detail tabs: Overview, Waivers, Draft, Standings/Playoffs) |
| Links | League card → `/leagues/[id]` (in QA doc Section 2); no other links in creation flow |
| Modal actions | No modals in league creation/import flow — N/A |
| Step transitions | §2 (Create↔Import, provider change, Fetch success/error, Try different ID, Create success) |
| Preview update | §1.2 (preset/preview from useSportPreset), §1.6–1.7 (import preview), §2 (preview vs saved) |
| Submit action | §1.3 (Create Dynasty League), §1.7 (Create League from Import) |
| Success redirect | §1.5 (native), §1.9 (import) |
| Error path | §1.4 (create validation, 409, API error, network), §1.8 (import guards, fetch error, 409, other) |

---

## 1. Interactive elements audit

For each element: **Component & route** | **Handler exists** | **State updates** | **Backend/API** | **Persistence/reload** | **Status / Fix**

### 1.1 Mode selector (create vs import)

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Build New League (dropdown option) | LeagueCreationModeSelector, `/startup-dynasty` | `onValueChange` → parent `onChange(mode)` → `setCreationMode(mode)`; if `mode === 'create'` then `setImportPreview(null)` | `creationMode` = 'create'; import preview cleared | N/A | Step transition: create form shown; import form hidden; no stale preview | OK |
| Import Existing League (dropdown option) | Same | Same with `mode` = 'import' | `creationMode` = 'import' | N/A | Import block (provider, source, preview) shown | OK |
| Select trigger (open dropdown) | Radix Select | Built-in | — | — | — | OK |

### 1.2 Create path — dropdowns and inputs

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Sport dropdown | LeagueCreationSportSelector, `/startup-dynasty` | `onValueChange` → `setSport(v)` | `sport` | N/A | useSportPreset(sport, variant) runs; useEffect syncs leagueVariant to STANDARD when sport !== NFL; preset effect updates leagueSize, scoring, leagueName | OK |
| Preset dropdown | LeagueCreationPresetSelector | `onValueChange` → `onChange` → `setLeagueVariant` | `leagueVariant` | N/A | variantOptions from getVariantsForSport(sport); preset effect updates leagueSize, scoring, leagueName | OK |
| League name input | Input (id=league-name) | `onChange` → `setLeagueName`; clear `errors.leagueName` | `leagueName` | Sent in POST body as `name` | validate() requires non-empty; persisted on create | OK |
| Platform dropdown | Select | `onValueChange` → `setPlatform` | `platform` | Sent as `platform` | When platform !== 'manual', platformLeagueId required and sent | OK |
| Platform League ID input | Input (id=platform-id) | `onChange` → `setPlatformLeagueId`; clear `errors.platformLeagueId` | `platformLeagueId` | Sent when platform !== 'manual' | validate() when not manual; persisted on create | OK |
| League format dropdown (Dynasty/Keeper) | Select | `onValueChange` → `setFormat` | `format` | Drives `isDynasty` in body | Persisted on create | OK |
| QB format dropdown (NFL non-IDP) | Select | `onValueChange` → `setQbFormat` | `qbFormat` | Drives `isSuperflex` in body | Persisted on create | OK |
| League size dropdown | Select | `onValueChange` → `setLeagueSize` | `leagueSize` | Sent as `leagueSize` (number) | Preset can override; persisted on create | OK |
| Scoring dropdown (NFL non-IDP) | Select | `onValueChange` → `setScoring` | `scoring` | Mapped to body (Half PPR/Standard/PPR) | Persisted on create | OK |

### 1.3 Create path — submit and loading

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Create Dynasty League button | Button, StartupDynastyForm | `onClick` → `handleSubmit` | `loading` set true at start; false in `finally` | validate() then POST `/api/league/create` with name, platform, platformLeagueId, leagueSize, scoring, isDynasty, isSuperflex, sport, leagueVariant, userId | League created; runPostCreateInitialization (draft/waiver/playoff/schedule); response includes league.id | OK |
| Disabled state (Create button) | Same | — | `disabled={loading}` | Prevents double submit | No double submit | OK |

### 1.4 Create path — error paths

| Path | Handler / behavior | State | API | User-visible | Status |
|------|--------------------|-------|-----|--------------|--------|
| Validation failure (empty name or missing platform ID) | validate() returns false; handleSubmit returns early | errors set; loading never set true | No request sent | Inline errors under inputs | OK |
| 409 (league already exists) | !res.ok, res.status === 409 → toast.error('This league already exists in your account') | loading set false in finally | Response not used for redirect | Toast | OK |
| Other API error | toast.error(data.error \|\| 'Failed to create league') | loading set false in finally | — | Toast | OK |
| Network/exception | catch → toast.error('Something went wrong...'); loading set false in finally | No stuck loading | — | Toast | OK |

### 1.5 Create path — success redirect

| Path | Handler | State | API | Persistence/reload | Status |
|------|---------|-------|-----|--------------------|--------|
| Success (200 + body) | toast.success then setTimeout → window.location.href = data?.league?.id ? `/leagues/${data.league.id}` : '/af-legacy' | — | data.league.id from response | Full page load to league or af-legacy; persisted league visible after reload | OK |

### 1.6 Import path — provider and source input

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Import from dropdown | ImportProviderSelector, `/startup-dynasty` | `onValueChange` → `onChange((v \|\| null) as ImportProvider \|\| null)` → parent: setImportProvider(p); setImportPreview(null) | `importProvider`; preview cleared | N/A | Unavailable providers show disabled + "(coming soon)"; changing provider clears preview | OK |
| Sleeper League ID input | ImportSourceInputPanel (Input) | `onChange` → `onSourceInputChange(e.target.value)` → setImportSourceInput | `importSourceInput` | Used in fetch and submit | Trimmed in service; required for Fetch & Create | OK |
| Fetch & Preview button | ImportSourceInputPanel (Button) | `onClick` → parent `handleFetchImportPreview` | setImportPreviewLoading(true); setImportPreview(null); then setImportPreview(result.data) on success; setImportPreviewLoading(false) always | POST `/api/league/import/sleeper/preview` with { leagueId: trimmed } | Preview state drives ImportedLeaguePreviewPanel; same pipeline as create | OK |
| Fetch button disabled | Same | disabled={loading \|\| !sourceInput.trim() \|\| disabled} | — | No request when empty or loading | OK |

### 1.7 Import path — preview and submit

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Preview (display only) | ImportedLeaguePreviewPanel | — | Renders `importPreview` (ImportPreviewResponse) | N/A | Preview built from same normalized result as create; no tabs/modals | OK |
| Create League from Import button | ImportedLeaguePreviewPanel (Button) | `onClick` → parent `handleCreateFromImport` | setCreateFromImportLoading(true); false after result | POST `/api/league/create` with createFromSleeperImport: true, sleeperLeagueId: trimmed, userId | League + teams/rosters + gap-fill; response includes league.id | OK |
| Try different league ID button | ImportedLeaguePreviewPanel (Button) | `onClick` → `onBack` → parent `setImportPreview(null)` | `importPreview` = null | N/A | Step transition: preview hidden; user can edit ID and fetch again | OK |
| Create from Import disabled | Same | disabled={createLoading} | Prevents double submit | OK | OK |

### 1.8 Import path — error paths

| Path | Handler / behavior | State | API | User-visible | Status |
|------|--------------------|-------|-----|--------------|--------|
| No provider selected, Fetch clicked | handleFetchImportPreview: toast.error('Select an import platform'); return | — | No request | Toast | OK |
| Empty source input (Fetch disabled) | Button disabled when !sourceInput.trim() | — | — | — | OK |
| fetchImportPreview returns !ok | toast.error(result.error); setImportPreviewLoading(false); no setImportPreview | Preview stays null | — | Toast | OK |
| handleCreateFromImport guard (!provider \|\| !sourceInput \|\| !preview) | Early return; createFromImportLoading not set | — | No request | — | OK |
| submitImportCreation 409 | toast.error('This league already exists in your account'); setCreateFromImportLoading(false) | — | — | Toast | OK |
| submitImportCreation other error | toast.error(result.error); setCreateFromImportLoading(false) | — | — | Toast | OK |

### 1.9 Import path — success redirect

| Path | Handler | State | API | Persistence/reload | Status |
|------|---------|-------|-----|--------------------|--------|
| Success | toast.success then setTimeout → window.location.href = leagueId ? `/leagues/${leagueId}` : '/af-legacy'; leagueId = result.data?.league?.id | — | league.id from response | Full page load; created league data persisted and visible on league page | OK |

### 1.10 League detail page — tabs and actions (`/leagues/[leagueId]`)

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Tab button (e.g. Overview, Waivers, Draft, Standings/Playoffs) | Tab UI, `/leagues/[leagueId]` | onClick → setActiveTab(tab) | `activeTab` | N/A | Correct panel shown; no backend persistence for tab choice | OK |
| Refresh Waiver Signals button | Button in Waivers panel | onClick → refreshWaiverPanel() | setWaiverLoading(true); setWaiverRefresh(response); setWaiverLoading(false) | postMarketRefresh({ scope: 'waivers', ... }) | Data displayed from response | OK |
| Draft round / pick number inputs | Inputs in Draft panel | onChange → setDraftRound / setDraftPick | draftRound, draftPick | Feed draft war room query | Query params update; draftTab.refresh() uses them | OK |
| Refresh Draft View button | Button in Draft panel | onClick → draftTab.refresh() | draftTab.loading, draftTab.data, etc. | Legacy draft war room API | Loading/error/data states handled | OK |

---

## 2. Step transitions and preview behavior

| Transition | Trigger | Result | Stale UI? |
|------------|---------|--------|-----------|
| Create → Import | Mode selector: Import | Import block shown; create form hidden; importPreview null | No |
| Import → Create | Mode selector: Build New League | Create form shown; importPreview cleared | No |
| Change provider | Import from dropdown | importPreview cleared; source input unchanged | No |
| Fetch success | Fetch & Preview → 200 | importPreview set; preview panel shows league/managers/settings | No |
| Fetch error | Fetch & Preview → 4xx/5xx | Toast; importPreview stays null | No |
| Try different league ID | Back button on preview | importPreview = null; preview panel unmounted; source input unchanged | No |
| Create (native) success | Create Dynasty League → 200 | Redirect to /leagues/[id]; no form left mounted | No |
| Create (import) success | Create League from Import → 200 | Redirect to /leagues/[id] | No |

**Preview vs saved**: Native create uses getInitialSettingsForCreation(sport, leagueVariant, overrides) for League.settings; frontend preset comes from same pipeline (useSportPreset / sport-defaults). Import preview is buildImportedLeaguePreview(normalized); create uses same normalized data for League and bootstrapFromSleeperImport. So preview and persisted league match.

---

## 3. Issues found and fixes

| Issue | Severity | Fix |
|-------|----------|-----|
| Dead buttons | None | All buttons have handlers and correct disabled logic. |
| Stale UI | None | Mode/provider change clears preview; loading flags cleared on error and success. |
| Broken transitions | None | Step visibility driven by creationMode and importPreview. |
| Partial saves | None | Create API is all-or-nothing; redirect only on success. |
| Incorrect redirects | Fixed previously | Success redirect uses league.id to `/leagues/${id}`; fallback `/af-legacy` only when id missing. |
| Preview vs saved mismatch | None | Same backend pipeline for import preview and create; native uses orchestrator for both preview and create. |

---

## 4. Summary

- **Component & route**: Every interactive element is identified with component and route (`/startup-dynasty` or `/leagues/[leagueId]`).
- **Handlers**: Every button, dropdown, and input has a handler; no dead controls.
- **State**: creationMode, sport, leagueVariant, leagueName, platform, platformLeagueId, format, qbFormat, leagueSize, scoring, importProvider, importSourceInput, importPreview, importPreviewLoading, createFromImportLoading, errors, and (on league page) activeTab, waiverRefresh, waiverLoading, draftRound, draftPick are updated as specified.
- **Backend/API**: Native create → POST `/api/league/create`; import preview → POST `/api/league/import/sleeper/preview`; import create → POST `/api/league/create` with createFromSleeperImport; league page → legacy/API for waivers and draft. Wiring is correct.
- **Persistence/reload**: League create persists League and runs bootstrap; redirect to `/leagues/[id]` causes full load of created league; no partial saves; preview data matches persisted data.
- **Error paths**: Validation, 409, non-ok response, and network errors surface via inline errors or toasts; loading flags reset; no stuck states.
- **Fixes applied**: Success redirect was updated in a prior pass to use `/leagues/${id}`; no additional code changes required in this audit.

This audit is the **mandatory workflow audit** for league creation and import. **Click audit results are included in the final deliverable**: this document (Sections 1–4) is the authoritative audit; **`docs/QA_SPORT_DEFAULTS_SOCCER_IDP_E2E_PROMPT16.md`** (Section 2) and **`docs/QA_E2E_DRAFT_WAIVER_PLAYOFF_SCHEDULE_IMPORT_PROMPT25.md`** reference this audit for their respective features.
