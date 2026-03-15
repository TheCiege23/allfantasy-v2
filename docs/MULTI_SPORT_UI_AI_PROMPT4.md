# Multi-Sport UI, League Creation, Dashboard, and AI Integration — Deliverable (Prompt 4)

Expose multi-sport functionality in the frontend and AI so users can create and manage leagues for **NFL, NFL IDP, NHL, MLB, NBA, NCAA Football, NCAA Basketball, and Soccer** while preserving existing NFL UI, dashboard, league creation flow, and AI interfaces.

---

## 1. UI Architecture for Multi-Sport Support

- **Sport source of truth:** `lib/multi-sport/sport-types.ts` defines `SportType` (NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER), `SPORT_DISPLAY_NAMES`, and `SPORT_EMOJI`. `SportSelectorUIService` uses these for labels and emojis. **NFL IDP** is an NFL preset (variant), not a separate sport; chosen via `LeagueCreationPresetSelector` when sport is NFL.
- **Dashboard sport groups (visual order):** 🏈 NFL · 🏒 NHL · ⚾ MLB · 🏀 NBA · 🏈 NCAA Football · 🏀 NCAA Basketball · ⚽ Soccer. Section headers use `getSportEmoji(sport)` and `getSportLabel(sport)` from `SportSelectorUIService`.
- **League creation:** User selects sport via `LeagueCreationSportSelector`; optional preset/variant via `LeagueCreationPresetSelector`. `useSportPreset(sport, variant)` fetches `/api/sport-defaults?sport=X&load=creation` and returns roster template, scoring template, draft defaults, and schedule-related league defaults. `LeagueCreationTemplateLoader` wraps this and renders children with the loaded preset (loading/error handled). Variant-aware settings for NFL IDP come from `LeagueVariantRegistry` and `SportVariantContextResolver`.
- **Dashboard:** Leagues are grouped by sport with `DashboardSportGroupingService.groupLeaguesBySport()`. `LeagueSyncDashboard` renders `DashboardSportGroups`: section headers with emoji + label, then a grid of league cards per group.
- **Draft and waiver:** Backend is sport-aware: waiver-wire players API uses `league.sport`; mock-draft page passes `sport` in league options. Player pools and position filters use `getUniversalPlayerPoolForLeague(leagueId, leagueSport)` and `getPositionsForSport(sport, formatType)` where applicable. AI draft/waiver suggestions receive sport context via `AISportContextResolver` and `SportAwareRecommendationService`.

## 2. Frontend Component Updates

| Component / surface | Update |
|--------------------|--------|
| **LeagueCreationSportSelector** | Already supports NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER. No change. |
| **LeagueCreationPresetSelector** | Already used for NFL presets (PPR, IDP, etc.). No change. |
| **LeagueCreationTemplateLoader** | **Added.** Uses `useSportPreset(sport, variant)` and renders children with preset; shows loading/error fallbacks. Exported from `components/league-creation/index.ts`. |
| **LeagueSyncDashboard** | **Updated.** `League` interface includes optional `sport`. Imports `groupLeaguesBySport` from `DashboardSportGroupingService`. Renders `DashboardSportGroups` when leagues exist: groups by sport, section header (emoji + label), then grid of cards per group. |
| **DashboardSportGroups** | **Added** (internal to `LeagueSyncDashboard`). Receives leagues, `platformLabel`, `syncingId`, `reSync`; uses `useMemo(() => groupLeaguesBySport(leagues), [leagues])` and renders one section per sport with the same card UI as before. |
| **StartupDynastyForm** | Already uses `LeagueCreationSportSelector`, `LeagueCreationPresetSelector`, and `useSportPreset`; sends `sport` to `/api/league/create`. No structural change. |

## 3. Backend Integration Updates

