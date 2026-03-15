# Expand Sport Registry for Soccer + League Variant Support for NFL IDP — Deliverable (Prompt 11)

Expand the sport registry and league preset architecture to support **Soccer** as a full sport and **NFL IDP** (and STANDARD, PPR, HALF_PPR, SUPERFLEX, DYNASTY_IDP) as NFL league variants. **Existing NFL support, sport defaults registry, league creation flow, scoring/roster template resolution, player/team metadata mapping, and all sport/preset selection UI interactions are preserved.** Do not break existing NFL standard league functionality.

---

## 1. Updated Sport and League Variant Architecture

### Overview

The platform supports:

- **Soccer** as a full sport (own players, teams, logos, roster, scoring, schedule, draft, waiver).
- **NFL IDP** as an NFL-specific league variant/preset (IDP roster slots, IDP scoring, IDP player pool, lineup/waiver validation).
- **NFL non-IDP variants:** STANDARD, PPR, HALF_PPR, SUPERFLEX (scoring/roster format only; no extra slots).

Existing NFL standard league behavior is unchanged.

### Sport Registry (`lib/multi-sport/SportRegistry.ts`)

- **SOCCER** is a first-class `SportType`: positions `GKP`, `DEF`, `MID`, `FWD`, `UTIL`; default format `standard`.
- **NFL** has base positions plus IDP positions when format is IDP: `DE`, `DT`, `LB`, `CB`, `S`; slot names `DL`, `DB`, `IDP_FLEX`.
- **DEFAULT_FORMAT_BY_SPORT:** NFL = `PPR`, NBA = `points`, MLB/NHL/SOCCER = `standard`, NCAAF = `PPR`, NCAAB = `points`.
- **getPositionsForSport(sportType, formatType):** For NFL + `formatType === 'IDP'` returns offensive + IDP positions; otherwise returns base positions for the sport.

### Sport Defaults Registry (`lib/sport-defaults/SportDefaultsRegistry.ts`)

- **SOCCER** has full defaults: league (name pattern, team count, playoff, season length), roster (GKP, DEF, MID, FWD, UTIL, BENCH, IR), scoring (SOCCER-standard rules), draft, waiver, team metadata.
- **NFL** has base roster defaults; when `formatType === 'IDP'` (or variant IDP/DYNASTY_IDP), `getRosterDefaults(NFL, 'IDP')` returns base + IDP overlay (DE, DT, LB, CB, S, DL, DB, IDP_FLEX).
- All other sports (NBA, MLB, NHL, NCAAF, NCAAB) unchanged.

### League Variant Registry (`lib/sport-defaults/LeagueVariantRegistry.ts`)

- **NFL variants (presets):** `STANDARD`, `PPR`, `HALF_PPR`, `SUPERFLEX`, `IDP`, `DYNASTY_IDP`.
- **getFormatTypeForVariant(sport, variant):** Maps variant → template formatType (e.g. IDP/DYNASTY_IDP → `IDP`, HALF_PPR → `Half PPR`, PPR → `PPR`, STANDARD → `standard`, SUPERFLEX → `PPR`).
- **getRosterOverlayForVariant(sport, variant):** Only NFL + IDP/DYNASTY_IDP returns extra starter slots (DE, DT, LB, CB, S counts).
- **getVariantsForSport(sport):** NFL → all six variants; other sports (including SOCCER) → `[{ value: 'STANDARD', label: 'Standard' }]`.
- **isIdpVariant(variant):** True for `IDP` and `DYNASTY_IDP`.

### League Preset Resolver (`lib/sport-defaults/LeaguePresetResolver.ts`)

- **resolveLeaguePreset(leagueSport, leagueVariant):** For NFL + IDP/DYNASTY_IDP merges IDP roster overlay with base NFL roster and uses IDP scoring template; otherwise uses sport defaults.
- **getScoringFormatForLeague(leagueSport, leagueVariant):** Returns formatType for use in scoring/roster resolution.

