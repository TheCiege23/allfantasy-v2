# QA Checklist: Default Roster Templates — Soccer & NFL IDP

## Soccer roster template

- [ ] **Default slots:** New Soccer league gets roster template with GKP (1), DEF (4), MID (4), FWD (2), UTIL (1), BENCH (4), IR (1). Slot order: starters then BENCH then IR.
- [ ] **GK alias:** Player with position "GK" is eligible for GKP slot (PositionEligibilityResolver and lineup validation accept both GKP and GK for goalkeeper).
- [ ] **UTIL flex:** UTIL slot allows GKP, DEF, MID, FWD. Validation and lineup editor treat UTIL as flexible.
- [ ] **BENCH/IR:** BENCH and IR allow all Soccer positions (GKP, DEF, MID, FWD).
- [ ] **League creation:** Creating a Soccer league (sport=SOCCER) initializes roster config from default Soccer template; bootstrap uses formatType 'standard'.
- [ ] **Draft room:** Position filter list for Soccer includes GKP, DEF, MID, FWD (and UTIL if shown). Slot list matches template.
- [ ] **Waiver eligibility:** Waiver logic uses Soccer template; eligible positions and slot counts correct.
- [ ] **Lineup editor:** Soccer leagues show correct starter slots (GKP, DEF, MID, FWD, UTIL) and BENCH/IR; drag/drop and validation use template.

## NFL IDP roster template

- [ ] **Offensive slots preserved:** IDP template includes full offense: QB (1), RB (2), WR (2), TE (1), FLEX (1), K (1), DST (1). Same as non-IDP NFL.
- [ ] **IDP fixed slots:** DE (2), DT (1), LB (2), CB (2), S (2) present with correct counts and allowed positions.
- [ ] **IDP flex slots:** DL (1) allows DE, DT; DB (1) allows CB, S; IDP_FLEX (1) allows DE, DT, LB, CB, S. Validation treats these as flexible.
- [ ] **BENCH/IR for IDP:** BENCH and IR allow all positions including DE, DT, LB, CB, S (and offensive). RosterDefaultsRegistry builds BENCH allowed list from all starter slot positions (offense + IDP).
- [ ] **League creation:** Creating NFL league with variant IDP or DYNASTY_IDP uses formatType 'IDP'; bootstrap attaches IDP roster template.
- [ ] **getRosterTemplate(NFL, 'IDP'):** Returns template with offense + IDP fixed + DL/DB/IDP_FLEX + BENCH + IR. Same for getRosterTemplateDefinition(NFL, 'IDP').
- [ ] **Draft room:** For IDP league, position filter includes QB, RB, WR, TE, K, DST, DE, DT, LB, CB, S. Slot list includes all IDP slots.
- [ ] **Waiver eligibility:** IDP positions (DE, DT, LB, CB, S) eligible for IDP slots and BENCH/IR when league is IDP.
- [ ] **Lineup editor:** IDP leagues show offensive slots plus DE, DT, LB, CB, S, DL, DB, IDP_FLEX, BENCH, IR. Validation with formatType 'IDP' passes for valid assignments.
- [ ] **validateRoster(sport, assignments, formatType):** When formatType is 'IDP', uses IDP template; IDP slots and position eligibility enforced.
- [ ] **canAddPlayerToSlot(..., formatType):** With formatType 'IDP', DE can go in DE or DL or IDP_FLEX; CB in CB or DB or IDP_FLEX; etc.

## Validation and eligibility

- [ ] **getRosterTemplateDefinition(sport, formatType):** Optional formatType supported; NFL + 'IDP' returns IDP definition; otherwise standard.
- [ ] **getAllowedPositionsForSlot(sport, slot, formatType):** For NFL IDP, DL returns [DE, DT], DB returns [CB, S], IDP_FLEX returns [DE, DT, LB, CB, S].
- [ ] **isPositionEligibleForSlot(sport, slot, position, formatType):** With formatType 'IDP', LB eligible for LB and IDP_FLEX; without formatType, IDP slots not in template so no false positives.
- [ ] **getPositionsForSport(sport, formatType):** From PositionEligibilityResolver (template-derived) and from SportRegistry; NFL + IDP returns offensive + IDP positions.

## Backward compatibility

- [ ] **NFL standard/PPR:** Leagues without IDP variant use standard NFL template (no IDP slots). getRosterTemplate(NFL, 'standard') and getRosterTemplate(NFL, 'PPR') unchanged.
- [ ] **Existing callers:** getRosterTemplateDefinition(sport) with one argument still works (formatType 'standard'). validateRoster(sport, assignments) without formatType uses standard template.
- [ ] **RosterDefaultsRegistry buildSlotsFromRegistry:** BENCH allowed positions computed from all player positions (flex definitions + non-flex slot names); IDP adds DE, DT, LB, CB, S to BENCH.

## League roster bootstrap

- [ ] **bootstrapLeagueRoster(leagueId, leagueSport, formatType):** When formatType is 'IDP', resolved template is IDP; when 'standard', standard. League create passes formatType from leagueVariant.
- [ ] **getLeagueRosterTemplate(leagueSport, formatType):** Returns correct template for display and validation when formatType provided.

## Modules touched

- [ ] **SportRegistry:** getPositionsForSport(sport, format?) returns NFL_IDP_POSITIONS for NFL+IDP.
- [ ] **SportDefaultsRegistry:** getRosterDefaults(sport, format?) returns merged IDP starter_slots and flex_definitions for NFL+IDP.
- [ ] **RosterTemplateService:** defaultNflIdpSlots includes DL, DB, IDP_FLEX; BENCH/IR use full IDP position set; defaultSoccerSlots GKP allows ['GKP','GK'].
- [ ] **RosterDefaultsRegistry:** getRosterTemplateDefinition(sport, format?); buildSlotsFromRegistry(sport, format?); BENCH uses union of player positions; getSlotNamesForSport(sport, format?).
- [ ] **RosterValidationEngine:** validateRoster and canAddPlayerToSlot accept optional formatType.
- [ ] **PositionEligibilityResolver:** getAllowedPositionsForSlot, isPositionEligibleForSlot, getPositionsForSport accept optional formatType; GK allowed for GKP in Soccer.
- [ ] **MultiSportRosterService:** isPositionAllowedForSport(sport, position, formatType?) for IDP position set.
