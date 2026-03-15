# Multi-Sport Core Architecture — Deliverable (Prompt 1)

## 1. Multi-sport architecture plan

### Goal

Convert the NFL-first architecture into a **reusable multi-sport engine** that supports:

- **NFL**
- **NFL IDP** (NFL variant / preset)
- **NHL**
- **MLB**
- **NBA**
- **NCAA Football (NCAAF)**
- **NCAA Basketball (NCAAB)**
- **Soccer (SOCCER)**

Existing NFL functionality is preserved; the platform is **sport-agnostic at the core** and uses configuration-driven services keyed by `sport_type` (or `LeagueSport` enum). NFL IDP is treated as an NFL variant, not a separate sport; Soccer is a first-class sport.

### Principles

- **Single code path:** No duplicated sport-specific copies; shared modules take `sport` or `sportType` and branch via config.
- **Canonical sport:** All core fantasy behavior derives sport from the **league** (e.g. `league.sport`). Entities that are league-scoped (rosters, matchups, drafts, waivers) do not duplicate a sport column; they get sport from `league.sport`. Standalone entities (e.g. players, templates) carry `sport` / `sportType` where they are not tied to a single league.
- **Configuration over code:** Sport definitions (positions, default format, display name, emoji) live in **SportRegistry** and related config; roster and scoring live in **templates** keyed by `(sportType, formatType)`.
- **NFL unchanged:** League creation, roster logic, player DB, scoring engine, matchup engine, draft engine, waiver system, AI analysis, and dashboard grouping continue to work for NFL; new modules are used when resolving by league so NFL uses the same pipeline with NFL defaults.

### Supported sport types

| Sport   | Code  | Display           | Default format | Notes |
|---------|------|-------------------|----------------|-------|
| NFL     | NFL  | NFL               | PPR            | Variants: STANDARD, PPR, HALF_PPR, SUPERFLEX, IDP, DYNASTY_IDP (LeagueVariantRegistry). |
| NFL IDP | NFL  | NFL IDP           | IDP            | Variant/preset of NFL; formatType 'IDP' for roster/scoring. |
| NHL     | NHL  | NHL               | standard       | |
| MLB     | MLB  | MLB               | standard       | |
| NBA     | NBA  | NBA               | points         | |
| NCAA Football | NCAAF | NCAA Football | PPR    | |
| NCAA Basketball | NCAAB | NCAA Basketball | points | |
| Soccer  | SOCCER | Soccer          | standard       | First-class sport; positions GKP, DEF, MID, FWD, UTIL. |

### High-level flow

1. **League creation:** User or API selects sport → `getLeagueCreationPreset(leagueSport)` (or sport-defaults API) returns default roster + scoring template and metadata → league is created with `sport: LeagueSport` → bootstrap attaches roster config and scoring by `(sport, format)`.
2. **Roster:** Roster template and validation come from `MultiSportRosterService` / `RosterTemplateService` by `league.sport` (and optional format, e.g. IDP). Positions and slot rules come from **SportRegistry** and template definitions.
3. **Scoring:** Effective rules come from `MultiSportScoringResolver` / `ScoringTemplateResolver` by `league.sport` (and format); league overrides merge on top.
4. **Player pool & draft/waiver:** Filter by `league.sport` so each league only sees players and options for its sport.
5. **Schedule:** `MultiSportScheduleResolver` returns week/round semantics and total weeks by sport.
6. **Dashboard:** Leagues are grouped by `league.sport`; display uses **SportRegistry** / **SportConfigResolver** for labels and emoji.

---

## 2. Schema additions and entity updates

### LeagueSport enum (Prisma)

```prisma
enum LeagueSport {
  NFL
  NHL
  MLB
  NBA
  NCAAF
  NCAAB
  SOCCER   // extension beyond Prompt 1
}
```

### Entities with canonical `sport` / `sport_type`