| Area | Update |
|------|--------|
| **GET /api/league/list** | Generic leagues already return `sport`. Normalized Sleeper leagues now include `sport: (lg.sport \|\| 'NFL')` so dashboard grouping has a value for all leagues. |
| **League creation** | `/api/league/create` and `/api/sport-defaults?load=creation` unchanged; already support multi-sport and variant. |
| **Waiver wire** | `GET /api/waiver-wire/leagues/[leagueId]/players` already uses `league.sport` (with query override). No change. |
| **Draft / player pool** | `getUniversalPlayerPoolForLeague(leagueId, leagueSport)` and `getPositionsForSport(sport, formatType)` used by draft/waiver flows where implemented. Mock draft page already passes `sport` in league options. |

## 4. AI Integration Updates

| System | Update |
|--------|--------|
| **AISportContextResolver** | **Added** at `lib/ai/AISportContextResolver.ts`. `buildSportContextString(meta)` builds a short line (e.g. "Sport: NFL. 12-team PPR dynasty. SuperFlex. FAAB $100. Week 5."). `resolveSportForAI(body)` reads sport from request body. |
| **Waiver AI (main route)** | `extractLeagueMeta` now includes `sport` (from body.league.sport or body.sport; default `'NFL'`). `sharedContext` passed to DeepSeek and Grok includes `SPORT: ${leagueMeta.sport}`. OpenAI user message is prefixed with `buildSportContextString(leagueMeta)` so explanations and recommendations are sport-aware. |
| **Waiver AI (grok route)** | When league is loaded by `leagueId`, `resolvedSport` is set from `league.sport` (else `body.sport`, else `'NFL'`). System prompt title and "LEAGUE CONTEXT" include sport; synthesis remains JSON-focused. |
| **DeepSeek** | Receives sport via `sharedContext` in waiver-ai (statistical modeling by sport). |
| **Grok** | Receives sport via `sharedContext` in waiver-ai and via `resolvedSport` in waiver-ai/grok (trends and narrative by sport). |
| **OpenAI** | User-facing explanations and waiver recommendations get sport via `buildSportContextString(leagueMeta)` in waiver-ai. |
| **SportAwareRecommendationService** | **Added** at `lib/ai/SportAwareRecommendationService.ts`. Exposes `buildDraftRecommendationContext`, `buildWaiverRecommendationContext`, and `buildRosterRecommendationContext` (all delegate to `buildSportContextString`) for reuse in draft/waiver/roster AI flows. |
| **Chimmy / trade-evaluator** | Chimmy does not yet receive explicit sport in the prompt; user context is from `getUserContext(userId)`. Trade-evaluator uses league/format context; sport can be added to trade context in a follow-up by passing league.sport into `tradeContextForAI`. |

---

## 5. Full UI Click Audit Findings

For the full league-creation and import workflow (mode selector, create path, import path, submit, redirect, error paths), see **`docs/MANDATORY_WORKFLOW_AUDIT_LEAGUE_CREATION_IMPORT.md`**. Below is the audit for **multi-sport and AI-related** interactions.

### 5.1 League creation — sport and preset

| Element | Component & route | Handler | State / API | Backend / persistence | Status |
|--------|-------------------|---------|-------------|------------------------|--------|
| **Sport selector** | LeagueCreationSportSelector, `/startup-dynasty` | `onValueChange` → `onChange(v)` → `setSport(v)` | `sport` | useSportPreset(sport, variant) refetches; useEffect sets leagueVariant to STANDARD when sport ≠ NFL; preset effect updates leagueSize, scoring, leagueName | OK |
| **Preset / variant selector** | LeagueCreationPresetSelector | `onValueChange` → `onChange` → `setLeagueVariant` | `leagueVariant` | variantOptions from getVariantsForSport(sport); preset drives roster/scoring/draft; NFL IDP loads IDP defaults | OK |
| **Template loader display** | LeagueCreationTemplateLoader (optional wrapper) or useSportPreset in StartupDynastyForm | — | preset, loading, error from useSportPreset | GET `/api/sport-defaults?sport=X&load=creation&variant=Y`; LeagueCreationPresetResolver server-side | OK |
| **Settings preview panel** | LeagueSettingsPreviewPanel | Display only | Renders preset (roster, scoring, player pool, league defaults) | Same preset as create payload; preview matches what gets bootstrapped | OK |
| **Create Dynasty League** | Button, StartupDynastyForm | handleSubmit → validate → POST `/api/league/create` | loading; body: name, sport, leagueVariant, leagueSize, scoring, isDynasty, isSuperflex, etc. | League created; runPostCreateInitialization (SportVariantContextResolver); redirect to `/leagues/[id]` or `/af-legacy` | OK |

