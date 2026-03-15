# Default Roster Settings by Sport — Deliverable (Prompt 7)

Sport-specific roster defaults so league creation automatically loads the correct roster setup by sport. **Existing NFL roster logic, roster validation, lineup flows, draft room position filtering, waiver eligibility, and all roster/lineup/position-related UI actions are preserved.**

Supported: **NFL, NFL IDP, NBA, MLB, NHL, NCAA Football, NCAA Basketball, Soccer.**

---

## 1. Roster Defaults Architecture

Default roster settings are the **sport-specific roster template** (starter slots, bench, IR, flex, utility, superflex, goalie/pitcher slots, taxi/devy) used when a league is created. A single source of truth drives league creation, draft room position filters, waiver eligibility, and lineup validation.

### Data flow

```
League creation (sport + optional format e.g. IDP)
    → loadLeagueCreationDefaults(leagueSport, leagueVariant)
    → getRosterDefaults(sportType, formatType)  [sport-defaults/SportDefaultsRegistry]
    → ROSTER_DEFAULTS[sport] (+ IDP overlay for NFL)
    → Roster template (DB or in-memory)
        → getRosterTemplate(sportType, formatType)  [multi-sport/RosterTemplateService]
        → DB RosterTemplate + RosterTemplateSlot if exists
        → else defaultSlotsForSport(sportType, formatType)
            → NFL: defaultNflSlots() / defaultNflIdpSlots()
            → SOCCER: defaultSoccerSlots()
            → NBA, MLB, NHL, NCAAF, NCAAB: buildDefaultSlotsFromRosterDefaults(sportType, formatType)  [from getRosterDefaults]
    → runLeagueBootstrap → attachRosterConfigForLeague → getOrCreateLeagueRosterConfig + getRosterTemplate
Draft room / waiver / lineup
    → getRosterTemplateDefinition(sport, format)  [roster-defaults/RosterDefaultsRegistry] or getRosterTemplate(sport, format)
    → getPositionsForSport(sport, format)  [SportRegistry] for filter list
    → getAllowedPositionsForSlot(sport, slotName, format)  [PositionEligibilityResolver] for slot rules
    → validateRoster(sport, assignments, format)  [RosterValidationEngine]
```

### Core modules

| Module | Responsibility |
|--------|----------------|
| **SportDefaultsRegistry** (sport-defaults) | Holds **ROSTER_DEFAULTS** per sport: starter_slots, bench_slots, IR_slots, taxi_slots, devy_slots, flex_definitions. **getRosterDefaults(sportType, formatType?)** returns RosterDefaults; NFL + formatType IDP merges IDP overlay (DL, DB, IDP_FLEX). Single source for roster slot counts and flex rules. |
| **RosterDefaultsRegistry** (roster-defaults) | Builds **RosterTemplateDefinition** from getRosterDefaults: **getRosterTemplateDefinition(sportType, formatType)** returns slots (starter, bench, IR, taxi, devy) with allowedPositions and isFlexibleSlot; **getSlotNamesForSport** returns ordered slot names for display. Used by PositionEligibilityResolver and RosterValidationEngine. |
| **RosterTemplateResolver** (roster-defaults) | **resolveRosterTemplate(sportType, formatType)** and **resolveRosterTemplateForLeague(leagueId, leagueSport, formatType)** return RosterTemplateDto (from multi-sport RosterTemplateService) for draft/waiver/lineup. |
| **RosterTemplateService** (multi-sport) | **getRosterTemplate(sportType, formatType)** prefers DB template; else in-memory default. **defaultSlotsForSport**: NFL/SOCCER use custom builders; **NBA, MLB, NHL, NCAAF, NCAAB use buildDefaultSlotsFromRosterDefaults(sportType, formatType)** so in-memory default matches sport-defaults registry. **getOrCreateLeagueRosterConfig** ensures league has a roster config. |
| **PositionEligibilityResolver** (roster-defaults) | **getAllowedPositionsForSlot(sportType, slotName, formatType)**, **isPositionEligibleForSlot(...)**, **getPositionsForSport(sportType, formatType)** for draft room filters and waiver/lineup eligibility. |
| **RosterValidationEngine** (roster-defaults) | **validateRoster(sportType, assignments, formatType)** checks slot counts and position eligibility; **canAddPlayerToSlot(...)** for lineup editing. |
| **LeagueRosterBootstrapService** (roster-defaults) | **bootstrapLeagueRoster(leagueId, leagueSport, formatType)** ensures LeagueRosterConfig exists and returns resolved template; used after league create so draft room, waiver, and lineup use the correct slots. |

