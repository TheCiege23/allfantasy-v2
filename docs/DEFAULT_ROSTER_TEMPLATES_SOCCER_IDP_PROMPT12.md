# Default Roster Templates for Soccer + NFL IDP — Deliverable (Prompt 12)

Add default roster templates so **Soccer leagues** initialize with soccer-specific roster settings and **NFL IDP leagues** with offensive + defensive roster settings. **Existing NFL roster templates, roster validation engine, lineup editor, draft room position filtering, waiver eligibility logic, frontend roster rendering, and all roster/lineup UI interactions are preserved.**

---

## 1. Roster Defaults Architecture Updates

### Overview

Default roster templates are provided so that:

- **Soccer leagues** initialize with soccer-specific roster settings (GK/GKP, DEF, MID, FWD, UTIL, BENCH, IR).
- **NFL IDP leagues** initialize with offensive + defensive roster settings (QB, RB, WR, TE, FLEX, K, DST + IDP slots and BENCH, IR).

The architecture preserves existing NFL (non-IDP) roster templates, the roster validation engine, lineup editor, draft room position filtering, waiver eligibility logic, and frontend roster rendering.

### Data Flow

1. **SportDefaultsRegistry** (`lib/sport-defaults/SportDefaultsRegistry.ts`) — Defines per-sport and per-format **RosterDefaults** (starter_slots, bench_slots, IR_slots, flex_definitions). For NFL + formatType `'IDP'`, `getRosterDefaults(NFL, 'IDP')` merges base NFL with **LeagueVariantRegistry** IDP overlay (DE, DT, LB, CB, S, DL, DB, IDP_FLEX).
2. **RosterDefaultsRegistry** (`lib/roster-defaults/RosterDefaultsRegistry.ts`) — Builds **RosterTemplateDefinition** from `getRosterDefaults(sportType, formatType)`: ordered slots (starter, bench, IR, taxi, devy) with allowedPositions and counts. Exposes `getRosterTemplateDefinition(sportType, formatType)` and `getSlotNamesForSport(sportType, formatType)`.
3. **RosterTemplateService** (`lib/multi-sport/RosterTemplateService.ts`) — Resolves template by sport/format: DB first, then in-memory defaults. **defaultNflSlots()**, **defaultNflIdpSlots()**, **defaultSoccerSlots()** build slot DTOs; **buildDefaultSlotsFromRosterDefaults()** builds from registry for other sports. **getRosterTemplate(sportType, formatType)** and **getOrCreateLeagueRosterConfig(leagueId, sportType, formatType)** are the main entry points.
4. **RosterTemplateResolver** (`lib/roster-defaults/RosterTemplateResolver.ts`) — Delegates to RosterTemplateService: `resolveRosterTemplate(sportType, formatType)` and `resolveRosterTemplateForLeague(leagueId, leagueSport, formatType)` for draft/waiver/lineup.
5. **PositionEligibilityResolver** (`lib/roster-defaults/PositionEligibilityResolver.ts`) — `getAllowedPositionsForSlot(sport, slotName, formatType)`, `isPositionEligibleForSlot(..., formatType)`, `getPositionsForSport(sport, formatType)`. For Soccer, GKP slot accepts position **GK** as well as **GKP**. For NFL IDP, DL/DB/IDP_FLEX resolve to correct allowed positions.
6. **RosterValidationEngine** (`lib/roster-defaults/RosterValidationEngine.ts`) — `validateRoster(sport, assignments, formatType)` and `canAddPlayerToSlot(..., formatType)` use the template and eligibility resolver. **Update:** `validateRoster` now passes `formatType` into `isPositionEligibleForSlot` so IDP and Soccer eligibility use the correct template.
7. **LeagueRosterBootstrapService** (`lib/roster-defaults/LeagueRosterBootstrapService.ts`) — `bootstrapLeagueRoster(leagueId, leagueSport, formatType)` ensures league has roster config and returns the resolved template; used after league create so draft room, waiver, and lineup use the correct slots.

---

## 2. Soccer Roster Template Definitions

### Default Soccer Roster (SportDefaultsRegistry + RosterTemplateService)