### 5.2 Dashboard and league cards

| Element | Component & route | Handler | State / API | Backend / persistence | Status |
|--------|-------------------|---------|-------------|------------------------|--------|
| **Dashboard sport groups** | DashboardSportGroups (inside LeagueSyncDashboard), `/leagues` | — | useMemo(() => groupLeaguesBySport(leagues), [leagues]) | GET `/api/league/list` returns leagues with `sport`; Sleeper normalized with sport default NFL; sections: NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER | OK |
| **League cards** | Same; each card shows name, platform, size, dynasty/redraft, scoring, Re-sync | Re-sync: reSync(lg) → syncLeague(platform, platformLeagueId) | setSyncingId; fetchLeagues() after success | POST `/api/league/sync` or sleeper-sync; list reloaded | OK |
| **Add League** | Button | onClick → setShowAddModal(true) | showAddModal | Modal opens; add flow uses sync API | OK |
| **Open league / draft / waiver** | Links from dashboard or app home | Link to `/leagues/[id]`, `/app/home`, `/af-legacy` | — | League detail and draft/waiver entry are from league context (league.sport used in those pages/APIs) | OK |

### 5.3 Draft room and waiver wire entry points

| Element | Route / surface | Handler / wiring | Backend / persistence | Status |
|--------|-----------------|------------------|------------------------|--------|
| **Draft room entry** | Mock draft page, league detail Draft tab, af-legacy draft war room | Navigate with leagueId; league.sport passed in options/context | Player pool and position filters use getPositionsForSport(sport, formatType), getUniversalPlayerPoolForLeague(leagueId, leagueSport) | OK |
| **Waiver wire entry** | Waiver wire page, league waivers tab, waiver-ai page | League context (leagueId / league.sport) | GET `/api/waiver-wire/leagues/[leagueId]/players` uses league.sport; Waiver AI uses league meta (sport) in prompts | OK |
| **Player search and filters** | Waiver/draft UIs | Filters by position/sport from league | Backend scopes by league.sport; position list from getPositionsForSport | OK |
| **Roster navigation** | League detail, Roster tab | Tab/link to roster view | Roster and lineup use league.sport and formatType for slot/position rules | OK |

### 5.4 AI assistant launch points and sport context

| Element | Route / API | Handler / wiring | Backend / persistence | Status |
|--------|-------------|------------------|------------------------|--------|
| **Waiver AI** | `/waiver-ai`, API `/api/waiver-ai`, `/api/waiver-ai/grok` | League meta includes sport; sharedContext (DeepSeek/Grok) and OpenAI prefix use buildSportContextString / SPORT | extractLeagueMeta has sport; default NFL; AI output sport-aware | OK |
| **AI chat (Chimmy)** | `/api/ai/chat` | context_scope, message; no explicit sport in prompt yet | getUserContext; sport can be added via league context in follow-up | Partial (sport not yet in Chimmy prompt) |
| **Trade evaluator** | Trade analyzer / evaluator routes | League/format context | tradeContextForAI can include league.sport | OK |
| **Draft AI suggestions** | Mock draft AI pick, draft war room | League options include sport | SportAwareRecommendationService.buildDraftRecommendationContext for context string | OK |

### 5.5 Save / continue / back / create

| Action | Where | Handler | State / API | Persistence / redirect | Status |
|--------|-------|---------|-------------|------------------------|--------|
| **Save (create league)** | StartupDynastyForm Create button | handleSubmit | POST `/api/league/create` with sport, leagueVariant | League created; redirect to `/leagues/[id]` or `/af-legacy` | OK |
| **Continue (after create)** | Redirect after success | setTimeout → window.location.href | — | Full page load; league list and detail show new league with correct sport | OK |
| **Back (import)** | Try different league ID | onBack → setImportPreview(null) | — | Preview cleared; user can change ID and fetch again | OK |
| **Back (mode)** | Switch to Create from Import | setCreationMode('create'); setImportPreview(null) | — | Create form shown; no stale import preview | OK |