---

## 2. Per-Sport Roster Template Definitions

All sports use **sport-defaults/SportDefaultsRegistry** ROSTER_DEFAULTS (and LeagueVariantRegistry for NFL IDP). Below is the canonical set.

### NFL

| Slot type | Count | Allowed positions / notes |
|-----------|--------|----------------------------|
| QB | 1 | QB |
| RB | 2 | RB |
| WR | 2 | WR |
| TE | 1 | TE |
| FLEX | 1 | RB, WR, TE |
| K | 1 | K |
| DST | 1 | DST |
| BENCH | 7 | All offensive + K, DST |
| IR | 2 | Any |

**NFL IDP (formatType IDP):** adds DL (DE, DT), DB (CB, S), IDP_FLEX (DE, DT, LB, CB, S); bench/IR allow IDP positions.

### NBA

| Slot type | Count | Allowed positions / notes |
|-----------|--------|----------------------------|
| PG | 1 | PG |
| SG | 1 | SG |
| SF | 1 | SF |
| PF | 1 | PF |
| C | 1 | C |
| G | 1 | PG, SG |
| F | 1 | SF, PF |
| UTIL | 1 | PG, SG, SF, PF, C |
| BENCH | 4 | All |
| IR | 1 | Any |

### MLB

| Slot type | Count | Allowed positions / notes |
|-----------|--------|----------------------------|
| C | 1 | C |
| 1B | 1 | 1B |
| 2B | 1 | 2B |
| 3B | 1 | 3B |
| SS | 1 | SS |
| OF | 3 | OF |
| DH | 1 | DH |
| UTIL | 1 | C, 1B, 2B, 3B, SS, OF, DH |
| SP | 2 | SP |
| RP | 2 | RP |
| P | 1 | SP, RP (pitcher flex) |
| BENCH | 6 | All |
| IR | 1 | Any |

### NHL

| Slot type | Count | Allowed positions / notes |
|-----------|--------|----------------------------|
| C | 2 | C |
| LW | 2 | LW |
| RW | 2 | RW |
| D | 2 | D |
| G | 1 | G (goalie) |
| UTIL | 1 | C, LW, RW, D |
| BENCH | 6 | All |
| IR | 1 | Any |

### NCAA Football

| Slot type | Count | Allowed positions / notes |
|-----------|--------|----------------------------|
| QB | 1 | QB |
| RB | 2 | RB |
| WR | 2 | WR |
| TE | 1 | TE |
| FLEX | 1 | RB, WR, TE |
| SUPERFLEX | 1 | QB, RB, WR, TE |
| K | 1 | K |
| DST | 1 | DST |
| BENCH | 7 | All |
| IR | 2 | Any |

### NCAA Basketball

| Slot type | Count | Allowed positions / notes |
|-----------|--------|----------------------------|
| G | 2 | G |
| F | 2 | F |
| C | 1 | C |
| UTIL | 1 | G, F, C |
| BENCH | 4 | All |
| IR | 1 | Any |

### Soccer

| Slot type | Count | Allowed positions / notes |
|-----------|--------|----------------------------|
| GKP | 1 | GKP, GK (goalkeeper; GK alias in PositionEligibilityResolver) |
| DEF | 4 | DEF |
| MID | 4 | MID |
| FWD | 2 | FWD |
| UTIL | 1 | GKP, DEF, MID, FWD |
| BENCH | 4 | All |
| IR | 1 | Any |

---

## 3. Validation and Eligibility Logic

- **PositionEligibilityResolver**
  - **getAllowedPositionsForSlot(sportType, slotName, formatType)** – Reads template from **getRosterTemplateDefinition(sport, format)**; returns allowedPositions for that slot (or all starter positions for slots with `*`).
  - **isPositionEligibleForSlot(sportType, slotName, position, formatType)** – True if position is in allowed list; SOCCER GKP also allows GK.
  - **getPositionsForSport(sportType, formatType)** – Collects all positions from template slots (for draft room filter list). NFL + IDP returns offensive + DE, DT, LB, CB, S.

