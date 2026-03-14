# QA Checklist: Soccer and NFL IDP

## League creation

- [ ] **Soccer creation:** Create a league with sport = Soccer. Confirm default league name pattern, team count, roster slots (GKP, DEF, MID, FWD, UTIL, BENCH, IR), and scoring (goal, assist, clean_sheet, etc.) match Soccer defaults.
- [ ] **NFL IDP creation:** Create a league with sport = NFL and variant = IDP. Confirm roster includes IDP slots (DE, DT, LB, CB, S) and scoring includes IDP stats (tackles, sacks, interceptions, etc.). Bootstrap format should be IDP.
- [ ] **NFL Dynasty IDP creation:** Create with variant = Dynasty IDP. Same IDP roster and scoring as IDP; dynasty settings applied.
- [ ] **NFL standard unchanged:** Create NFL league with variant = Standard or PPR (or no variant). Confirm behavior matches existing NFL flow: no IDP slots, standard/PPR scoring, no regression.
- [ ] **Variant in request:** Confirm POST /api/league/create accepts `leagueVariant` and that created league has `leagueVariant` persisted.
- [ ] **Preset API with variant:** GET /api/sport-defaults?sport=NFL&load=creation&variant=IDP returns IDP roster and scoring template; without variant returns standard NFL preset.

## Frontend

- [ ] **Sport dropdown:** Soccer appears in sport list and can be selected.
- [ ] **NFL variant dropdown:** When sport is NFL, league variant dropdown appears with options: Standard, PPR, Half PPR, Superflex, IDP, Dynasty IDP. Selection is sent as `leagueVariant` on create.
- [ ] **Preset prefill:** Changing NFL variant (e.g. to IDP) refetches preset and updates roster/scoring defaults shown or used for creation.
- [ ] **Non-NFL sports:** For Soccer/NBA/etc., variant dropdown either hidden or single “Standard” option; no incorrect IDP application.

## League list and detail

- [ ] **List includes leagueVariant:** GET /api/league/list returns `leagueVariant` for each league where applicable. UI can show or filter by variant if needed.
- [ ] **Detail:** League detail views that need variant (e.g. settings, roster config) receive or resolve `leagueVariant` correctly.

## Roster and scoring resolution

- [ ] **NFL IDP roster:** Leagues with sport=NFL and leagueVariant=IDP (or DYNASTY_IDP) use roster template that includes IDP positions (DE, DT, LB, CB, S).
- [ ] **NFL IDP scoring:** Same leagues use scoring template with IDP stat keys (e.g. idp_tackle_solo, idp_sack, idp_interception).
- [ ] **Soccer roster/scoring:** Soccer leagues use Soccer roster template (GKP, DEF, MID, FWD, UTIL, etc.) and Soccer scoring template.
- [ ] **Backward compatibility:** Existing NFL leagues (no variant or STANDARD/PPR/HALF_PPR/SUPERFLEX) continue to use non-IDP roster and scoring; no IDP slots or rules applied.

## Regression

- [ ] **Existing NFL flows:** Create and view existing NFL (non-IDP) leagues; sync, draft, waiver, matchups unaffected.
- [ ] **Other sports:** NBA, MLB, NHL, NCAAF, NCAAB league creation and defaults unchanged.
- [ ] **Sport defaults API:** GET /api/sport-defaults?sport=NFL and sport=SOCCER without variant return correct defaults; with variant=IDP for NFL returns IDP preset.