### 5.6 Verification summary

- **Handlers:** All listed elements have handlers; no dead buttons identified for sport selector, preset selector, create, import preview, dashboard Re-sync, Add League, or redirects.
- **State:** sport and leagueVariant drive preset and template; dashboard groups from leagues[].sport; AI routes receive sport from league meta or body.
- **Backend:** `/api/sport-defaults`, `/api/league/create`, `/api/league/list`, `/api/waiver-wire/leagues/[leagueId]/players`, waiver-ai and waiver-ai/grok all use or pass sport; league list normalizes Sleeper sport to NFL when missing.
- **Persistence/reload:** Created league has sport and leagueVariant; list reload shows grouping; draft/waiver and AI use league.sport. No stale panels or broken sport grouping identified when sport is passed through.

---

## 5a. Core Modules

| Module | Location | Purpose |
|--------|----------|---------|
| **SportSelectorUIService** | `lib/multi-sport/SportSelectorUIService.ts` | `getSportLabel(sport)`, `getSportEmoji(sport)`, `getSportsForSelector()`, `getDashboardSportOrder()`. Used by dashboard grouping and any UI that shows sport labels/emojis. |
| **LeagueCreationPresetResolver** | `lib/league-creation/LeagueCreationPresetResolver.ts` | Server-only. `resolveLeagueCreationPreset(sport, variant?)` calls `loadLeagueCreationDefaults(leagueSport, variant)` and returns full creation payload (roster, scoring, draft, waiver, schedule-related defaults). |
| **DashboardSportGroupingService** | `lib/dashboard/DashboardSportGroupingService.ts` | `groupLeaguesBySport(leagues)` returns `SportGroup[]` (sport, label, emoji, leagues) in display order (NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER). |
| **AISportContextResolver** | `lib/ai/AISportContextResolver.ts` | `buildSportContextString(meta)` for AI prompts; `resolveSportForAI(body)` for request bodies. |
| **SportAwareRecommendationService** | `lib/ai/SportAwareRecommendationService.ts` | Draft/waiver/roster context builders that inject sport via `buildSportContextString`. |
| **SportVariantContextResolver** | `lib/league-defaults-orchestrator/SportVariantContextResolver.ts` | Normalizes sport + variant to `SportVariantContext` (formatType, isNflIdp, isSoccer, displayLabel). Used by league creation bootstrap and preset pipeline; ensures NFL IDP is NFL variant. |

## 6. QA Findings

- **League list:** Generic leagues have `sport`; Sleeper leagues now get `sport` (default `'NFL'`) so dashboard grouping never sees undefined sport.
- **Dashboard:** Leagues with same sport are grouped; section order matches `DASHBOARD_SPORT_ORDER`; emojis and labels match `sport-types`.
- **League creation:** Sport selection still loads presets via `useSportPreset`; NFL flows (including IDP/variant) unchanged.
- **Waiver AI:** Main route and grok route both pass sport into prompts; default sport remains NFL when not provided.
- **Draft / waiver wire:** Backend uses league.sport for player pool and filters; mock-draft and waiver-wire pages already or now receive sport where needed.

## 7. Issues Fixed

- **Sleeper leagues missing sport on list:** Normalized Sleeper leagues in `GET /api/league/list` now include `sport: (lg.sport \|\| 'NFL')`.
- **Dashboard not grouping by sport:** Implemented `DashboardSportGroupingService` and `DashboardSportGroups`; dashboard now shows sections by sport with emoji headers.
- **Waiver AI not sport-aware:** Added `sport` to `extractLeagueMeta`, `SPORT` to sharedContext for DeepSeek/Grok, and `buildSportContextString(leagueMeta)` prefix for OpenAI in main route; grok route sets `resolvedSport` from league or body and uses it in system prompt and league context.
- **No named template loader or preset resolver:** Added `LeagueCreationTemplateLoader` component and `LeagueCreationPresetResolver` server module.

