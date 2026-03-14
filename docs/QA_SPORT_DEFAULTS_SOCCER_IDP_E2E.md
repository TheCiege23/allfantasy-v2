# End-to-End QA: Sport Defaults, Soccer, and NFL IDP

## 1. QA findings

### 1.1 League creation and bootstrap (verified)

- **Create API** accepts `sport` (NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER) and optional `leagueVariant` (e.g. STANDARD, PPR, IDP, DYNASTY_IDP). Both are persisted on the League record.
- **Default filling:** When name, leagueSize, scoring, or isDynasty are omitted, the server uses `getLeagueDefaults(sport)` and `getScoringDefaults(sport)`. For **NFL IDP**, when `leagueVariant` is IDP or DYNASTY_IDP and scoring is omitted, scoring is now set to **'IDP'** (fix applied) so the stored `league.scoring` field matches the format and bootstrap uses IDP.
- **Bootstrap:** `runLeagueBootstrap(leagueId, leagueSport, scoringFormat)` is called with `scoringFormat = 'IDP'` when `leagueVariant` is IDP or DYNASTY_IDP; otherwise with the chosen scoring string (e.g. PPR). Roster and scoring templates are attached with this format (IDP roster + IDP scoring for IDP leagues).
- **Sport-defaults API:** `GET /api/sport-defaults?sport=X&load=creation&variant=Y` returns full creation payload. For NFL + variant IDP/DYNASTY_IDP, `loadLeagueCreationDefaults` uses `resolveLeaguePreset` and returns IDP roster and scoring. For Soccer and other sports, `getFullLeaguePreset` is used.

### 1.2 Roster and scoring resolution

- **By sport + format:** `getRosterTemplate(sportType, formatType)` and `getScoringTemplate(sportType, formatType)` return in-memory defaults when no DB template exists. NFL + format 'IDP' → IDP slots and IDP rules; SOCCER + 'standard' → soccer slots and soccer scoring.
- **For an existing league:** When resolving roster or scoring for a league (e.g. draft room, waiver, lineup), **format must be derived from the league record**: use `getScoringFormatForLeague(league.sport, league.leagueVariant)` (from `LeaguePresetResolver`) or `getFormatTypeForVariant(league.sport, league.leagueVariant)` (from `LeagueVariantRegistry`), then call `getRosterTemplate(sportType, format)` / `getScoringTemplate(sportType, format)` or the league-scoped helpers with that format. **Otherwise an IDP league could be shown with standard roster/scoring** (regression risk).

### 1.3 Player pool and team metadata

- **Player pool:** `getPlayerPoolForLeague(leagueId, leagueSport)` filters by `league.sport` (SOCCER → only SOCCER players; NFL → all NFL players including IDP when present in DB). No cross-sport leak when the UI uses the league’s sport.
- **Team metadata:** `getTeamMetadataForSport(sportType)` returns sport-specific teams; Soccer has a dedicated list and logos. Logos resolve via `TeamLogoResolver` with sport (SOCCER supported).
- **IDP players:** They appear in the NFL pool when `SportsPlayer` has `sport = 'NFL'` and defensive positions (DE, DT, LB, CB, S). Eligibility for IDP slots is enforced by roster template and `PositionEligibilityResolver` with `formatType 'IDP'`.

### 1.4 Frontend

- **League creation form** uses `LeagueCreationSportSelector`, `LeagueCreationPresetSelector`, and `LeagueSettingsPreviewPanel`. Submits `sport` and `leagueVariant` (NFL → selected preset; Soccer → STANDARD).
- **Preset loading:** `useSportPreset(sport, variant)` fetches creation defaults; preview panel shows roster, scoring, player pool type, and league defaults. For IDP, preview shows IDP roster and “NFL offensive + defensive (IDP)”.
- **Conditional fields:** QB Format and Scoring dropdown only for NFL non-IDP; for IDP a note explains IDP scoring is applied from preset; for Soccer a note explains standard soccer scoring.

### 1.5 Sport coverage

- **NFL standard / PPR / Half PPR / Superflex:** Use default format (e.g. PPR); no variant or variant STANDARD/PPR/etc.; roster and scoring are non-IDP. Creation and bootstrap unchanged.
- **NFL IDP / Dynasty IDP:** Variant IDP or DYNASTY_IDP; bootstrap format 'IDP'; roster and scoring templates are IDP. Stored `league.scoring` set to 'IDP' when defaults are applied (fix applied).
- **Soccer:** Sport SOCCER; variant STANDARD; roster and scoring from SOCCER defaults; player pool and teams from SOCCER. No NFL/other sport data.
- **NBA, MLB, NHL, NCAAF, NCAAB:** Unchanged; `getFullLeaguePreset` and default format per sport; no leagueVariant in UI (optional in API).

