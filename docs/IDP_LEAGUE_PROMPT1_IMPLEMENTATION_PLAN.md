# IDP League — Cursor Prompt 1 of 6: Implementation Plan (No Code)

**Project target:** Implement IDP (Individual Defensive Player) as a **football-only specialty format** that plugs into the existing offensive fantasy flow.  
**Constraints:** Do not restart or replace working systems; merge with current architecture and specialty league factory; NFL only; return full files only in later prompts; deterministic first, AI second.

---

## 1. Implementation Plan

### 1.1 Current state (from repo inspection)

- **IDP is already a variant, not a specialty league.** It is driven by `League.leagueVariant` = `'IDP'` or `'DYNASTY_IDP'` and does **not** use the specialty registry (Guillotine, Survivor, Big Brother, etc.). Creation flow uses `leagueVariantInput` and `LeagueCreationDefaultsLoader` with variant `IDP`/`DYNASTY_IDP` to load roster + scoring + draft + waiver defaults.
- **Roster:** `SportDefaultsRegistry.getRosterDefaults('NFL','IDP')` returns base NFL plus **DL:1, DB:1, IDP_FLEX:1** and flex_definitions for DL (DE/DT), DB (CB/S), IDP_FLEX (DE/DT/LB/CB/S). `LeagueVariantRegistry.NFL_IDP_ROSTER_OVERLAY` defines **DE:2, DT:1, LB:2, CB:2, S:2** (granular). Today the overlay is merged in `LeaguePresetResolver` for IDP, but `getRosterDefaults` in SportDefaultsRegistry **overwrites** with only DL/DB/IDP_FLEX. So the **granular preset (DE/DT/LB/CB/S)** is not the default; the **family preset (DL/LB/DB + IDP_FLEX)** is.
- **Scoring:** `ScoringDefaultsRegistry` has a single **NFL-IDP** template with rules for idp_solo_tackle, idp_assist_tackle, idp_tackle_for_loss, idp_qb_hit, idp_sack, idp_interception, idp_pass_defended, idp_forced_fumble, idp_fumble_recovery, idp_defensive_touchdown, idp_safety, idp_blocked_kick. There are **no** separate templates for tackle-heavy vs big-play-heavy.
- **Positions:** `team-abbrev` and `idp-kicker-values` normalize DE/DT→DL, CB/S/SS/FS→DB, LB/ILB/OLB/MLB→LB. **DL, LB, DB, IDP_FLEX** and **DE, DT, LB, CB, S** are all supported in normalization and eligibility. `RosterDefaultsRegistry` and `PositionEligibilityResolver` use `formatType` so IDP slots and allowed positions work.
- **Draft:** `getDraftDefaults('NFL','IDP')` returns rounds_default 18, queue_size_limit 60. Draft board uses `getPlayerPoolForLeague` (sport-scoped); **no** position filter by default, so IDP players appear if they exist in `SportsPlayer` with positions DE/DT/LB/CB/S (or DL/DB).
- **Waiver:** Same as NFL; `rosterGuard` is not used for IDP. Waiver process uses roster size and eligibility; IDP slots are part of roster template so eligibility is correct when `formatType` is passed.
- **Trade / rankings:** `value-context-service` has `idpEnabled` and `idpModifiers` (LB/DL/DB/EDGE) and scoring type (tackle_heavy, big_play, balanced). `rankingsEngine` uses `computeLeagueIdpScarcity` and `adjustIdpValue`. `idpTuning` has scarcity and weights. Trade evaluator and AI prompts mention IDP value (e.g. 0.15–0.25x offensive).
- **Lineup / weekly scoring:** `MultiSportMatchupScoringService.computeRosterScoreForWeek` uses `PlayerGameStat` (normalizedStatMap, fantasyPoints) and `resolveScoringRulesForLeague(leagueId, leagueSport, formatType)`. If `formatType` is IDP (from league settings/variant), rules include IDP rules. **So IDP scoring works if:** (1) league’s format is resolved as IDP, and (2) `PlayerGameStat` rows for defensive players have `normalizedStatMap` with idp_* keys. **Gap:** The pipeline that **populates** `PlayerGameStat` for NFL (Sleeper sync, etc.) must write IDP stats with the same idp_* keys; otherwise defensive players score 0.
- **Player pool:** `SportsPlayer` has `position`. `getPlayerPoolForLeague` filters by sport; optional `position` filter exists. For IDP leagues, defensive players must be present in `SportsPlayer` (DE, DT, LB, CB, S or DL, DB). That depends on **ingestion** (Sleeper/ESPN/other) including defensive players and correct position.