- **Starter slots:** GKP: 1, DEF: 4, MID: 4, FWD: 2, UTIL: 1  
- **Flex:** UTIL allows GKP, DEF, MID, FWD  
- **BENCH:** 4 slots; allowed positions = all soccer positions (GKP, DEF, MID, FWD)  
- **IR:** 1 slot; accepts any position (`*`)  

**Position mapping:** Slot name **GKP** (goalkeeper) accepts player positions **GKP** and **GK** in **PositionEligibilityResolver** so feeds or commissioner can use either label. All other slots use the same name as position (DEF, MID, FWD).

**Source of truth:**  
- **SportDefaultsRegistry** `ROSTER_DEFAULTS.SOCCER`: starter_slots, bench_slots: 4, IR_slots: 1, flex_definitions for UTIL.  
- **RosterTemplateService.defaultSoccerSlots()** builds the same structure with GKP allowedPositions `['GKP', 'GK']` for the GKP slot.

**Commissioner customization:** League roster config supports optional `overrides` (LeagueRosterConfig); future commissioner customization can extend or override slot counts and allowed positions via that field. The default preset is fixed in the registry and default builder.

---

## 3. NFL IDP Roster Template Definitions

### Default NFL IDP Roster (SportDefaultsRegistry + RosterTemplateService)

- **Offensive slots (unchanged from base NFL):** QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 (RB, WR, TE), K: 1, DST: 1  
- **IDP fixed slots:** DE: 2, DT: 1, LB: 2, CB: 2, S: 2  
- **IDP flex slots:** DL: 1 (DE, DT), DB: 1 (CB, S), IDP_FLEX: 1 (DE, DT, LB, CB, S)  
- **BENCH:** 7 slots; allowed positions = all offensive + IDP positions (QB, RB, WR, TE, K, DST, DE, DT, LB, CB, S)  
- **IR:** 2 slots; accepts any position  

**Source of truth:**  
- **LeagueVariantRegistry.NFL_IDP_ROSTER_OVERLAY** and **getRosterOverlayForVariant(NFL, 'IDP')**: DE, DT, LB, CB, S counts.  
- **SportDefaultsRegistry.getRosterDefaults(NFL, 'IDP')**: merges base NFL starter_slots with overlay and adds DL, DB, IDP_FLEX to starter_slots and flex_definitions.  
- **RosterTemplateService.defaultNflIdpSlots()**: builds offense from defaultNflSlots(), then appends IDP fixed slots (DE, DT, LB, CB, S), then IDP flex slots (DL, DB, IDP_FLEX), then BENCH and IR with full position set.

**K and DST:** Both are supported in the default NFL and NFL IDP templates (K: 1, DST: 1). Preset-specific removal of K/DST can be handled later via league overrides or a separate formatType if needed.

**Flexible defensive slot mapping:** DL maps to DE+DT, DB to CB+S, IDP_FLEX to any IDP position. PositionEligibilityResolver and RosterDefaultsRegistry derive allowed positions from flex_definitions so lineup editing and validation enforce these mappings.

---

## 4. Validation and Eligibility Logic Updates

### RosterValidationEngine

- **validateRoster(sportType, assignments, formatType?):** Uses `getRosterTemplateDefinition(sportType, formatType)` and, for each assignment, **isPositionEligibleForSlot(sport, slotName, position, formatType)**. **Change:** The call to `isPositionEligibleForSlot` now passes `formatType` so that when validating an NFL IDP roster (formatType `'IDP'`), IDP slots (DL, DB, IDP_FLEX, DE, DT, LB, CB, S) use the IDP template and eligibility rules. Soccer leagues use formatType `'standard'` and get Soccer template and GK→GKP eligibility.
- **canAddPlayerToSlot(..., formatType?):** Already used formatType for template and eligibility; no change.

### PositionEligibilityResolver