---

## 2. Bugs found and fixed

### 2.1 IDP league scoring default (fixed)

- **Issue:** When creating an NFL IDP league with omitted body fields, the server filled `scoring` from `getScoringDefaults('NFL')` (e.g. 'PPR'). The bootstrap correctly used format 'IDP' for roster/scoring, but `league.scoring` was stored as 'PPR', which could confuse UI or reporting.
- **Fix:** In `app/api/league/create/route.ts`, when filling defaults, if `leagueVariant` is IDP or DYNASTY_IDP and `scoring` is null, set `scoring = 'IDP'` instead of the generic NFL default.

### 2.2 No other code bugs identified

- Sport-defaults loader, LeaguePresetResolver, roster/scoring templates, player pool, and team metadata all support SOCCER and NFL IDP as implemented. League list returns `leagueVariant`. Frontend sends `leagueVariant` and shows preset and preview.

---

## 3. Regression risks

### 3.1 Resolving roster/scoring for an existing league

- **Risk:** Pages that load roster or scoring for a league (draft room, waiver, lineup, settings) might call `getRosterTemplateForLeague(league.sport)` or `getScoringRulesForLeague(leagueId, league.sport)` **without** passing format from `league.leagueVariant`. Then an IDP league would get standard roster/scoring.
- **Mitigation:** Any such caller should use `getScoringFormatForLeague(league.sport, league.leagueVariant)` (or `getFormatTypeForVariant`) and pass the result as `formatType` to the resolver or to `getRosterTemplate(sport, format)` / `getScoringTemplate(sport, format)`. Document this in integration guides and audit draft/waiver/lineup code paths.

### 3.2 Validation and eligibility with format

- **Risk:** Roster validation or position eligibility that only receives `sport` (e.g. `validateRoster(sport, assignments)`) will use the standard template. For IDP leagues, callers should pass `formatType` (e.g. 'IDP') so `getRosterTemplateDefinition(sport, format)` and eligibility use the IDP template.
- **Mitigation:** Where the league context is available, pass `league.leagueVariant` and derive format (e.g. `getFormatTypeForVariant(sport, league.leagueVariant)`) into validation and eligibility.

### 3.3 Existing leagues

- **Risk:** Leagues created before `leagueVariant` was added have `leagueVariant = null`. Resolution that uses `getFormatTypeForVariant(sport, null)` returns the default format (e.g. PPR for NFL), so existing NFL leagues continue to get standard/PPR roster and scoring. No change for them.
- **Mitigation:** None required; backward compatible.

---

## 4. Final QA checklist

Use this for manual or automated E2E validation.

### League creation (per sport)

- [ ] **NFL Standard:** Create league with sport=NFL, preset=Standard (or no variant). Verify `sport_type` and `league_variant` stored; roster has no IDP slots; scoring is standard/PPR; bootstrap runs; draft/waiver pool is NFL only.
- [ ] **NFL PPR:** Same with preset PPR; scoring format PPR.
- [ ] **NFL Superflex:** Preset Superflex; roster includes superflex if applicable; scoring as expected.
- [ ] **NFL IDP:** Create with preset IDP. Verify `league_variant` = IDP, `scoring` = IDP when using defaults; roster includes IDP slots (DE, DT, LB, CB, S, DL, DB, IDP_FLEX); scoring includes IDP stats; bootstrap uses format IDP; draft/waiver can show IDP positions.
- [ ] **NFL Dynasty IDP:** Same as IDP with Dynasty IDP preset; roster and scoring IDP; dynasty settings applied.
- [ ] **Soccer:** Create with sport=Soccer. Verify `sport_type` = SOCCER, `league_variant` = STANDARD (or null); roster has GKP, DEF, MID, FWD, UTIL, BENCH, IR; scoring is soccer; teams and player pool are Soccer only; no NFL data.
- [ ] **NBA, MLB, NHL, NCAAF, NCAAB:** Create one per sport. Verify correct sport stored; roster and scoring match sport defaults; no cross-sport data.

### Defaults and preset API

