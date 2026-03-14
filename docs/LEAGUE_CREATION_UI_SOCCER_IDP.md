# League Creation UI/UX: Soccer and NFL IDP Presets

## Overview

The league creation flow lets users create **Soccer** leagues and **NFL IDP** leagues through the same UI. The UX makes it clear that **Soccer is its own sport** and **IDP is an NFL preset (league type variant)**; selecting a preset updates roster and scoring defaults and a **preset summary** preview shows before creation. Backend submission sends both `sport` and `leagueVariant` so the correct defaults and bootstrap are applied.

## UI/UX architecture

- **LeagueCreationSportSelector** — Renders the sport dropdown (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) and optional helper text: "Soccer is its own sport with soccer-specific roster and scoring. For NFL, choose a preset (e.g. Standard, PPR, IDP) below."
- **LeagueCreationPresetSelector** — Renders the league preset dropdown only when the sport has multiple variants (e.g. NFL: Standard, PPR, Half PPR, Superflex, IDP, Dynasty IDP). Helper: "Choosing a preset (e.g. IDP, Dynasty IDP) updates roster and scoring defaults automatically." For Soccer and other sports (single variant) the component returns null.
- **SportPresetLoader** — Implemented as the **useSportPreset(sport, variant)** hook. Fetches `GET /api/sport-defaults?sport=X&load=creation&variant=Y` when sport or (for NFL) variant changes; returns preset payload for prefill and preview.
- **LeagueSettingsPreviewPanel** — Displays a "Preset summary" when preset is loaded: roster (starter slots + bench), scoring format, player pool type (Soccer vs NFL offensive vs NFL IDP), and league defaults (teams, playoffs, season). Footer explains that the preset updates defaults and the user can still change league size and other options before creating.
- **League creation initialization** — Form uses preset in useEffect to set league size, scoring (for NFL non-IDP), and default league name pattern. No separate "LeagueCreationInitializationService" module; initialization is in StartupDynastyForm. Backend **runLeagueBootstrap** (LeagueBootstrapOrchestrator) runs after league create and uses sport and scoring format (e.g. 'IDP' for IDP/DYNASTY_IDP) to attach roster and scoring.

## Frontend component updates

- **StartupDynastyForm** — Uses LeagueCreationSportSelector, LeagueCreationPresetSelector, and LeagueSettingsPreviewPanel. Sends **leagueVariant** in the create request: NFL → selected preset value; Soccer → 'STANDARD'; other sports → undefined. Resets leagueVariant to STANDARD when switching to a non-NFL sport (e.g. Soccer). Conditionally shows QB Format and Scoring only for NFL non-IDP; for NFL IDP shows "IDP scoring applied from preset"; for Soccer shows "Standard soccer scoring (goals, assists, clean sheets, etc.)."
- **components/league-creation/** — New folder: LeagueCreationSportSelector, LeagueCreationPresetSelector, LeagueSettingsPreviewPanel, index exports.

## Backend workflow

- **Preset API:** GET /api/sport-defaults?sport=SOCCER|NFL&load=creation&variant=IDP (optional) returns full creation payload (roster, rosterTemplate, scoringTemplate, league, etc.). LeagueCreationDefaultsLoader uses LeaguePresetResolver when NFL + IDP/DYNASTY_IDP.
- **Create API:** POST /api/league/create accepts sport and leagueVariant; stores both on League; for IDP/DYNASTY_IDP passes formatType 'IDP' to runLeagueBootstrap so roster and scoring templates are IDP.
- **Flow:** User selects Sport (e.g. NFL) → optionally Preset (e.g. IDP) → preset loads → preview updates → user fills name, platform, size, etc. → submit sends sport + leagueVariant → backend creates league and runs bootstrap with correct format.

## Validation

- **Unchanged:** League name required; platform league ID required when platform is Sleeper or ESPN. No extra validation for Soccer or IDP.
- **Submit:** Create button disabled while submitting; payload always includes sport and leagueVariant when applicable.

## Communication (UX copy)

- **Soccer:** "Soccer is its own sport" (sport selector helper). Preview shows "Soccer players (GKP, DEF, MID, FWD)" and soccer roster/scoring.
- **IDP:** "IDP is an NFL league type (preset)" (preset selector label "League preset"; helper "Choosing a preset… updates roster and scoring defaults automatically"). Preview shows "NFL offensive + defensive (IDP)" and IDP roster/scoring.
- **Preview:** "Selecting a preset updates roster and scoring defaults above. You can change league size and other options before creating."

## Summary

| Area | Soccer | NFL IDP |
|------|--------|---------|
| **Sport** | Choose "Soccer" | Choose "NFL" |
| **Preset** | Hidden (Standard) | Choose Standard / PPR / Half PPR / Superflex / IDP / Dynasty IDP |
| **Preview** | Roster, scoring, "Soccer players", defaults | Roster (with IDP slots), "IDP scoring", "NFL offensive + defensive (IDP)", defaults |
| **Conditional fields** | No QB Format; soccer scoring note | IDP: no QB/Scoring dropdowns; "IDP scoring applied" |
| **Submit** | sport=SOCCER, leagueVariant=STANDARD | sport=NFL, leagueVariant=IDP or DYNASTY_IDP etc. |

Existing NFL standard creation and other sports are unchanged; Soccer and NFL IDP are additive with clear preset selection and preview.
