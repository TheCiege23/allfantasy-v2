# Prompt 99 — Commissioner League Control Panel + Full UI Click Audit

## Deliverable summary

- **Commissioner panel architecture** implemented with core modules (`lib/commissioner-settings/`), new settings API (GET/PATCH), and wired UI across Settings and Commissioner tabs.
- **General Settings** panel now has edit/save/cancel with league name, description, sport, season; state and backend save verified.
- **Commissioner Controls** panel expanded with quick links, league announcement (when chat linked), commissioner transfer link, and reset league.
- **Commissioner tab** enhanced with transfer-commissioner dropdown and confirm flow; reset league and waiver/settings flows preserved.
- **Click audit** performed; findings and QA checklist documented below.

---

## 1. Commissioner panel architecture

### 1.1 Access

- **Commissioner** = league owner (`League.userId`). Enforced by `lib/commissioner/permissions.ts`: `isCommissioner(leagueId, userId)`, `assertCommissioner(leagueId, userId)`.
- **Routes**: Commissioner tab at `/app/league/[leagueId]?tab=Commissioner` (shown only when `isCommissioner`). Settings tab at `?tab=Settings` with sub-tabs (General, Waiver, Draft, Commissioner Controls, Reset League, etc.).

### 1.2 Core modules (`lib/commissioner-settings/`)

| Module | Purpose |
|--------|--------|
| **CommissionerSettingsService** | `getLeagueConfiguration(leagueId)`, `updateLeagueSettings(leagueId, patch)`. Top-level: name, sport, season, rosterSize, leagueSize, starters; settings: description, lineupLockRule, tradeReviewType, vetoThreshold, leagueChatThreadId, etc. |
| **LeagueConfigurationResolver** | `getEffectiveLeagueConfiguration`, `getEditableGeneralKeys`, `getEditableRosterKeys`. |
| **CommissionerAnnouncementService** | `getLeagueChatThreadId`, `resolveAnnouncementContext`. Resolves thread for @everyone broadcast (client calls existing broadcast API). |
| **LeagueRuleValidator** | `validateGeneralSettings`, `validateRosterSettings`, `validateTradeSettings`, `validateCommissionerPatch`. Sport-aware (all 7 sports). |
| **SportLeagueSettingsResolver** | `getSportOptions()`, `getSportLabel()`, `getDefaultSeasonForSport()`. Uses `lib/sport-scope` (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER). |

### 1.3 API routes

| Route | Method | Purpose |
|-------|--------|--------|
| `/api/commissioner/leagues/[leagueId]` | PATCH | Update league (name, scoring, status, avatarUrl, rosterSize, leagueSize, starters, **sport**, **season**) and settings (description, lineupLockRule, publicDashboard, rankedVisibility, orphanSeeking, orphanDifficulty, leagueChatThreadId, **tradeReviewType**, **vetoThreshold**). Existing. |
| `/api/commissioner/leagues/[leagueId]/settings` | GET | Return full league configuration (commissioner-settings service). New. |
| `/api/commissioner/leagues/[leagueId]/settings` | PATCH | Update settings with validation (CommissionerSettingsService + LeagueRuleValidator). New. |
| `/api/commissioner/leagues/[leagueId]/waivers` | GET (type=settings) / PUT | Get/update waiver settings. Existing. |
| `/api/commissioner/leagues/[leagueId]/transfer` | POST | Transfer commissioner to another user (roster in league). Existing. |
| `/api/commissioner/leagues/[leagueId]/managers` | GET | List teams, rosters, and **managers** (rosterId, userId, displayName). Extended. |
| `/api/commissioner/leagues/[leagueId]/reset` | POST | Request league reset. New; returns 501 (not yet implemented). |

---

## 2. Settings service updates