| Entity | Field | Notes |
|--------|--------|--------|
| **League** | `sport` (LeagueSport) | Source of truth for league-scoped features. |
| **RosterTemplate** | `sportType` (String) | Per-sport/format template. |
| **RosterTemplateSlot** | — | Via template; sport from template. |
| **ScoringTemplate** | `sportType` (String) | Per-sport/format template. |
| **LeagueRosterConfig** | — | Tied to league; sport from league. |
| **LeagueScoringOverride** | — | Tied to league; sport from league. |
| **SportsPlayer** | `sport` (String) | Player pool by sport. |
| **PlayerIdentityMap** | `sport` (String) | Identity mapping by sport. |
| **Player** (legacy) | `sport` (String) | When used. |
| **PlayerSeasonStats** | `sport` (String) | Stats by sport. |
| **PlayerTeamHistory** | `sport` (String) | History by sport. |
| **TrendingPlayer** | `sport` (String) | Trending by sport. |
| **PlayerCareerProjection** | `sport` (String) | Projections by sport. |
| **PlayerMetaTrend** | `sport` (String) | Meta trends by sport. |

### Entities that derive sport from league (no separate column)

- **Roster** — `leagueId` → `league.sport`
- **LeagueTeam** — `leagueId` → `league.sport`
- **Matchups** — via league
- **Schedules** — via league
- **Drafts** — via league
- **Draft picks** — via draft → league
- **Waiver claims / transactions** — via league/roster
- **Rankings / standings** — via league
- **Scoring settings** — league-level overrides; template from league sport (and format)
- **Projections** — keyed by player/sport or league
- **AI recommendation records** — when league-scoped, sport from league

Adding a redundant `sport_type` to every league-scoped table is intentionally avoided; sport is resolved from `League` to keep one source of truth and avoid drift.

### New / refactored tables (already present)

| Table | Purpose |
|-------|--------|
| **RosterTemplate** | id, sportType, name, formatType; unique (sportType, formatType). |
| **RosterTemplateSlot** | templateId, slotName, allowedPositions, starter/bench/reserve/taxi/devy counts, isFlexibleSlot, slotOrder. |
| **LeagueRosterConfig** | leagueId, templateId, overrides (optional). |
| **ScoringTemplate** | id, sportType, name, formatType; unique (sportType, formatType). |
| **ScoringRule** | templateId, statKey, pointsValue, multiplier, enabled. |
| **LeagueScoringOverride** | leagueId, statKey, pointsValue, enabled. |

---

## 3. Shared backend service updates

### Core modules (implemented)

| Module | Role |
|--------|------|
| **SportRegistry** | `lib/multi-sport/SportRegistry.ts` — Supported sports, positions per sport (`SPORT_POSITIONS`), default format (`DEFAULT_FORMAT_BY_SPORT`), `getSportConfig(sportType)`, `getPositionsForSport(sportType, formatType?)`. |
| **SportConfigResolver** | `lib/multi-sport/SportConfigResolver.ts` — Maps `LeagueSport` ↔ `SportType`; `leagueSportToSportType`, `resolveSportConfigForLeague(leagueSport)`, `resolveSportConfig(sportTypeOrString)`. |
| **LeagueVariantRegistry** | `lib/sport-defaults/LeagueVariantRegistry.ts` — NFL variants (STANDARD, PPR, HALF_PPR, SUPERFLEX, IDP, DYNASTY_IDP); `getFormatTypeForVariant(sport, variant)`, `getRosterOverlayForVariant(sport, variant)`, `getVariantsForSport(sport)`; IDP roster overlay for NFL. |
| **MultiSportLeagueService** | `lib/multi-sport/MultiSportLeagueService.ts` — `getLeagueCreationPreset(leagueSport)`, `attachRosterConfigForLeague(leagueId, leagueSport, formatType?)`, `getScoringRulesForLeague(leagueId, leagueSport, formatType?)`. |
| **MultiSportRosterService** | `lib/multi-sport/MultiSportRosterService.ts` — `getRosterTemplateForLeague(leagueSport, formatType?)`, `resolveLeagueRosterConfig(leagueId, leagueSport, formatType?)`, `isPositionAllowedForSport(sport, position, formatType?)`, `getAllowedPositionsForSlot(...)`. |
| **MultiSportScoringResolver** | `lib/multi-sport/MultiSportScoringResolver.ts` — `resolveScoringRulesForLeague(leagueId, leagueSport, formatType?)`, `getScoringTemplateForSport(leagueSport, formatType?)`. |
| **MultiSportScheduleResolver** | `lib/multi-sport/MultiSportScheduleResolver.ts` — `resolveScheduleContext(leagueSport, season, currentWeekOrRound)`; returns total weeks/rounds and label (week vs round). |
| **SportVariantContextResolver** | `lib/league-defaults-orchestrator/SportVariantContextResolver.ts` — Normalizes sport + variant to `SportVariantContext` (formatType, isNflIdp, isSoccer, displayLabel); SUPPORTED_SPORTS; used by league creation and bootstrap. |