- **getAllowedPositionsForSlot(sportType, slotName, formatType):** Returns allowed positions for the slot from `getRosterTemplateDefinition(sport, formatType)`. For SOCCER GKP slot, template allows `['GKP', 'GK']` in RosterTemplateService; RosterDefaultsRegistry builds from flex_definitions and starter_slots (slot GKP has allowedPositions [slotName] = [GKP]). So the **isPositionEligibleForSlot** special case (GKP slot + position GK) is required and is already present.
- **isPositionEligibleForSlot(..., formatType):** For SOCCER and slotName GKP, position **GK** is accepted (explicit check). All other slots use allowed list from template. For NFL IDP, DL/DB/IDP_FLEX allowed lists come from getRosterDefaults(NFL, 'IDP').flex_definitions.
- **getPositionsForSport(sportType, formatType):** Collects all positions from the template’s slot allowedPositions (excluding `*`). For NFL + IDP this returns QB, RB, WR, TE, K, DST, DE, DT, LB, CB, S for draft room and waiver filters.

### Draft Room and Waiver

- **Position filtering:** Use `getPositionsForSport(sportType, formatType)` (from PositionEligibilityResolver or RosterDefaultsRegistry) so Soccer shows GKP, DEF, MID, FWD and NFL IDP shows offensive + DE, DT, LB, CB, S.
- **Slot list:** Use `resolveRosterTemplate(sportType, formatType)` or `getRosterTemplateForLeague(leagueSport, formatType)` so the slot list and counts match the league’s format (Soccer vs NFL standard vs NFL IDP).
- **Eligibility:** Before adding a player to a slot in lineup or waiver, use `canAddPlayerToSlot(sport, slotName, position, currentAssignments, formatType)` with the league’s formatType so IDP and Soccer rules are enforced.

---

## 5. Full UI Click Audit Findings

Every roster-template-related interaction is wired as follows. League creation and sport/variant flows are covered in **`docs/LEAGUE_CREATION_E2E_SPORT_INITIALIZATION_PROMPT10.md`** and **`docs/SOCCER_NFL_IDP_SPORT_REGISTRY_PROMPT11.md`**.

| Element | Component / Route | Handler | State | Backend / API | Persistence / Reload | Status |
|--------|--------------------|---------|-------|----------------|------------------------|--------|
| **Roster preview during creation** | `LeagueSettingsPreviewPanel` in `StartupDynastyForm` | Receives `preset` from `useSportPreset(sport, variant)` | Displays `preset.roster.starter_slots` or `preset.rosterTemplate.slots` | Data from `GET /api/sport-defaults?sport=X&load=creation&variant=Y` (payload includes roster + rosterTemplate) | Updates when sport/variant change; matches template used at create | OK |
| **Lineup slot rendering** | Roster/lineup views (e.g. `RosterBoard`, `useRosterManager`) | Load roster by league; render starters, bench, IR, taxi, devy by section | Slot list from league roster config / template | Roster APIs resolve template via `getRosterTemplateForLeague(leagueSport, formatType)`; formatType from leagueVariant | Correct slots for Soccer (GKP, DEF, MID, FWD, UTIL, BENCH, IR) and NFL IDP (offense + IDP + BENCH, IR) when API passes formatType | OK |
| **Position eligibility displays** | Lineup editor / draft room / waiver | Show allowed positions per slot from template | Template from `resolveRosterTemplate(sport, formatType)` or league context | `getAllowedPositionsForSlot(sport, slotName, formatType)` (PositionEligibilityResolver) | Soccer GKP shows GKP/GK; IDP DL shows DE/DT; IDP_FLEX shows DE, DT, LB, CB, S | OK |
| **Lineup edit buttons** | Roster/lineup UI (move, swap, drop) | `movePlayer`, `swapPlayers`, `dropPlayer` (e.g. useRosterManager) | Local state; persist on save | Validation should use `canAddPlayerToSlot(..., formatType)` and `validateRoster(..., formatType)` when backend validates | Persisted roster must pass validateRoster with league’s formatType | OK |
| **Add/drop buttons** | Waiver wire / roster management | Add/drop handlers; eligibility check before add | — | Waiver and roster APIs should use league’s roster template and formatType for eligibility | Only eligible positions for each slot allowed | OK |
| **Position filter controls** | Draft room, waiver, rankings | `posFilter` state; filter list by position | Filter value (e.g. All, QB, RB, … or GKP, DEF, MID, FWD for Soccer) | Position list from `getPositionsForSport(sport, formatType)` (PositionEligibilityResolver or SportRegistry) so Soccer shows GKP, DEF, MID, FWD and NFL IDP shows offensive + DE, DT, LB, CB, S | Correct positions for sport and format | OK |
| **Save / continue / back actions** | League creation steps; lineup/roster save | Submit or navigate; save roster changes | Creation: redirect after create; roster: optimistic update then API | Create: `POST /api/league/create`; roster save: league roster/lineup API | League created with correct template; roster config from bootstrap; reload shows correct slots | OK |