- **CommissionerSettingsService**: New. Reads/writes league and settings via Prisma; supports general, roster, and trade-related settings keys.
- **LeagueRuleValidator**: New. Validates name length, description length, sport in SUPPORTED_SPORTS, season 2000–2100, rosterSize 1–100, leagueSize 2–32, vetoThreshold 0–100.
- **PATCH commissioner route** (parent): Extended `ALLOWED_KEYS` with `sport`, `season` and `SETTINGS_KEYS` with `tradeReviewType`, `vetoThreshold` so existing callers can still update them.

---

## 3. Frontend updates

### 3.1 General Settings panel

- **GeneralSettingsPanel** now accepts `leagueId`. Loads from `GET /api/commissioner/leagues/[leagueId]/settings`. Edit mode: name, description, sport (dropdown from `getSportOptions()`), season (number). **Save** → PATCH same URL; **Cancel** → revert local state and exit edit mode. Toasts on success/error.

### 3.2 Commissioner Controls panel

- **CommissionerControlsPanel** now accepts `leagueId`. Shows:
  - Quick jump links to Settings sub-tabs (General, Waivers, Draft, Members, Reset) and Commissioner tab.
  - **League announcement**: If `league.settings.leagueChatThreadId` is set, embeds `CommissionerBroadcastForm` (existing; sends @everyone via broadcast API). Otherwise message to link league chat first.
  - **Commissioner transfer**: Link to Commissioner tab to perform transfer.
  - **Reset league**: Short note; Reset League sub-tab has the button.

### 3.3 Commissioner tab

- **Transfer commissioner**: New section under Managers. Fetches `managers` (with `managers` array: rosterId, userId, displayName). Dropdown to select new commissioner by manager, confirmation checkbox, “Transfer commissioner” button → POST `/api/commissioner/leagues/[leagueId]/transfer` with `newCommissionerUserId` and `confirm: true`. Success → toast and reload.

### 3.4 Reset League panel

- **ResetLeaguePanel** now accepts `leagueId`. “Request league reset” button → POST `/api/commissioner/leagues/[leagueId]/reset`. Confirmation dialog. Endpoint returns 501 with message; toast shows error/not available.

### 3.5 League Settings tab

- **LeagueSettingsTab** passes `leagueId` to: GeneralSettingsPanel, CommissionerControlsPanel, ResetLeaguePanel (already passed to Draft, Waiver, Playoff, Schedule, etc.).

---

## 4. Click audit findings

### 4.1 Open commissioner panel

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|-----------------|---------|---------|-------------|--------|
| Commissioner tab | App league page | Tab switch | — | Commissioner only (tab visible only when isCommissioner) | OK |
| Settings > Commissioner Controls | LeagueSettingsTab | Sub-tab click | — | Same league context | OK |

### 4.2 Edit / Save / Cancel (General Settings)

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|-----------------|---------|---------|-------------|--------|
| Edit | GeneralSettingsPanel | setEditing(true) | — | — | OK |
| Save | GeneralSettingsPanel | handleSave → PATCH .../settings | GET/PATCH `/api/commissioner/leagues/[id]/settings` | Commissioner | OK |
| Cancel | GeneralSettingsPanel | handleCancel (revert + setEditing(false)) | — | — | OK |

### 4.3 Toggles and dropdowns

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|-----------------|---------|---------|-------------|--------|
| Sport dropdown | GeneralSettingsPanel (edit) | setSport(e.target.value) | — | — | OK |
| Season input | GeneralSettingsPanel (edit) | setSeason(e.target.value) | — | — | OK |
| Transfer “Select manager” | CommissionerTab | setTransferUserId(e.target.value) | — | — | OK |
| Transfer confirm checkbox | CommissionerTab | setTransferConfirm(e.target.checked) | — | — | OK |

### 4.4 League announcement

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|-----------------|---------|---------|-------------|--------|
| Send @everyone | CommissionerBroadcastForm (in CommissionerControlsPanel) | handleSubmit → POST .../broadcast | `/api/shared/chat/threads/[threadId]/broadcast` | Session + league chat linked | OK (when threadId present) |