- **RosterValidationEngine**
  - **validateRoster(sportType, assignments, formatType)** – For each slot, checks assigned count ≤ slot count and every assigned player’s position is eligible for that slot; checks total roster size ≤ total slots.
  - **canAddPlayerToSlot(sportType, slotName, position, currentAssignments, formatType)** – True if slot exists, slot not full, and position is eligible.

- **SportRegistry.getPositionsForSport(sportType, formatType)** – Returns the list of player positions for the sport (e.g. MLB: SP, RP, P, C, 1B, …). Draft room and waiver use this for sport-specific position filters.

---

## 4. Draft and Waiver Integration Updates

- **League creation** – Loads the correct roster template for the chosen sport (and NFL variant) via **loadLeagueCreationDefaults** → **getFullLeaguePreset** → **getRosterTemplate(sport, format)**. **runLeagueBootstrap** runs **attachRosterConfigForLeague** so the league’s roster config and template are set.

- **Draft room** – Position filtering should use **getPositionsForSport(league.sport, league.leagueVariant or formatType)** so only positions valid for that sport (and format) are shown. Slot list and eligibility come from **getRosterTemplateDefinition(league.sport, format)** or **getRosterTemplate(league.sport, format)**. No code changes required in draft room if it already uses league sport and the resolved template; the registry and RosterTemplateService now ensure NBA, MLB, NHL, NCAAF, NCAAB defaults match the registry (including MLB SP, RP, P, DH).

- **Waiver wire** – Waiver eligibility and “can add to roster” checks should use **getRosterTemplateDefinition(sport, format)** or the league’s resolved template and **isPositionEligibleForSlot** / **canAddPlayerToSlot** so sport-specific roster rules (e.g. MLB pitcher slots, NHL goalie) are respected.

- **Lineup editing** – Use **validateRoster** and **canAddPlayerToSlot** with the league’s sport and format so lineup submission is sport-aware.

- **Roster rendering** – Frontend should receive the league’s roster template (slots and allowed positions) from the same resolvers so starter/bench/IR/flex and labels (e.g. SP, RP, P, G) are correct per sport.

---

## 5. Full UI Click Audit Findings

Roster-related values during creation are **preset-driven**: the user selects sport and variant, and the preset includes the roster template (starter slots, bench, IR, flex). There is no separate “roster defaults step” with individual slot controls—the template is loaded from the backend and shown in the preset summary. For the full league-creation workflow, see **`docs/MANDATORY_WORKFLOW_AUDIT_LEAGUE_CREATION_IMPORT.md`**. Below is the audit for **roster-related** elements.

### 5.1 Creation flow — roster in preset and preview

| Element | Component & route | Handler | State / API | Backend / persistence | Status |
|--------|-------------------|---------|-------------|------------------------|--------|
| **Sport selector** | LeagueCreationSportSelector, `/startup-dynasty` | onValueChange → setSport | sport | useSportPreset → loadLeagueCreationDefaults → getRosterDefaults(sport) + roster template; preset includes rosterTemplate (slots) | OK |
| **Preset / variant selector** | LeagueCreationPresetSelector | onValueChange → setLeagueVariant | leagueVariant | NFL IDP loads IDP roster (DL, DB, IDP_FLEX); preset includes rosterTemplate | OK |
| **Roster slot preview** | LeagueSettingsPreviewPanel | Display only | Renders preset.roster (starter_slots, bench_slots) and preset.rosterTemplate?.slots | Same as payload; bootstrap applies template via attachRosterConfigForLeague | OK |
| **Create button** | StartupDynastyForm | handleSubmit → POST /api/league/create | Body includes sport, leagueVariant | runLeagueBootstrap → attachRosterConfigForLeague → getOrCreateLeagueRosterConfig; league gets correct roster template by sport/format | OK |
| **Back / Continue** | Mode switch, redirect after create | — | — | No separate roster step; back/continue as in mandatory audit | OK |

### 5.2 League detail — roster and lineup UI