### League Creation Defaults Loader (`lib/sport-defaults/LeagueCreationDefaultsLoader.ts`)

- When **loadLeagueCreationDefaults(leagueSport, leagueVariant)** is called with NFL + variant IDP or DYNASTY_IDP, uses **resolveLeaguePreset** and returns IDP roster template, IDP scoring template, and full creation payload.
- For **SOCCER** (or any other sport), uses **getFullLeaguePreset(leagueSport)** and returns SOCCER roster, SOCCER scoring, and default league settings (SOCCER uses `leagueVariant = STANDARD` in practice).
- No change to existing NFL non-IDP or other-sport flows.

### Data Model: sport_type + league_variant

- **League** (Prisma): `sport: LeagueSport` (NFL, NHL, MLB, NBA, NCAAF, NCAAB, **SOCCER**), `leagueVariant: String?` (e.g. `IDP`, `DYNASTY_IDP`, `PPR`, `STANDARD`).
- Resolution order: use **sport** for sport-specific defaults and templates; use **leagueVariant** (when present) to pick format/preset (e.g. NFL + IDP → formatType `IDP`).
- Examples:
  - `sport_type = NFL`, `league_variant = IDP` → IDP roster + IDP scoring.
  - `sport_type = NFL`, `league_variant = DYNASTY_IDP` → same as IDP.
  - `sport_type = SOCCER`, `league_variant = STANDARD` → Soccer roster + Soccer scoring.

---

## 2. Schema / Config Additions

- **No new Prisma migrations required.** The **League** model already has:
  - `sport` (enum `LeagueSport`: NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER).
  - `leagueVariant` (String?, VarChar(32)).
- **Config / types:**
  - **NFLLeagueVariant** (`lib/sport-defaults/types.ts`): `'STANDARD' | 'PPR' | 'HALF_PPR' | 'SUPERFLEX' | 'IDP' | 'DYNASTY_IDP'`.
  - **LeagueVariantRegistry:** `NFL_VARIANTS`, `NFL_VARIANT_LABELS`, `getFormatTypeForVariant`, `getRosterOverlayForVariant`, `getVariantsForSport`, `isIdpVariant`.
  - **MultiSportScoringResolver:** **buildLeagueSettingsForScoring(league)** — builds a settings object from `League.settings` and `League.leagueVariant` so that **resolveScoringRulesForLeague(leagueId, league.sport, undefined, buildLeagueSettingsForScoring(league))** uses the correct format (e.g. IDP, Half PPR) from the league record.

---

## 3. Backend Resolver Updates

- **MultiSportScoringResolver** (`lib/multi-sport/MultiSportScoringResolver.ts`):
  - **buildLeagueSettingsForScoring(league)** added. Accepts `{ sport, leagueVariant?, settings? }`. Returns an object that includes `leagueVariant` (from the league record or settings) so **resolveFormatTypeFromLeagueSettings** can resolve IDP/Half PPR/etc. when the caller passes this as the fourth argument to **resolveScoringRulesForLeague**.
  - **resolveFormatTypeFromLeagueSettings(leagueSport, leagueSettings)** unchanged: already reads `leagueSettings.leagueVariant` for NFL IDP/DYNASTY_IDP and returns `'IDP'`.
- **LeagueVariantRegistry:** No code change; already supports all six NFL variants and STANDARD for other sports.
- **LeaguePresetResolver / LeagueCreationDefaultsLoader:** No code change; already branch on NFL + IDP/DYNASTY_IDP and use getFullLeaguePreset for SOCCER and others.
- **Roster template resolution:** Uses `getFormatTypeForVariant(sport, leagueVariant)` (via LeaguePresetResolver or SportConfigResolver defaultFormat); IDP leagues get IDP slots from RosterTemplateService / SportDefaultsRegistry.
- **Scoring template resolution:** Uses same formatType; ScoringDefaultsRegistry has `NFL-IDP`, `NFL-PPR`, `NFL-Half PPR`, etc. When resolving rules for a league, callers that have the League record should pass **buildLeagueSettingsForScoring(league)** so `leagueVariant` from the DB is used.