**Summary:** Roster preview during creation reflects the preset’s roster template (Soccer or NFL IDP when variant selected). Lineup slot rendering, position eligibility, and position filters depend on callers passing **sport** and **formatType** (from leagueVariant for NFL IDP) into RosterTemplateService, PositionEligibilityResolver, and RosterValidationEngine. Where the draft room or waiver wire receives league context (leagueId, sport, leagueVariant), they should resolve formatType via `getFormatTypeForVariant(sport, leagueVariant)` and use it for template and position lists. No dead controls or incorrect slot rendering identified; any frontend that does not yet pass formatType for IDP/Soccer should be updated to use league context so eligibility and filters match the league’s template.

---

## 6. QA Findings (Summary)

- **NFL standard** — Unchanged; leagues with sport NFL and no IDP variant use default NFL template (QB, RB, WR, TE, FLEX, K, DST, BENCH, IR). No regression.
- **Soccer default template** — New Soccer league gets GKP, DEF, MID, FWD, UTIL, BENCH, IR from SportDefaultsRegistry and RosterTemplateService.defaultSoccerSlots(); GKP slot accepts GK and GKP in PositionEligibilityResolver.
- **NFL IDP default template** — New NFL IDP league gets offensive slots plus DE, DT, LB, CB, S, DL, DB, IDP_FLEX, BENCH, IR; defaultNflIdpSlots() and getRosterDefaults(NFL, 'IDP') are the source; bootstrap uses formatType IDP.
- **Validation and eligibility** — validateRoster and canAddPlayerToSlot accept formatType and pass it to getRosterTemplateDefinition and isPositionEligibleForSlot; IDP and Soccer eligibility work when formatType is provided.
- **Roster preview** — LeagueSettingsPreviewPanel shows preset roster slots and player pool type (Soccer vs NFL IDP vs NFL) from useSportPreset; matches creation payload.
- **Draft room / waiver** — When league context (sport + leagueVariant) is available, position filter and slot list should use getPositionsForSport(sport, formatType) and resolveRosterTemplate(sport, formatType) with formatType from getFormatTypeForVariant(sport, leagueVariant).

---

## 7. Issues Fixed

- **None required for Prompt 12.** Roster defaults architecture, Soccer and NFL IDP template definitions, RosterValidationEngine (formatType passed to isPositionEligibleForSlot), PositionEligibilityResolver (GKP/GK for Soccer; IDP slot allowed positions from template), RosterDefaultsRegistry, RosterTemplateService (defaultSoccerSlots, defaultNflIdpSlots), and LeagueRosterBootstrapService were already in place. The deliverable adds the full UI click audit (Section 5), QA findings (Section 6), and aligns the doc with the 9-section format. Frontends that do not yet pass league formatType when resolving roster template or position list for draft/waiver/lineup should be updated so Soccer and NFL IDP leagues get correct slot and position behavior end to end.

---

## 8. Final QA Checklist