### 1.2 High-level implementation phases

1. **Align roster construction and presets**  
   - Support both “family” (DL/LB/DB + IDP_FLEX) and “granular” (DE/DT/LB/CB/S + optional IDP_FLEX) as configurable presets.  
   - Ensure commissioner can create a league with either style and, if desired, customize counts (e.g. 2 LB, 1 DL, 1 DB, 1 IDP_FLEX).  
   - Reuse `getRosterDefaults`, `LeaguePresetResolver`, and `LeagueVariantRegistry`; add or parameterize presets (e.g. “IDP Family” vs “IDP Granular”) and ensure creation wizard and API pass the chosen preset.

2. **Scoring styles**  
   - Add two additional scoring templates (or template variants): **tackle-heavy** (e.g. higher tackle values, lower big-play) and **big-play-heavy** (e.g. higher sack/INT/FF).  
   - Keep current NFL-IDP as **balanced**.  
   - Store league’s chosen IDP scoring style (balanced / tackle_heavy / big_play_heavy) in league settings or scoring config and resolve template accordingly in `MultiSportScoringResolver` / `getLeagueScoringRules`.

3. **Data pipeline for IDP stats**  
   - Identify where `PlayerGameStat` is written for NFL (Sleeper sync, league-import, or other).  
   - Ensure defensive players get rows with `normalizedStatMap` containing idp_solo_tackle, idp_assist_tackle, idp_sack, etc., using the same keys as in `ScoringDefaultsRegistry`.  
   - If the source uses different keys (e.g. “tackle”, “ast”), add a mapping layer to normalized idp_* keys.

4. **Player pool and draft**  
   - Confirm NFL player ingestion includes defensive players with positions DE, DT, LB, CB, S (or DL, DB) so they appear in draft and waivers.  
   - Draft room and waiver wire already use `getPlayerPoolForLeague` and position eligibility from `PositionEligibilityResolver`; ensure league’s `formatType` (IDP) is passed so IDP slots and filters work.  
   - Optionally add an “IDP” position filter or tab in draft/waiver UI for clarity.

5. **Lineup validation**  
   - Ensure lineup submission and validation use roster template with `formatType` IDP so IDP slots are required and eligibility (DE/DT in DL, etc.) is enforced.  
   - Reuse `RosterValidationEngine` and `PositionEligibilityResolver.isPositionEligibleForSlot(sport, slotName, position, 'IDP')`.

6. **AI and UX**  
   - Extend AI context (trade evaluator, waiver, Chimmy, draft advice) so that when league is IDP, defensive players and IDP scoring style are mentioned and valued appropriately (existing IDP modifiers and prompts are a base).  
   - Add minimal “IDP” surface in league creation (e.g. “IDP” / “Dynasty IDP” already in variant dropdown), and in league settings expose “IDP scoring style” (balanced / tackle-heavy / big-play) and optionally “IDP roster preset” (family vs granular) if we add both.

7. **Optional: IDP as a “specialty” in the factory**  
   - Product says “IDP should plug into the existing offensive fantasy flow, not replace it.” So IDP remains a **variant** (leagueVariant = IDP/DYNASTY_IDP) that augments roster and scoring, not a separate specialty with its own config table and home component like Guillotine.  
   - If desired, register an **optional** lightweight spec in `specialty-league/registry.ts` for `idp` (e.g. detect by leagueVariant, no rosterGuard, no custom home) only for future extensibility (e.g. IDP-specific tips or links). This is **not** required for core product goals.

---

## 2. Architecture Map