- [ ] **GET /api/sport-defaults?sport=NFL&load=creation** returns NFL default creation payload (no IDP).
- [ ] **GET /api/sport-defaults?sport=NFL&load=creation&variant=IDP** returns IDP roster and IDP scoring template.
- [ ] **GET /api/sport-defaults?sport=SOCCER&load=creation** returns Soccer roster and scoring; no NFL/IDP.

### Player pool and teams

- [ ] **No sport leak:** Soccer league creation and league view only load Soccer players and Soccer teams; NFL only NFL; no mixing.
- [ ] **IDP players:** In an NFL IDP league, player pool includes defensive players (when present in DB); IDP positions filter correctly; eligibility for IDP slots works.
- [ ] **Soccer teams and logos:** Soccer league shows Soccer team list and logos; resolution uses sport SOCCER.

### Frontend

- [ ] **Preview panel:** For NFL IDP preset, preview shows IDP roster summary and “NFL offensive + defensive (IDP)”. For Soccer, preview shows soccer roster and “Soccer players (GKP, DEF, MID, FWD)”. Preview updates when changing sport or preset.
- [ ] **Submission:** Create request body includes `sport` and `leagueVariant` (NFL/Soccer as implemented). Created league reflects chosen sport and variant.

### Backward compatibility

- [ ] **Existing NFL (non-IDP) leagues:** List, detail, roster, scoring, draft, waiver unchanged; no IDP slots or rules applied.
- [ ] **Existing leagues without leagueVariant:** Resolution with `leagueVariant = null` uses default format; behavior unchanged.

---

## 5. End-to-end validation summary

- **Creation path:** User selects sport (and for NFL, preset) → frontend loads preset from sport-defaults API → preview shows roster/scoring/player pool/defaults → user submits → API stores `sport` and `leagueVariant` and fills defaults (with IDP scoring when variant is IDP) → bootstrap runs with correct format (IDP for IDP leagues) → roster and scoring templates attached by sport + format.
- **Runtime path:** For an existing league, any code that needs roster or scoring must use **format = getScoringFormatForLeague(league.sport, league.leagueVariant)** (or equivalent) and pass it into template/resolver calls so IDP leagues get IDP templates and Soccer gets soccer templates. Player pool and team metadata are already scoped by `league.sport`; no cross-sport leak when the league’s sport is used consistently.
- **Validation:** League creation and initialization are correct for all supported sports and variants (NFL standard/PPR/Superflex/IDP/Dynasty IDP, Soccer, NBA, MLB, NHL, NCAAF, NCAAB) provided (1) create API stores sport and leagueVariant and sets IDP scoring default when applicable (done), and (2) any post-creation flows that resolve roster/scoring by league use league.leagueVariant to derive format (documented; audit recommended for draft/waiver/lineup).

---

## 6. Explanation of end-to-end validation for sport defaults

End-to-end validation for the sport defaults system means checking that **from league creation through to runtime (draft, waiver, lineup, settings)** the correct sport and variant are used everywhere:

1. **Creation:** The API accepts sport and (for NFL) leagueVariant, persists both, fills defaults from the right registry (including IDP scoring when variant is IDP), and runs bootstrap with the correct format so roster and scoring templates match the chosen preset (e.g. IDP vs standard, Soccer vs NFL).
2. **Templates and defaults:** Each sport (and for NFL, each variant like IDP) has a well-defined default roster and scoring template. Validation confirms that the sport-defaults API and the bootstrap use the same keys (sport + format) and that in-memory defaults exist for SOCCER and NFL IDP.
3. **Player pool and teams:** Every league-scoped query (player pool, team list, logos) must filter by the league’s sport so Soccer leagues never see NFL players and NFL leagues never see Soccer players. IDP players are part of the NFL pool and appear only when the league is NFL; slot eligibility (IDP vs standard) is determined by the league’s variant/format.
4. **Runtime resolution:** After creation, any code that resolves “roster template” or “scoring rules” for a league must use the league’s stored sport and leagueVariant to compute the format (e.g. via `getScoringFormatForLeague(league.sport, league.leagueVariant)`) and pass it into the template/resolver. That way IDP leagues keep getting IDP roster and scoring on draft/waiver/lineup and existing non-IDP leagues keep getting standard roster and scoring.

End-to-end validation therefore covers: create with each sport and variant → check DB and bootstrap → then (where implemented) load draft/waiver/lineup for that league and confirm roster slots, scoring rules, and player pool match the sport and variant, with no cross-sport leak and no wrong format for IDP vs standard.