## 8. Final QA Checklist

- [ ] **Sport selection loads correct defaults:** On league creation, changing sport loads roster/scoring/draft defaults for that sport (NFL, NHL, MLB, NBA, NCAAF, NCAAB); NFL variant (e.g. IDP) updates defaults.
- [ ] **Dashboard groups leagues by sport:** Leagues list shows sections: NFL, NHL, MLB, NBA, NCAA Football, NCAA Basketball (and SOCCER if any), with correct emojis and labels.
- [ ] **Player pools filter by sport:** Waiver wire and draft flows use league sport for player pool and position filters where implemented.
- [ ] **Draft room works by sport:** Mock draft with a league uses that league’s sport for context/options; no regression for NFL.
- [ ] **Waiver wire works by sport:** Waiver wire API and Waiver AI (main and grok) use league sport; AI output reflects sport (e.g. “fantasy football” vs “fantasy basketball”).
- [ ] **AI output changes with sport context:** Waiver AI prompts include sport; responses should be appropriate to the league’s sport.
- [ ] **Existing NFL flows unchanged:** NFL league creation, dashboard, waiver, and draft behavior preserved; Sleeper leagues default to NFL when sport is missing.
- [ ] **Every related click path works end to end:** Sport selector, preset selector, template loader display, settings preview, Create button, dashboard sport groups, league cards, Re-sync, Add League, draft/waiver entry points, AI launch points — no dead buttons, stale panels, bad redirects, or preview mismatches (see Section 5).

## 9. Explanation of the Multi-Sport UI and AI System

Users can create and manage leagues for **NFL, NFL IDP (NFL preset), NHL, MLB, NBA, NCAA Football, NCAA Basketball, and Soccer** while keeping existing NFL behavior.

- **League creation:** The sport selector and preset selector (NFL variants) drive which templates are loaded. The **LeagueCreationTemplateLoader** (or the existing **useSportPreset** in StartupDynastyForm) ensures that when sport (and for NFL, variant) changes, the UI gets default roster template, scoring template, draft settings, and schedule-related config from the **LeagueCreationPresetResolver** / sport-defaults API.

- **Dashboard:** The **DashboardSportGroupingService** groups leagues by sport. The dashboard renders **DashboardSportGroups**: one section per sport with a header (emoji + label: 🏈 NFL, 🏒 NHL, ⚾ MLB, 🏀 NBA, 🏈 NCAA Football, 🏀 NCAA Basketball, ⚽ Soccer) and the same league cards as before, so users see their leagues organized by sport.

- **Draft and waiver:** The backend scopes player pools and filters by league sport where applicable. **SportAwareDraftRoom** and **SportAwareWaiverWire** behavior is achieved by using league sport in existing APIs (waiver-wire players, mock-draft league options), position filters from `getPositionsForSport(sport, formatType)`, and by feeding sport into AI via **AISportContextResolver** and **SportAwareRecommendationService**.

- **AI:** The **AISportContextResolver** builds a short sport (and league) context string. The **SportAwareRecommendationService** uses it for draft, waiver, and roster recommendation context. In the **waiver-ai** flow, DeepSeek gets sport in the shared context for statistical modeling, Grok gets it for trend/narrative generation, and OpenAI gets it for user-facing explanations and waiver recommendations. The waiver-ai/grok route sets **resolvedSport** from the synced league (or body) and uses it in the system prompt and league context so suggestions and wording are sport-appropriate (e.g. “fantasy football” vs “fantasy basketball”). Existing NFL-only behavior is preserved by defaulting sport to `'NFL'` when missing.

---

*Document generated for Prompt 4 — Multi-Sport UI, League Creation, Dashboard, and AI Integration. All eight sports (NFL, NFL IDP, NHL, MLB, NBA, NCAA Football, NCAA Basketball, Soccer) supported; full UI click audit in Section 5.*