- **League creation:** `app/api/league/create` → `runPostCreateInitialization`; defaults from `LeagueCreationDefaultsLoader.loadLeagueCreationDefaults(leagueSport, leagueVariant)` which uses `LeaguePresetResolver` and `getRosterDefaults`/`getDraftDefaults`/`getWaiverDefaults`/scoring. For NFL + IDP/DYNASTY_IDP, preset already returns IDP roster and scoring.  
- **Roster template:** `SportDefaultsRegistry.getRosterDefaults(NFL, 'IDP')` → DL/DB/IDP_FLEX + flex_definitions. `LeagueVariantRegistry.getRosterOverlayForVariant(NFL, 'IDP')` → DE/DT/LB/CB/S counts. `LeaguePresetResolver` merges overlay into rosterDefaults for IDP. `RosterDefaultsRegistry.getRosterTemplateDefinition(NFL, 'IDP')` → slots for draft/waiver/lineup.  
- **Scoring:** `ScoringDefaultsRegistry.getDefaultScoringTemplate(NFL, 'IDP')` → NFL_IDP_RULES. `MultiSportScoringResolver.resolveScoringRulesForLeague(leagueId, leagueSport, formatType)` → formatType from league variant/settings. `FantasyPointCalculator.computeFantasyPoints(stats, rules)` is stat-key agnostic; idp_* keys in stats + IDP rules = IDP points.  
- **Matchup / weekly score:** `MultiSportMatchupScoringService.computeRosterScoreForWeek` uses `PlayerGameStat` + `resolveScoringRulesForLeague`; starter vs bench is determined by caller (lineup).  
- **Draft:** Draft room uses league sport and roster template; `getRosterTemplateDefinition(NFL, 'IDP')` and `getAllowedPositionsForSlot`/`getPositionsForSport` drive position filters. Player pool from `getPlayerPoolForLeague(leagueId, NFL)`.  
- **Waiver:** Same player pool and roster size; eligibility by slot uses same template.  
- **Trade / rankings:** `trade-engine` (value-context-service, rankingsEngine, idpTuning) already has idpEnabled, idpModifiers, idpScarcity, adjustIdpValue.  
- **AI:** Trade evaluator, waiver AI, ai-player-context, and Chimmy get league context; when idpEnabled or leagueVariant IDP, existing prompts and modifiers apply.

---

## 3. Reusable Files / Modules to Extend

| Area | File(s) | Purpose |
|------|--------|--------|
| Roster defaults | `lib/sport-defaults/SportDefaultsRegistry.ts` | Add or parameterize IDP roster presets (family vs granular); keep single source of truth. |
| Variant registry | `lib/sport-defaults/LeagueVariantRegistry.ts` | Already has NFL_IDP_ROSTER_OVERLAY; align with SportDefaultsRegistry so one canonical “default” IDP shape or two named presets. |
| League preset | `lib/sport-defaults/LeaguePresetResolver.ts` | Already branches on IDP; ensure resolved roster has desired starter_slots and flex_definitions. |
| Scoring templates | `lib/scoring-defaults/ScoringDefaultsRegistry.ts` | Add NFL-IDP-TACKLE-HEAVY and NFL-IDP-BIG-PLAY (or one template with mode); keep stat keys idp_* for compatibility. |
| Scoring resolution | `lib/multi-sport/MultiSportScoringResolver.ts` | Resolve IDP scoring style from league settings (balanced / tackle_heavy / big_play) to template key. |
| Position eligibility | `lib/roster-defaults/PositionEligibilityResolver.ts` | Already supports formatType; no change if slots and allowedPositions are correct in template. |
| Roster template | `lib/roster-defaults/RosterDefaultsRegistry.ts` | Built from getRosterDefaults; no change if SportDefaultsRegistry returns correct IDP slots. |
| Player pool | `lib/sport-teams/SportPlayerPoolResolver.ts`, `LeaguePlayerPoolBootstrapService.ts` | Already document IDP; ensure callers pass league’s format so filters (if any) apply. |
| Matchup scoring | `lib/multi-sport/MultiSportMatchupScoringService.ts` | Ensure formatType (IDP) and scoring template (including style) are passed when resolving rules. |
| Trade / value | `lib/trade-engine/value-context-service.ts`, `lib/trade-engine/rankingsEngine.ts`, `lib/trade-engine/idpTuning.ts` | Already IDP-aware; optionally add idpScoringType to context and tune modifiers per style. |
| League create | `app/api/league/create/route.ts` | Already sets leagueVariant from input; ensure IDP/DYNASTY_IDP persist and post-create applies IDP defaults. |
| Creation wizard | `lib/sport-defaults/LeagueCreationDefaultsLoader.ts` | Already loads IDP preset; may need to accept “IDP roster preset” (family vs granular) and “IDP scoring style” if we add options. |
| Startup form | `components/StartupDynastyForm.tsx` | Already has IDP/DYNASTY_IDP in variant options; optional: add IDP scoring style or roster preset selector when IDP selected. |
| Draft room | (draft room components that use roster template) | Pass league’s formatType (IDP) so slot list and position filters include IDP positions. |
| Waiver wire | (waiver components + process-engine) | Same; roster size and eligibility already come from league config that includes IDP slots when variant is IDP. |

