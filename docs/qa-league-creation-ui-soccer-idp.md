# QA Checklist: League Creation UI/UX — Soccer & NFL IDP

## Sport and preset selection

- [ ] **Sport selector:** User can choose Soccer and NFL (and other sports). Soccer appears as "Soccer"; helper text states "Soccer is its own sport with soccer-specific roster and scoring. For NFL, choose a preset (e.g. Standard, PPR, IDP) below."
- [ ] **NFL preset selector:** When sport is NFL, "League preset" dropdown appears with: Standard, PPR, Half PPR, Superflex, IDP, Dynasty IDP. Helper text: "Choosing a preset (e.g. IDP, Dynasty IDP) updates roster and scoring defaults automatically."
- [ ] **Soccer / other sports:** When sport is Soccer (or NBA, MLB, etc.), preset dropdown is hidden (single Standard variant). No confusion that IDP is Soccer.
- [ ] **Preset loading:** Changing sport or (for NFL) preset triggers useSportPreset fetch; "Loading preset…" shows while loading; form prefill (league name pattern, team count, scoring) updates when preset loads.

## Preview panel

- [ ] **LeagueSettingsPreviewPanel:** When preset is loaded, a "Preset summary" section shows: Roster (starter slots + bench), Scoring (format name), Player pool type (Soccer vs NFL offensive vs NFL IDP), Defaults (teams, playoffs, season). Footer text: "Selecting a preset updates roster and scoring defaults above. You can change league size and other options before creating."
- [ ] **Soccer preset:** Preview shows soccer roster slots (e.g. GKP, DEF, MID, FWD, UTIL), Standard scoring, "Soccer players (GKP, DEF, MID, FWD)".
- [ ] **NFL IDP preset:** Preview shows offensive + IDP slots, IDP scoring, "NFL offensive + defensive (IDP)".
- [ ] **Preview updates:** Changing NFL preset to IDP or Dynasty IDP updates the summary before submit.

## Conditional fields (UX)

- [ ] **NFL non-IDP:** QB Format (Superflex / 1QB) and Scoring (PPR, Half PPR, etc.) are visible and editable.
- [ ] **NFL IDP / Dynasty IDP:** QB Format and Scoring dropdown hidden; inline text: "IDP scoring (offensive + defensive stats) applied from preset."
- [ ] **Soccer:** QB Format hidden; inline text: "Standard soccer scoring (goals, assists, clean sheets, etc.)." League Size and other options still available.
- [ ] **League Format (Dynasty/Keeper)** and **League Size** always visible for all sports.

## Backend submission and workflow

- [ ] **Submit payload:** POST /api/league/create includes `sport` and `leagueVariant` when applicable: NFL → leagueVariant = selected preset (e.g. PPR, IDP); Soccer → leagueVariant = 'STANDARD'; other sports → leagueVariant omitted or undefined.
- [ ] **Backend storage:** Created league has sport and leagueVariant persisted; IDP leagues get bootstrap with formatType 'IDP'.
- [ ] **Current NFL flow:** Creating NFL with preset Standard or PPR works as before; no regression; leagueVariant stored.

## Validation

- [ ] **Validation unchanged:** League name required; platform league ID required when platform is Sleeper or ESPN. No new required fields for Soccer or IDP.
- [ ] **Submit disabled when loading:** Create button disabled during submit; sport and preset selectors disabled during submit if desired.

## Components and architecture

- [ ] **LeagueCreationSportSelector:** Renders sport dropdown and optional helper; used in StartupDynastyForm.
- [ ] **LeagueCreationPresetSelector:** Renders preset dropdown when variantOptions.length > 1; returns null for Soccer/other so only NFL sees preset picker.
- [ ] **LeagueSettingsPreviewPanel:** Receives preset, sport, presetLabel; renders summary list and footer.
- [ ] **SportPresetLoader:** useSportPreset(sport, variant) loads preset from GET /api/sport-defaults?sport=X&load=creation&variant=Y; form uses it for prefill and preview.
- [ ] **League creation initialization:** Form initializes from preset in useEffect (league size, scoring, league name pattern); backend runLeagueBootstrap uses sport and scoring format (IDP for IDP/DYNASTY_IDP) after create.

## Regression

- [ ] **NFL Standard/PPR creation:** Full flow works; preset loads; create succeeds; league has correct roster and scoring.
- [ ] **Other sports (NBA, MLB, etc.):** No change to their flow; no Soccer/IDP UI shown for them.
- [ ] **Manual vs Sleeper/ESPN:** Platform and league ID validation and submission unchanged.