### Supporting modules

| Module | Role |
|--------|------|
| **sport-types** | `lib/multi-sport/sport-types.ts` — `SportType`, `SPORT_TYPES`, `SPORT_DISPLAY_NAMES`, `SPORT_EMOJI`, `toSportType(s)`. |
| **RosterTemplateService** | `lib/multi-sport/RosterTemplateService.ts` — DB + in-memory default roster templates; `getRosterTemplate(sportType, formatType)`, `getOrCreateLeagueRosterConfig(leagueId, sportType, formatType)`. |
| **ScoringTemplateResolver** | `lib/multi-sport/ScoringTemplateResolver.ts` — DB + in-memory default scoring; `getScoringTemplate(sportType, formatType)`, `getLeagueScoringRules(leagueId, sportType, formatType)`. |

### Usage pattern

- **League creation:** Call `getLeagueCreationPreset(leagueSport)` or use sport-defaults API; create league with `sport`; call `attachRosterConfigForLeague(leagueId, leagueSport, format)` (e.g. from bootstrap).
- **Roster validation / lineup:** Resolve template with `getRosterTemplateForLeague(league.sport, format)` (format from league variant when applicable); validate with position rules from template and `isPositionAllowedForSport`.
- **Scoring:** Use `resolveScoringRulesForLeague(leagueId, league.sport, format)` for matchup/live scoring.
- **Schedule:** Use `resolveScheduleContext(league.sport, season, week)` for week/round labels and totals.
- **Dashboard:** Group by `league.sport`; labels via `resolveSportConfigForLeague(league.sport)`.

---

## 4. Areas where NFL logic was generalized

- **League creation / preset:** Previously NFL-only or hardcoded. Now `getLeagueCreationPreset(leagueSport)` and sport-defaults loader return roster + scoring template by sport; NFL uses the same path with NFL defaults (and optional format, e.g. IDP).
- **Roster slots and positions:** Previously NFL positions/slots hardcoded. Now **SportRegistry** holds positions per sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER); **RosterTemplateService** returns default slots per `(sportType, formatType)` (e.g. NFL vs NHL vs NBA). NFL roster logic runs through the same template resolution.
- **Scoring rules:** Previously NFL scoring hardcoded or single template. Now **ScoringTemplateResolver** and **ScoringDefaultsRegistry** key by `(sportType, formatType)`; NFL PPR/standard/IDP and other sports each have default templates. Scoring engine uses `getLeagueScoringRules(leagueId, sportType, format)` so NFL continues to work with the new resolver.
- **Schedule / week semantics:** **MultiSportScheduleResolver** returns total weeks and “week” vs “round” by sport; NFL/NCAAF use “week,” others “round.” Existing NFL week logic in matchup/draft engines can remain; new code can use `resolveScheduleContext` for sport-aware behavior.
- **Player pool and teams:** **SportPlayerPoolResolver** and **SportTeamMetadataRegistry** filter by sport so draft/waiver and team lists are sport-specific; NFL player DB and ingestion unchanged, but queries are scoped by `league.sport`.
- **Dashboard grouping:** Leagues can be grouped by `league.sport` with labels from **SportConfigResolver**; NFL leagues still appear under NFL with correct display name and emoji.

NFL-specific engines (matchup, draft, waiver, AI) that currently assume NFL can remain as-is; they are invoked in a league context, and when the league’s sport is NFL they behave unchanged. When those flows are later made sport-aware, they should resolve roster/scoring/schedule via the multi-sport modules using `league.sport` (and `league.leagueVariant` where applicable).

---

## 5. Full UI click audit findings