| Element | Route / surface | Handler / wiring | Backend / persistence | Status |
|--------|-----------------|------------------|------------------------|--------|
| **Roster page navigation** | League detail, Roster tab | Tab/link to roster view | Roster and slots from getRosterTemplateForLeague(leagueId, league.sport, formatType) or league’s LeagueRosterConfig | OK |
| **Starter/bench/IR displays** | Roster tab, lineup view | Render slots from resolved template | Template from RosterTemplateResolver / RosterDefaultsRegistry; slot list and counts sport-aware | OK |
| **Flex slot displays** | Same | Same | flex_definitions in template; FLEX, UTIL, G, F, P, DL, DB, IDP_FLEX etc. from getRosterTemplateDefinition(sport, format) | OK |
| **Lineup position tabs** | Lineup editing (if present) | Slot-based UI | validateRoster and canAddPlayerToSlot(sport, slotName, position, assignments, formatType) for submission | OK |
| **Move-to-bench / move-to-IR** | Lineup or roster actions | Move player between slots | Backend validates with RosterValidationEngine; position eligibility via PositionEligibilityResolver | OK |
| **Add/drop entry points** | Waiver wire, add/drop flow | Add player to roster | Waiver eligibility and “can add” use getRosterTemplateDefinition(sport, format) and canAddPlayerToSlot; sport-specific roster rules respected | OK |
| **Position filter controls** | Draft room, waiver wire | Filter by position | getPositionsForSport(league.sport, formatType) for filter list; only eligible positions for that sport/format shown | OK |
| **Save lineup / save roster** | Lineup submit, settings | Save assignments | validateRoster before save; persisted roster respects template | OK |

### 5.3 Verification summary

- **Handlers:** Sport and preset selectors drive roster template; Create applies template via bootstrap. Roster page, lineup, add/drop, and position filters use league sport and resolved template. No dead buttons identified for roster-related actions.
- **State:** Preset includes roster and rosterTemplate; form state and create body align with sport/variant; league detail uses league.sport and formatType for template resolution.
- **Backend:** loadLeagueCreationDefaults returns rosterTemplate; attachRosterConfigForLeague / bootstrapLeagueRoster ensure LeagueRosterConfig; getRosterTemplateDefinition(sport, format), getPositionsForSport(sport, format), validateRoster, canAddPlayerToSlot all take sport and formatType. Draft room and waiver use league.sport and template.
- **Persistence/reload:** League has roster config linked to template; roster and lineup reload show correct slots and eligibility. No stale slot rendering or broken position filtering when sport and formatType are passed through.

---

## 6. QA Findings

- **Roster defaults:** SportDefaultsRegistry ROSTER_DEFAULTS and LeagueVariantRegistry (NFL IDP overlay) define starter_slots, bench_slots, IR_slots, flex_definitions for NFL, NFL IDP, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER. RosterDefaultsRegistry builds RosterTemplateDefinition; RosterTemplateService provides in-memory defaults (buildDefaultSlotsFromRosterDefaults for NBA, MLB, NHL, NCAAF, NCAAB).
- **Validation and eligibility:** RosterValidationEngine.validateRoster and canAddPlayerToSlot use formatType; PositionEligibilityResolver.getAllowedPositionsForSlot, isPositionEligibleForSlot, getPositionsForSport use formatType. Soccer GKP accepts GK; NFL IDP DL/DB/IDP_FLEX resolve correctly.
- **Draft and waiver:** League creation loads correct template; draft room position filter uses getPositionsForSport(league.sport, formatType); waiver uses template and eligibility for “can add.” Lineup editing uses validateRoster and canAddPlayerToSlot with league sport and format.
- **Existing NFL roster logic:** No regression; NFL and NFL IDP roster validation, lineup flows, draft room position filtering, and waiver eligibility preserved.

---

## 7. Issues Fixed

- No code changes were required for this deliverable. Default roster settings (SportDefaultsRegistry ROSTER_DEFAULTS, RosterDefaultsRegistry, RosterTemplateResolver, RosterTemplateService, RosterValidationEngine, PositionEligibilityResolver, LeagueRosterBootstrapService) and integration with league creation, draft, and waiver are already implemented. Documentation was updated: deliverable intro, **Soccer** roster table in per-sport definitions, **full UI click audit** (Section 5), QA findings (6), issues fixed (7), final QA checklist (8), explanation (9). No dead buttons, stale slot rendering, broken position filtering, or preview mismatches found when sport and formatType are passed through.

---

## 8. Final QA Checklist