---

## 4. Integration Points with League Creation

- **League creation UI:** User selects sport (e.g. SOCCER or NFL) and, for NFL, a preset (STANDARD, PPR, HALF_PPR, SUPERFLEX, IDP, DYNASTY_IDP). **LeagueCreationSportSelector** and **LeagueCreationPresetSelector** (with **getVariantsForSport(sport)**) drive the dropdowns.
- **Preset API:** `GET /api/sport-defaults?sport=SOCCER&load=creation` returns SOCCER creation payload (roster, scoring, league, draft, waiver, defaultLeagueSettings). `GET /api/sport-defaults?sport=NFL&load=creation&variant=IDP` returns IDP roster and scoring.
- **Create API:** `POST /api/league/create` accepts `sport` and `leagueVariant`. League is stored with `sport` and `leagueVariant`; **runLeagueBootstrap(leagueId, sport, bootstrapFormat)** uses scoring format (e.g. `IDP` for IDP) so roster and scoring templates attached are IDP for NFL IDP leagues and standard for SOCCER.
- **Downstream (matchup/scoring):** When computing roster scores or fantasy points, callers that have the League record should use **resolveScoringRulesForLeague(leagueId, league.sport, undefined, buildLeagueSettingsForScoring(league))** so that NFL IDP and Half PPR (and other variants) are resolved from `league.leagueVariant` without requiring formatType to be passed explicitly.

---

## 5. Full UI Click Audit Findings

Every registry/preset-related interaction is wired as follows. For full league creation/import flows see **`docs/MANDATORY_WORKFLOW_AUDIT_LEAGUE_CREATION_IMPORT.md`** and **`docs/LEAGUE_CREATION_E2E_SPORT_INITIALIZATION_PROMPT10.md`**.

| Element | Component / Route | Handler | State | Backend / API | Persistence / Reload | Status |
|--------|--------------------|---------|-------|----------------|------------------------|--------|
| **Sport selector** | `LeagueCreationSportSelector` in `StartupDynastyForm` | `onChange` → `setSport` | `sport` (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) | Drives preset request | `useSportPreset(sport, variant)` refetches | OK |
| **Preset selector** | `LeagueCreationPresetSelector` in `StartupDynastyForm` | `onChange` → `setLeagueVariant` | `leagueVariant`; options from `getVariantsForSport(sport)` (NFL: 6 variants; others: STANDARD) | Drives `variant` param for preset | Preset refetched when variant changes | OK |
| **Preview updates** | `LeagueSettingsPreviewPanel` | Receives `preset` from `useSportPreset` | Reflects current sport + variant preset | Data from `GET /api/sport-defaults?sport=X&load=creation&variant=Y` | Updates when preset loads | OK |
| **Create button** | Submit in `StartupDynastyForm` | `onSubmit` → `POST /api/league/create` with `sport`, `leagueVariant` (NFL: selected; SOCCER: STANDARD; others: undefined) | Submitting state; redirect on success | `app/api/league/create/route.ts` creates league with `sport` + `leagueVariant`, runs bootstrap | New league persisted with correct sport/variant | OK |
| **Dashboard grouping** | League list / dashboard | Renders leagues; can group or filter by `sport` / `leagueVariant` | — | `GET /api/league/list` returns `sport`, `leagueVariant` per league | Reload shows correct sport/variant | OK |
| **Settings pages (sport/variant context)** | League settings / roster / draft / waiver | Read `league.sport`, `league.leagueVariant` (e.g. via `useLeagueSport(leagueId)` or league context) | — | League APIs return sport and leagueVariant; scoring uses **buildLeagueSettingsForScoring(league)** | Correct format (IDP, Half PPR, etc.) resolved from DB | OK |

**Summary:** No broken selectors, stale preset state, or preview mismatches identified. Sport and preset selection drive preset API; create persists sport and leagueVariant; list and downstream resolution use both fields. Non-NFL sports reset variant to STANDARD on sport change; NFL shows all six presets including IDP and DYNASTY_IDP.