---

## 4. Likely New Files Needed

| File | Purpose |
|------|--------|
| `lib/idp/IDPRosterPresets.ts` (or under sport-defaults) | Named presets: “idp_family” (DL/LB/DB + IDP_FLEX), “idp_granular” (DE/DT/LB/CB/S + optional IDP_FLEX), with configurable counts. Used by LeaguePresetResolver or SportDefaultsRegistry. |
| `lib/idp/IDPScoringStyles.ts` (optional) | Map style (balanced / tackle_heavy / big_play) to template id or rule overrides; or extend ScoringDefaultsRegistry with two more template entries. |
| Migration or schema change | Only if we store “IDP roster preset” or “IDP scoring style” in League.settings or a small config table; otherwise settings JSON is enough. |
| Tests | `tests/idp-*.test.ts` or extend `tests/league-defaults-qa.test.ts` for IDP roster/scoring/draft/waiver resolution. |

No new API routes are strictly required if league creation and settings already carry variant and scoring format; existing config and scoring resolvers can be extended. If we want an explicit “IDP config” endpoint for the UI, one small route under `app/api/leagues/[leagueId]/idp/` or under settings could return roster preset and scoring style for the league.

---

## 5. Risks / Edge Cases

- **Stats pipeline:** If `PlayerGameStat` is never populated for defensive players (e.g. Sleeper sync only imports offense), IDP leagues will show 0 points for IDP slots until the sync or ingestion is extended. **Mitigation:** Identify the writer(s) of `PlayerGameStat` for NFL and add IDP stat mapping and writes.
- **Position mapping:** Some feeds use “OLB”/“ILB”/“SS”/“FS”; we already normalize to LB/DB. Ensure all IDP positions (DE, DT, LB, CB, S) are present in `SportsPlayer` and that roster template allows them in the right slots (e.g. S in DB, not only CB).
- **Roster preset conflict:** Today two sources define IDP roster: SportDefaultsRegistry (DL/DB/IDP_FLEX) and LeagueVariantRegistry overlay (DE/DT/LB/CB/S). LeaguePresetResolver merges overlay into rosterDefaults; getRosterDefaults for IDP then overwrites with DL/DB/IDP_FLEX. So the **effective** default is family-style. If we want commissioners to choose “granular” by default in some flows, we must unify or name presets and have creation wizard/API select one.
- **Scoring style vs single template:** If we only have one NFL-IDP template, “tackle-heavy” and “big-play-heavy” require either (1) two more template definitions, or (2) league-level overrides (e.g. multiply tackle points by 1.2). Option (1) is clearer and easier to maintain.
- **Draft order and queue:** With more roster spots (offense + IDP), draft rounds and queue size are already 18 and 60 for IDP; confirm UI and timer logic handle larger rosters.
- **Lineup submission:** Ensure the lineup payload and validation accept slot names DL, LB, DB, IDP_FLEX (and DE, DT, CB, S if granular) and that backend validates against the league’s resolved roster template.
- **Mobile / first-time UX:** Product goal is “clean and understandable for first-time IDP users.” Consider short tooltips or one-time explainer for “What is IDP?” and for DL/LB/DB (and DE/DT/CB/S if shown).

---

## 6. Migration Strategy