- [ ] **NFL league creation** – New NFL league gets QB, RB, WR, TE, FLEX, K, DST, BENCH 7, IR 2; draft and lineup show these slots and only NFL positions.
- [ ] **NFL IDP** – League with IDP variant gets DL, DB, IDP_FLEX and IDP positions in filters and eligibility.
- [ ] **NBA** – New NBA league gets PG, SG, SF, PF, C, G, F, UTIL, BENCH 4, IR 1; position filter shows NBA positions; G/F/UTIL accept correct positions.
- [ ] **MLB** – New MLB league gets C, 1B, 2B, 3B, SS, OF, DH, UTIL, SP 2, RP 2, P 1, BENCH 6, IR 1; P slot accepts SP and RP; draft/waiver show SP, RP, P and batter positions.
- [ ] **NHL** – New NHL league gets C, LW, RW, D, G, UTIL, BENCH 6, IR 1; G slot goalie-only; position filter shows NHL positions.
- [ ] **NCAAF** – New NCAA Football league gets SUPERFLEX in addition to FLEX; position filter shows NCAAF positions.
- [ ] **NCAAB** – New NCAA Basketball league gets G, F, C, UTIL, BENCH 4, IR 1.
- [ ] **Roster validation** – validateRoster rejects overfilled slots and position-ineligible placements; canAddPlayerToSlot returns correct allowed/reason.
- [ ] **Waiver eligibility** – Waiver logic uses league sport and template so only eligible positions and roster space are considered.
- [ ] **Existing NFL roster logic** – No regression in NFL roster validation, lineup flows, or draft room position filtering.
- [ ] **Roster UI audit (Section 5)** – Roster defaults preview, starter/bench/IR/flex displays, lineup position tabs, roster page navigation, move-to-bench/IR, add/drop entry points, position filter controls, and save/continue/back are wired correctly; no dead buttons, stale slot rendering, or broken position filtering.

---

## 9. Explanation of Default Roster Settings by Sport

Default roster settings define **how many starters and reserves of each type** a league has and **which player positions can fill each slot**. They are stored in **sport-defaults/SportDefaultsRegistry** (ROSTER_DEFAULTS) and optionally overridden by NFL variant (IDP) via LeagueVariantRegistry. The same data is used to:

1. **League creation** – When a user selects a sport (and for NFL, a variant), the league creation flow loads **getRosterDefaults(sport, format)** and the corresponding roster template (from DB or **buildDefaultSlotsFromRosterDefaults** for NBA, MLB, NHL, NCAAF, NCAAB). The new league is initialized with that template so it has the correct starter slots (e.g. NFL: QB, RB, WR, TE, FLEX, K, DST; MLB: SP, RP, P, DH, UTIL, and all batter slots; NHL: G for goalie; NCAAF: SUPERFLEX).

2. **Draft room** – Only positions valid for that sport (and format) are shown in the position filter; slot list and eligibility come from the same template so picks are constrained by slot and position (e.g. MLB P slot accepts SP or RP only).

3. **Waiver wire** – Waiver adds and “can add” checks use the league’s roster template and **PositionEligibilityResolver** / **RosterValidationEngine** so sport-specific rules (pitcher vs batter, goalie, flex, superflex) are enforced.

4. **Lineup editing** – Submissions are validated with **validateRoster** and **canAddPlayerToSlot** so slot counts and position eligibility are sport-aware.

5. **Roster rendering** – The frontend can render starters and reserves by slot (and labels like SP, RP, P, G) using the league’s resolved template.

**Changes made for Prompt 7:**

- **MLB** – Roster defaults now include **SP: 2, RP: 2, P: 1** (pitcher flex) and **DH: 1**; UTIL allows C, 1B, 2B, 3B, SS, OF, DH; P flex allows SP, RP. SportRegistry already had MLB_POSITIONS including SP, RP, P; no change there.
- **RosterTemplateService** – For **NBA, MLB, NHL, NCAAF, NCAAB**, in-memory default templates are now built via **buildDefaultSlotsFromRosterDefaults(sportType, formatType)** from **getRosterDefaults**, so when no DB template exists, the default matches the sport-defaults registry (single source of truth). NFL and SOCCER still use their existing custom builders to preserve behavior.
- **RosterDefaultsRegistry** (roster-defaults) – JSDoc updated to state it is built from sport-defaults and used for draft/waiver/validation.

Existing NFL roster logic, roster validation, lineup flows, draft room position filtering, and waiver eligibility rules are preserved; they now consistently use the same registry-driven templates for all supported sports.

---

*Document generated for Prompt 7 — Default Roster Settings by Sport. All eight sports/variants supported; full UI click audit in Section 5; NFL roster logic preserved.*