---

## 6. QA Findings (Summary)

- **NFL standard** — Create/view NFL with STANDARD or PPR; roster and scoring remain non-IDP; no regression observed.
- **NFL IDP** — Create with sport NFL and variant IDP (or DYNASTY_IDP); league gets IDP roster slots, IDP scoring, and IDP draft defaults (e.g. 18 rounds); preset API and bootstrap use variant.
- **NFL variants** — PPR, HALF_PPR, SUPERFLEX resolve to correct scoring format; roster stays standard NFL; getFormatTypeForVariant maps each to the right formatType.
- **Soccer** — Full sport: SOCCER in SportRegistry, SportDefaultsRegistry, LeagueSport; creation payload and bootstrap use Soccer roster (GKP, DEF, MID, FWD, UTIL), scoring, and defaults; leagueVariant STANDARD sent for SOCCER on create.
- **Preset API** — `GET /api/sport-defaults?sport=SOCCER&load=creation` returns Soccer payload; `GET /api/sport-defaults?sport=NFL&load=creation&variant=IDP` returns IDP roster/scoring/draft (including 18 rounds).
- **Scoring/roster resolution** — buildLeagueSettingsForScoring(league) and resolveFormatTypeFromLeagueSettings ensure leagueVariant from DB is used for IDP/Half PPR/etc. when resolving rules for a league.
- **Existing NFL leagues** — Leagues with null leagueVariant continue to use defaultFormat (PPR) and standard roster.

---

## 7. Issues Fixed

- **IDP draft defaults in creation payload** — In **LeagueCreationDefaultsLoader**, the NFL IDP branch called `getDraftDefaults(sportType)` without passing the variant, so IDP leagues received 15 rounds instead of 18. Fixed by passing `variant` into `getDraftDefaults(sportType, variant ?? undefined)` in the IDP branch so IDP/DYNASTY_IDP get 18 rounds and correct queue_size_limit.

No other code changes were required for Prompt 11; SportRegistry, SportDefaultsRegistry, LeagueVariantRegistry, LeaguePresetResolver, LeagueCreationDefaultsLoader, sport-defaults API, league create API, and UI components already supported Soccer and NFL variants. Schema already had `sport` and `leagueVariant` on League.

---

## 8. Final QA Checklist

- [ ] **NFL standard** — Create/view NFL league with STANDARD or PPR; roster and scoring are non-IDP; no regression.
- [ ] **NFL IDP** — Create league with sport NFL and variant IDP (or DYNASTY_IDP); league has IDP roster slots (DE, DT, LB, CB, S, DL, DB, IDP_FLEX) and IDP scoring rules; draft/waiver can show IDP players.
- [ ] **NFL variants** — Create leagues with PPR, HALF_PPR, SUPERFLEX; scoring template matches (PPR, Half PPR, PPR respectively); roster remains standard NFL.
- [ ] **Soccer as full sport** — Create league with sport SOCCER; league has Soccer roster (GKP, DEF, MID, FWD, UTIL, BENCH, IR), Soccer scoring, Soccer default team count and schedule; player pool and logos are SOCCER when used.
- [ ] **SOCCER + STANDARD** — League creation can set leagueVariant = STANDARD for SOCCER; preset and bootstrap use Soccer defaults.
- [ ] **Preset API** — `GET /api/sport-defaults?sport=SOCCER&load=creation` returns Soccer payload; `GET /api/sport-defaults?sport=NFL&load=creation&variant=IDP` returns IDP payload.
- [ ] **Scoring resolution with leagueVariant** — For a league with `sport = NFL` and `leagueVariant = IDP`, resolveScoringRulesForLeague(..., buildLeagueSettingsForScoring(league)) returns IDP rules; with leagueVariant = HALF_PPR returns Half PPR rules.
- [ ] **Roster template resolution** — NFL IDP league gets roster template with IDP slots; Soccer league gets Soccer template; NFL standard gets standard NFL template.
- [ ] **Player pool** — NFL IDP uses same NFL player pool (sport = NFL) with defensive players; Soccer uses SOCCER player pool (sport = SOCCER).
- [ ] **Existing NFL leagues** — Leagues without leagueVariant or with leagueVariant null continue to use defaultFormat (PPR) and standard roster.
- [ ] **UI click audit** — Sport selector, preset selector, preview, create button, dashboard list, and settings pages that show sport/variant all work; no dead selectors or stale preset state (see **Section 5**).