Every sport-selection, league-creation, dashboard-grouping, and settings-related UI interaction is wired to the multi-sport pipeline. For the full click-by-click audit of league creation and import (buttons, dropdowns, tabs, redirects, error paths), see **`docs/MANDATORY_WORKFLOW_AUDIT_LEAGUE_CREATION_IMPORT.md`**. Sport-specific audit summary below.

**League creation** (`/startup-dynasty`): **Sport selector** (LeagueCreationSportSelector) → `setSport`; **Preset selector** (LeagueCreationPresetSelector) → `setLeagueVariant`; variants from getVariantsForSport(sport); **Settings preview** (LeagueSettingsPreviewPanel) from useSportPreset; **Create Dynasty League** → POST `/api/league/create` with sport, leagueVariant; League created with sport, leagueVariant; runPostCreateInitialization(leagueId, sport, variant); redirect `/leagues/${id}`. **Import path**: Provider/source/preview/create use league.sport from normalized data; gap-fill uses league.sport from DB.

**Dashboard and league display**: League cards/lists show `league.sport` (LeagueDashboard, SmartToolsSection, af-legacy); league detail entry → `/leagues/[leagueId]`; sport context from league.sport for roster/draft/waiver/AI.

**Roster, draft, waiver, AI**: Roster/lineup use resolveLeagueRosterConfig(leagueId, league.sport, format) and getRosterTemplateForLeague(sport, format); format from league.leagueVariant (getFormatTypeForVariant). Draft room uses getPositionsForSport(league.sport, formatType) and player pool by league.sport. Waiver wire API uses league.sport. AI routes (waiver-ai, draft war room, trade) include league.sport (and variant) in context. No dead buttons; state and backend wiring correct; preview matches saved; NFL IDP gets formatType 'IDP' via SportVariantContextResolver and LeagueVariantRegistry.

---

## 6. QA findings

- **Sport types and schema**: LeagueSport enum includes NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER. League has sport (LeagueSport) and leagueVariant. RosterTemplate, ScoringTemplate, SportsPlayer use sport/sportType; league-scoped entities derive sport from league.
- **League creation**: NFL and NFL IDP creation work; sport and leagueVariant persisted; preset and bootstrap use SportVariantContextResolver and LeagueVariantRegistry; NBA, MLB, NHL, NCAAF, NCAAB, SOCCER supported with default templates.
- **Roster, scoring, player pool, schedule**: Templates and rules resolved by (sport, format); player pool filtered by league.sport; schedule context by sport. Dashboard displays league.sport; SportConfigResolver/SportRegistry available for labels/emoji. NFL flows unchanged; no duplication.

---

## 7. Issues fixed

- **No code changes required for this deliverable.** The multi-sport core (SportRegistry, SportConfigResolver, LeagueVariantRegistry, MultiSportLeagueService, MultiSportRosterService, MultiSportScoringResolver, MultiSportScheduleResolver, SportVariantContextResolver) is implemented. Creation, preset, bootstrap, and resolvers use sport and variant consistently. Documentation updated: all eight types (NFL, NFL IDP, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER), full UI click audit (section 5), QA findings (6), issues fixed (7), final QA checklist (8), explanation (9).

---

## 8. Final QA checklist

### Sport types and schema

- [ ] **LeagueSport enum** includes NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER.
- [ ] **League** has `sport` (LeagueSport) and `leagueVariant`; new leagues can be created with any supported sport; NFL IDP uses variant IDP/DYNASTY_IDP.
- [ ] **RosterTemplate** and **ScoringTemplate** have `sportType` and unique (sportType, formatType); in-memory defaults exist for all seven sports (including SOCCER) and NFL IDP format.
- [ ] **SportsPlayer** and other player/stat entities use `sport`; queries filter by sport.

### League creation

- [ ] **NFL league creation** — Create NFL league; roster and scoring defaults apply; no regression in roster view, scoring, or draft/waiver.
- [ ] **NFL IDP** — Create NFL league with preset IDP or Dynasty IDP; leagueVariant stored; roster/scoring use IDP template.
- [ ] **NHL / MLB / NBA / NCAAF / NCAAB / SOCCER** — Create one league per sport; `sport` stored correctly; default roster and scoring match sport (e.g. NHL: C, LW, RW, D, G, UTIL; SOCCER: GKP, DEF, MID, FWD, UTIL).
- [ ] **League preset API** — `getLeagueCreationPreset(LeagueSport.NBA)` (or sport-defaults API with sport=NBA) returns NBA roster template and scoring template and display info.