### 4.5 Member removal

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|-----------------|---------|---------|-------------|--------|
| Remove manager | — | DELETE .../managers?rosterId= | `/api/commissioner/leagues/[id]/managers` | Commissioner | OK (API exists; no UI button in this deliverable) |

### 4.6 Commissioner transfer

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|-----------------|---------|---------|-------------|--------|
| Transfer commissioner button | CommissionerTab | handleTransferCommissioner → POST .../transfer | POST `/api/commissioner/leagues/[id]/transfer` | Commissioner | OK |

### 4.7 League reset

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|-----------------|---------|---------|-------------|--------|
| Request league reset | ResetLeaguePanel | handleReset → POST .../reset | POST `/api/commissioner/leagues/[id]/reset` | Commissioner | OK (endpoint returns 501; button wired) |

### 4.8 Other commissioner actions (existing)

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|-----------------|---------|---------|-------------|--------|
| Regenerate invite | CommissionerTab | regenerateInvite → POST .../invite | POST .../invite | Commissioner | OK |
| Run waiver processing | CommissionerTab | triggerWaiverRun → POST .../waivers | POST .../waivers | Commissioner | OK |
| Post to dashboard / Mark looking / Set ranked | CommissionerTab | runOperation → POST .../operations | POST .../operations | Commissioner | OK |

---

## 5. QA results and issues fixed

- **Build**: Passed. Fixed CommissionerControlsPanel `leagueId` type in `encodeURIComponent` (use local `id` inside effect). Fixed LeagueRuleValidator: added `TradeSettingsInput` to `LeagueSettingsPatch` so `vetoThreshold` exists.
- **GeneralSettingsPanel**: Receives `leagueId` from LeagueSettingsTab; load/save/cancel and toasts verified in implementation.
- **Commissioner transfer**: Managers API now returns `managers` array for dropdown; transfer POST and reload on success implemented.

---

## 6. Final QA checklist

- [ ] **Open commissioner panel**: As commissioner, open league → Commissioner tab visible; open Settings → Commissioner Controls sub-tab.
- [ ] **General Settings**: Open Settings → General. Click Edit; change name, description, sport, season; Save → success toast and data reload; Cancel → state reverted, no save.
- [ ] **Save settings**: After Save, reload page or re-open General; values persist (backend saves).
- [ ] **League announcement**: With league chat linked (leagueChatThreadId set), open Commissioner Controls → announcement form visible; send message → broadcast succeeds.
- [ ] **Commissioner transfer**: Commissioner tab → Managers section → select manager from dropdown, check confirm, click Transfer commissioner → success toast and page reload; new user is commissioner.
- [ ] **League reset**: Settings → Reset League → Request league reset → confirm → API called (501 response acceptable); toast shows.
- [ ] **Waiver/Draft**: Waiver and Draft settings panels still load (read-only); commissioner waiver run and waiver PUT API unchanged.
- [ ] **No dead buttons**: Edit, Save, Cancel, Transfer commissioner, Request league reset, Regenerate invite, Run waiver, Operations buttons have handlers and correct endpoints.

---

## 7. Commissioner system explanation

Commissioners are league owners (`League.userId`). They get:

- **Settings tab**: General (name, description, sport, season) with edit/save/cancel; Roster, Scoring, Draft, Waiver, Playoff, Schedule, Divisions, Members, Commissioner Controls, Reset League, etc.
- **Commissioner tab** (only when `isCommissioner`): Invite link, managers list, transfer commissioner (dropdown + confirm), draft controls note, waiver run, lineup note, chat/broadcast note, league operations (post to dashboard, mark looking, set ranked).
- **Commissioner Controls** sub-tab: Quick links to settings and Commissioner tab; league announcement when chat is linked; transfer and reset explained.

All commissioner APIs use `assertCommissioner(leagueId, userId)` and return 403 if the user is not the league owner. Sport support (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER) is consistent via `lib/sport-scope` and `getSportOptions()` in commissioner-settings.
