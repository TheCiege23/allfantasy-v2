# Prompt 102 — Feature Toggle / Platform Configuration System

## Deliverable summary

- **Architecture**: Platform-wide feature toggles stored in DB (`PlatformConfig`); admins enable/disable features without deployment. Core modules: `FeatureToggleService` (read/write), `PlatformConfigResolver` (resolve enabled state with 30s cache; invalidated on update).
- **Admin API**: GET/PATCH `/api/admin/config`; public GET `/api/config/features` for app to read current toggles.
- **Admin UI**: New "Feature toggles" tab with sections (AI features, Tools, Platform, Experimental) and Sports availability; each toggle calls PATCH and refreshes; sports use checkboxes + "Save sports".
- **Behavior**: Brackets page uses `areBracketChallengesEnabled()` — when disabled, shows "Bracket challenges are temporarily disabled". Toggles take effect immediately (cache invalidated on PATCH).

---

## 1. Feature toggle architecture

### 1.1 Primary goal

Allow admins to enable or disable features globally without code deployment.

**Examples implemented:**

- AI assistant
- Mock drafts
- Legacy mode
- Bracket challenges
- Sports availability (which sports are enabled)
- Tools: Waiver AI, Trade analyzer, Rankings
- Experimental: Legacy import, Dynasty

### 1.2 Storage

- **Model**: `PlatformConfig` — `id`, `key` (unique), `value` (text), `updatedAt`.
- **Keys**: `feature_ai_assistant`, `feature_mock_drafts`, `feature_legacy_mode`, `feature_bracket_challenges`, `feature_tool_waiver_ai`, `feature_tool_trade_analyzer`, `feature_tool_rankings`, `feature_experimental_legacy_import`, `feature_experimental_dynasty`, `sports_availability` (JSON array of sport codes).
- **Values**: Boolean toggles use `"true"` / `"false"`. Sports use JSON array e.g. `["NFL","NBA"]`. Missing key = use default (defaults in code: most features on, sports = all).

### 1.3 Core modules

| Module | Role |
|--------|------|
| **FeatureToggleService** | `getValue(key)`, `setValue(key, value)`, `getBoolean(key)`, `setBoolean(key, enabled)`, `getStringArray(key)`, `setStringArray(key, arr)`, `getFeatureTogglesSnapshot()` (all toggles + sports + raw). Defines `FEATURE_KEYS` and boolean defaults. |
| **PlatformConfigResolver** | `invalidateConfigCache()`, `isAIAssistantEnabled()`, `isMockDraftsEnabled()`, `isLegacyModeEnabled()`, `areBracketChallengesEnabled()`, `getEnabledSports()`, `isSportEnabled(sport)`, `isFeatureEnabled(key)`, tool/experimental helpers, `getPlatformConfigSnapshot()`. Uses 30s in-memory cache; cache invalidated on admin PATCH. |

---

## 2. Feature Toggle Panel (UI)

### 2.1 Sections

- **AI features**: AI assistant (toggle).
- **Tools**: Mock drafts, Waiver AI, Trade analyzer, Rankings (toggles).
- **Platform**: Legacy mode, Bracket challenges (toggles).
- **Experimental**: Experimental legacy import, Experimental dynasty (toggles).
- **Sports availability**: Checkboxes per sport (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER); "Save sports" to apply.

### 2.2 Controls

- **Refresh**: GET `/api/admin/config` → replace snapshot.
- **Toggle switch (per feature)**: PATCH `/api/admin/config` body `{ key, value: true|false }` → invalidate cache → GET snapshot → toast; list re-renders.
- **Sports checkboxes**: Local state; "Save sports" → PATCH body `{ sports: string[] }` → invalidate cache → GET snapshot → toast.

---

## 3. UI click audit

| Control | Handler | API | Result |
|--------|---------|-----|--------|
| Refresh | `load()` | GET `/api/admin/config` | Snapshot updated; toggles/sports reflect DB. |
| Feature switch (on/off) | `setToggle(key, enabled)` | PATCH `/api/admin/config` `{ key, value }` | Config updated; cache invalidated; snapshot refetched; toast. |
| Sport checkbox | `setPendingSports(next)` | — | Local state only. |
| Save sports | `saveSports(currentSports)` | PATCH `/api/admin/config` `{ sports }` | `sports_availability` updated; cache invalidated; snapshot refetched; toast. |

All toggles and Save sports are wired; backend configuration updates correctly.

---

## 4. Backend configuration updates

- **Admin PATCH** updates `platform_config` and calls `invalidateConfigCache()`.
- **Next read** (GET admin config or GET `/api/config/features`) recomputes snapshot from DB.
- **App code** that uses resolver (e.g. `areBracketChallengesEnabled()`) gets new value within 30s or immediately after any PATCH (cache cleared).

---

## 5. QA requirements and results

### 5.1 Verify toggles update system behavior immediately

- **Bracket challenges**: Disable "Bracket challenges" in Admin → Feature toggles. Open `/brackets` (or refresh). Page shows "Bracket challenges are temporarily disabled" and Back to dashboard. Re-enable; refresh `/brackets`; full brackets UI returns.
- **Other toggles**: Stored in DB and returned by GET `/api/admin/config` and GET `/api/config/features`. App code can call `isAIAssistantEnabled()`, `isMockDraftsEnabled()`, `getEnabledSports()`, etc., to gate AI, mock drafts, and sport-specific flows; behavior updates on next request after admin change (and cache TTL or invalidation).

### 5.2 QA checklist

- [ ] Admin → Feature toggles tab loads; sections and toggles visible.
- [ ] Toggle a feature off → PATCH sent; snapshot updates; switch shows off.
- [ ] Toggle same feature on → PATCH sent; snapshot updates; switch shows on.
- [ ] Uncheck a sport, click Save sports → PATCH with reduced list; snapshot shows updated sports.
- [ ] Disable Bracket challenges → visit `/brackets` → disabled message. Re-enable → full page.
- [ ] GET `/api/config/features` returns `features` and `sports`; no auth required.

---

## 6. File reference

- **Schema**: `prisma/schema.prisma` — `PlatformConfig`.
- **Migration**: `prisma/migrations/20260333000000_add_platform_config/migration.sql`.
- **Lib**: `lib/feature-toggle/FeatureToggleService.ts`, `PlatformConfigResolver.ts`, `index.ts`.
- **Admin API**: `app/api/admin/config/route.ts` (GET, PATCH).
- **Public API**: `app/api/config/features/route.ts` (GET).
- **Admin UI**: `app/admin/components/AdminFeatureToggles.tsx`; tab "features" in `AdminLayout` and `app/admin/page.tsx`.
- **Behavior wiring**: `app/brackets/page.tsx` uses `areBracketChallengesEnabled()` to show disabled state when off.