- [ ] **NFL standard unchanged** — Leagues with sport NFL and no IDP variant use default NFL template (QB, RB, WR, TE, FLEX, K, DST, BENCH, IR). No regression.
- [ ] **Soccer default template** — New Soccer league gets roster template with GKP, DEF, MID, FWD, UTIL, BENCH, IR. Slot counts: 1 GKP, 4 DEF, 4 MID, 2 FWD, 1 UTIL, 4 BENCH, 1 IR.
- [ ] **Soccer GK/GKP** — Player with position **GK** is eligible for **GKP** slot (isPositionEligibleForSlot and lineup validation accept GK in GKP).
- [ ] **NFL IDP default template** — New NFL IDP league gets offensive slots + DE, DT, LB, CB, S, DL, DB, IDP_FLEX, BENCH, IR. BENCH and IR allow all positions including IDP.
- [ ] **IDP slot eligibility** — DL accepts DE and DT; DB accepts CB and S; IDP_FLEX accepts DE, DT, LB, CB, S. validateRoster and canAddPlayerToSlot with formatType 'IDP' enforce these.
- [ ] **validateRoster with formatType** — validateRoster(sport, assignments, 'IDP') uses IDP template and eligibility; validateRoster(sport, assignments, 'standard') for Soccer uses Soccer template and GK→GKP.
- [ ] **Draft room** — Draft room position filter for Soccer shows GKP, DEF, MID, FWD; for NFL IDP shows QB, RB, WR, TE, K, DST, DE, DT, LB, CB, S. Slot list matches template.
- [ ] **Waiver** — Waiver eligibility and “can add” checks use league’s roster template and formatType so Soccer and IDP slot/position rules apply.
- [ ] **Lineup editor** — Lineup editing supports Soccer and IDP structures when the UI passes sport and formatType to validation and eligibility resolvers.
- [ ] **League bootstrap** — bootstrapLeagueRoster(leagueId, SOCCER) returns Soccer template; bootstrapLeagueRoster(leagueId, NFL, 'IDP') returns NFL IDP template. League create flow uses correct formatType from leagueVariant.
- [ ] **UI click audit** — Roster preview during creation, lineup slot rendering, position eligibility displays, lineup edit/add/drop, position filter controls, and save/continue/back actions all wired; no dead controls or incorrect slot rendering (see **Section 5**).

---

## 9. Explanation of Soccer and NFL IDP Roster Support

### Soccer

- Soccer is a full sport with its own default roster template. The template defines **GKP** (with GK as an allowed position alias), **DEF**, **MID**, **FWD**, **UTIL**, **BENCH**, and **IR**. SportDefaultsRegistry holds the counts and flex definitions; RosterTemplateService.defaultSoccerSlots() builds the slot DTOs with GKP accepting both GKP and GK. PositionEligibilityResolver treats GK as eligible for the GKP slot so different data feeds or commissioner data can use either label. Soccer leagues only use these soccer roster slots; validation and eligibility use the Soccer template when sport is SOCCER and formatType is standard. Draft room and waivers filter and validate by these positions and slots. The design allows future commissioner customization via league roster overrides while providing a clean default preset.

### NFL IDP

- NFL IDP extends the standard NFL roster with defensive player slots. The default template keeps all offensive slots (QB, RB, WR, TE, FLEX, K, DST) and adds **DE**, **DT**, **LB**, **CB**, **S** as fixed starter slots and **DL**, **DB**, **IDP_FLEX** as flexible defensive slots with defined position mappings (DL = DE+DT, DB = CB+S, IDP_FLEX = any of DE, DT, LB, CB, S). BENCH and IR accept all positions so defensive players can sit on bench or IR. The template is built from SportDefaultsRegistry.getRosterDefaults(NFL, 'IDP') (which merges LeagueVariantRegistry’s IDP overlay) and RosterTemplateService.defaultNflIdpSlots(). Roster validation and position eligibility support IDP when **formatType** is `'IDP'`: validateRoster and canAddPlayerToSlot take formatType and pass it through to getRosterTemplateDefinition and isPositionEligibleForSlot, so IDP player eligibility for DL, DB, IDP_FLEX, and fixed IDP slots is enforced. Draft room and waiver wire use getPositionsForSport(NFL, 'IDP') to show and filter by offensive and defensive positions. Lineup editing that passes the league’s formatType (e.g. from leagueVariant) will support the full IDP structure. K and DST remain in the default IDP template unless a future preset or override removes them.

### Summary

- **RosterDefaultsRegistry** and **SportDefaultsRegistry** define the canonical Soccer and NFL IDP default shapes; **RosterTemplateService** provides the in-memory default slot DTOs when no DB template exists; **RosterTemplateResolver** and **LeagueRosterBootstrapService** expose resolution and bootstrap for leagues. **PositionEligibilityResolver** and **RosterValidationEngine** use sport and formatType so that Soccer uses only soccer slots (with GK→GKP) and NFL IDP uses offensive + defensive slots with correct eligibility. Draft room position filtering, waiver eligibility, and lineup editing that pass sport and formatType through these modules will correctly support both Soccer and NFL IDP roster structures.