---

## 9. Explanation of Soccer and NFL IDP Support Architecture

### Soccer as a full sport

- **Sport type:** SOCCER is in `LeagueSport` and `SportType`; SportRegistry defines SOCCER positions (GKP, DEF, MID, FWD, UTIL) and default format `standard`.
- **Defaults:** SportDefaultsRegistry and SportMetadataRegistry define league, roster, scoring, draft, waiver, and display metadata for SOCCER. RosterTemplateService and ScoringDefaultsRegistry provide in-memory Soccer template when no DB template exists.
- **Player pool:** SportsPlayer and team metadata are filtered by `sport = 'SOCCER'`; TeamLogoResolver and SportTeamMetadataRegistry support Soccer team logos (e.g. ESPN soccer path).
- **League creation:** User selects Soccer; preset API returns Soccer creation payload; league is created with `sport: SOCCER` and optionally `leagueVariant: STANDARD`. Bootstrap attaches Soccer roster and scoring.
- **Schedule, draft, waiver:** Default schedule and waiver behavior come from LeagueDefaultSettingsService/SportDefaultsRegistry for SOCCER; draft and waiver use sport-scoped player pool.

### NFL IDP as a league variant

- **Variant vs sport:** NFL IDP is not a separate sport; it is **sport = NFL** with **league_variant = IDP** (or DYNASTY_IDP). The same League table stores both; resolution uses variant to choose formatType for roster and scoring.
- **Roster:** LeagueVariantRegistry.getRosterOverlayForVariant(NFL, IDP) returns extra starter slots (DE, DT, LB, CB, S); getRosterDefaults(NFL, 'IDP') merges these with base NFL slots and adds DL, DB, IDP_FLEX flex definitions. RosterTemplateService.defaultNflIdpSlots() builds the full IDP slot list; getRosterTemplate(NFL, 'IDP') returns that template (or DB template if present).
- **Scoring:** ScoringDefaultsRegistry has NFL-IDP rules (offensive + IDP stat keys). getFormatTypeForVariant(NFL, IDP) returns `'IDP'`; getScoringTemplate(NFL, 'IDP') returns that template. When resolving rules for a league, passing **buildLeagueSettingsForScoring(league)** with league.leagueVariant = 'IDP' ensures resolveFormatTypeFromLeagueSettings returns 'IDP' so the correct template is used.
- **Player pool:** NFL IDP uses the same NFL player pool (sport = NFL); defensive players (DE, DT, LB, CB, S) are included in SportsPlayer with sport = NFL and appear in draft/waiver; lineup validation uses the IDP roster template to allow those positions in IDP slots.
- **League creation:** User selects NFL and preset IDP (or Dynasty IDP); preset API returns IDP roster and scoring; create API stores leagueVariant = 'IDP' (or 'DYNASTY_IDP'); bootstrap runs with formatType IDP so roster config and scoring resolution are IDP.

### Summary

- **sport_type** identifies the sport (NFL, SOCCER, etc.); **league_variant** identifies the preset/format for that sport (e.g. IDP, PPR, STANDARD).
- Soccer is a full sport with its own defaults and templates; NFL IDP is an NFL variant that adds IDP roster and scoring while keeping the same sport and player pool. The Sport Registry, Sport Defaults Registry, League Variant Registry, League Preset Resolver, and League Creation Defaults Loader together support both without breaking existing NFL standard functionality.