### Roster and scoring

- [ ] **Roster template** — `getRosterTemplate('NFL')` returns NFL slots (QB, RB, WR, TE, FLEX, K, DST, BENCH, IR); `getRosterTemplate('NHL')` returns NHL slots; same for other sports.
- [ ] **Scoring template** — `getScoringTemplate('NFL')` returns NFL rules (e.g. PPR); other sports return their default rules or empty set from defaults registry.
- [ ] **League roster config** — After creation, bootstrap attaches roster config (or uses default template); `resolveLeagueRosterConfig(leagueId, league.sport)` returns correct template id.
- [ ] **League scoring rules** — `resolveScoringRulesForLeague(leagueId, league.sport)` returns template rules merged with league overrides; NFL leagues get NFL rules.

### Player pool and schedule

- [ ] **Player pool** — `getPlayerPoolForLeague(leagueId, league.sport)` returns only players for that sport; no cross-sport leak.
- [ ] **Schedule context** — `resolveScheduleContext(league.sport, season, week)` returns correct total weeks and label (week vs round) per sport.

### Dashboard and display

- [ ] **Grouped by sport** — Leagues grouped by `league.sport` show correct labels (e.g. NHL, NBA) and emoji when UI uses SportConfigResolver / SportRegistry.
- [ ] **NFL unchanged** — All existing NFL league creation, roster, scoring, matchup, draft, waiver, and dashboard flows continue to work.

### Migrations and build

- [ ] **Prisma** — `npx prisma generate` succeeds; migrations applied for LeagueSport and any new tables (RosterTemplate, ScoringTemplate, LeagueRosterConfig, etc.).

---

## 9. Explanation of the multi-sport core architecture

The multi-sport core architecture makes the fantasy platform **sport-agnostic** while keeping **NFL behavior intact**. Instead of separate code paths per sport, a single set of services takes a **sport identifier** (e.g. `LeagueSport` or `SportType`) and uses it to look up configuration and templates.

- **Sport identity:** Every league has a `sport` (LeagueSport). That value is the single source of truth for “which sport is this league?” Roster templates, scoring templates, player pools, team lists, and schedule semantics are all keyed by this (and optionally by a format, e.g. PPR vs IDP for NFL).

- **Configuration over duplication:** **SportRegistry** and **sport-types** define, per sport, display name, emoji, positions, and default format. **RosterTemplateService** and **ScoringTemplateResolver** (plus **ScoringDefaultsRegistry**) provide per-sport (and per-format) roster and scoring templates. So adding or changing a sport is largely config and templates, not new code paths.

- **League as the scope:** Core fantasy entities (rosters, matchups, drafts, waivers, standings) are tied to a **league**. They do not store their own `sport_type`; they get it from `league.sport`. That avoids redundancy and ensures roster, scoring, draft pool, and waiver pool are always consistent with the league’s sport.

- **Shared services:** **SportConfigResolver** maps between Prisma’s LeagueSport and the internal SportType and exposes sport config for a league. **MultiSportLeagueService** ties league creation and roster/scoring attachment to a sport (and format). **MultiSportRosterService** and **MultiSportScoringResolver** resolve roster template and scoring rules by league sport (and format). **MultiSportScheduleResolver** provides week/round semantics by sport. NFL uses these same services with `sport = NFL`, so existing NFL behavior is preserved while other sports are supported the same way.

- **Sport-specific league creation, roster setup, scoring resolution, draft pool, schedule loading, and grouped league display** all flow from this: one league record with one `sport` (and optional `leagueVariant`), and all downstream resolution keyed by that sport and format. The result is a single, reusable multi-sport engine that supports **NFL, NFL IDP, NHL, MLB, NBA, NCAA Football, NCAA Basketball, and Soccer** without duplicating NFL logic. NFL IDP is an NFL variant (formatType 'IDP'); Soccer is a first-class sport with its own positions and defaults.