- **No breaking change to existing leagues.** IDP is opt-in via league variant. Existing offense-only leagues are unchanged.
- **New leagues:** When commissioner selects IDP or Dynasty IDP, existing flow already sets `leagueVariant` and loads IDP defaults. Only enhancement is to (1) align roster preset (family vs granular) and (2) add scoring style choice and templates.
- **Schema:** No Prisma change required unless we add a dedicated `IDPLeagueConfig` or similar; current design uses `League.leagueVariant` and `League.settings` (e.g. scoring_format, idpScoringType, idpRosterPreset).
- **Data:** Ensure defensive players exist in `SportsPlayer` for NFL (from existing or new ingestion). Ensure `PlayerGameStat` can store and look up by playerId for defensive players with idp_* in normalizedStatMap. No one-off backfill of historical IDP stats is in scope unless product requests it.

---

## 7. QA Plan

1. **League creation**  
   - Create league with variant IDP and Dynasty IDP; confirm roster defaults include IDP slots (DL/LB/DB and/or DE/DT/LB/CB/S per preset) and scoring template is NFL-IDP.  
   - Confirm draft default rounds and waiver behavior.  
   - If we add “IDP roster preset” and “IDP scoring style,” create one league per option and verify roster and scoring rules.

2. **Roster and positions**  
   - For an IDP league, load roster template with formatType IDP; verify slots and allowedPositions (e.g. DL accepts DE/DT, DB accepts CB/S, IDP_FLEX accepts all IDP positions).  
   - Verify PositionEligibilityResolver returns correct lists for each slot.

3. **Draft**  
   - In an IDP league, open draft room; verify IDP positions appear in player list and position filter includes DE, DT, LB, CB, S (or DL, LB, DB).  
   - Draft defensive players into IDP slots; confirm no validation errors.

4. **Waiver**  
   - Add/drop defensive players in an IDP league; confirm eligibility and roster size count IDP slots.

5. **Lineup**  
   - Set lineup with offensive and defensive players in correct slots; submit and confirm validation passes.  
   - Confirm “best lineup” or auto-sort (if any) respects IDP slots.

6. **Scoring**  
   - For a league with IDP scoring template, ensure resolveScoringRulesForLeague returns rules including idp_* keys.  
   - If PlayerGameStat rows exist for defensive players with idp_* in normalizedStatMap, run computeRosterScoreForWeek and confirm non-zero IDP points.  
   - If we add tackle-heavy and big-play templates, run scoring resolution for each style and spot-check rule values.

7. **Trade and rankings**  
   - Run trade evaluator and rankings for an IDP league; confirm idpEnabled and modifiers are applied and defensive assets are valued (not zeroed).

8. **AI**  
   - In an IDP league, trigger trade evaluation and waiver advice; confirm responses acknowledge IDP and do not treat defensive players as worthless when IDP is on.

9. **Regression**  
   - Create offense-only NFL league; confirm no IDP slots and no IDP rules.  
   - Confirm other sports and other league types (Guillotine, Survivor, etc.) unchanged.

10. **UX**  
    - League creation: IDP and Dynasty IDP visible and selectable; mobile layout works.  
    - League settings: If we add IDP scoring style or roster preset, ensure they are visible and saved.  
    - No dead buttons; error states and loading states for draft/waiver/lineup remain clear.

---

## 8. Summary

- **IDP is already partially implemented** as an NFL league variant (roster defaults, one scoring template, draft/waiver defaults, trade/rankings/AI awareness).  
- **Position architecture supports** DL/LB/DB, DE/DT/LB/CB/S, and IDP_FLEX via existing normalization and roster template with formatType IDP.  
- **Main gaps:** (1) Unify or explicitly support two roster presets (family vs granular) and ensure creation flow can choose them; (2) Add tackle-heavy and big-play-heavy scoring templates and wire league setting to template resolution; (3) Ensure `PlayerGameStat` and ingestion pipeline populate idp_* stats for defensive players; (4) Ensure draft/waiver/lineup pass formatType IDP everywhere so slots and eligibility are correct.  
- **Reuse:** SportDefaultsRegistry, LeagueVariantRegistry, LeaguePresetResolver, ScoringDefaultsRegistry, MultiSportScoringResolver, PositionEligibilityResolver, RosterDefaultsRegistry, MultiSportMatchupScoringService, FantasyPointCalculator, trade-engine and idpTuning, league create and StartupDynastyForm.  
- **New:** Optional small IDP preset/style modules, additional scoring template entries, and tests.  
- **No code in this chunk;** implementation in subsequent prompts with full files only, labeled [NEW] / [UPDATED], mobile-first, deterministic first.
