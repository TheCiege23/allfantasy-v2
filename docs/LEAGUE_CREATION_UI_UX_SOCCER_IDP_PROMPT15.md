# League Creation UI/UX for Soccer + NFL IDP Presets — Deliverable (Prompt 15)

Update the league creation UI and workflow so users can create **Soccer leagues** and **NFL IDP leagues** through the existing experience without confusion. **Current league creation UI, sport selector, NFL creation flow, preset loading flow, validation and submission flow, and all league creation clicks, selectors, previews, and actions are preserved.**

---

## 1. UI/UX Architecture Updates

### Overview

The league creation flow allows users to create **Soccer leagues** and **NFL IDP leagues** through the same experience without confusion. The UI clearly communicates that Soccer is its own sport and that IDP is an NFL preset (league type variant); selecting a preset updates roster and scoring defaults automatically, and a preview summarizes roster, scoring, player pool, and league defaults before creation.

### Flow (Preserved + Clarified)

1. **Sport** — User selects sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, **Soccer**). Helper text states that **Soccer** is its own sport and **IDP** is an NFL preset chosen in the next step.
2. **Preset (SportPresetLoader)** — When sport changes, **useSportPreset(sport, variant)** fetches `GET /api/sport-defaults?sport=X&load=creation&variant=Y`. For NFL, variant is the selected preset (Standard, PPR, Half PPR, Superflex, IDP, Dynasty IDP). For Soccer, variant is STANDARD. Preview updates when preset loads.
3. **Preset selector** — Shown for all sports that have at least one variant. NFL shows six options (Standard, PPR, Half PPR, Superflex, IDP, Dynasty IDP). Soccer shows one (Standard). Helper explains that selecting a preset changes roster and scoring automatically and that IDP/Dynasty IDP add defensive players and scoring.
4. **Preview panel** — **LeagueSettingsPreviewPanel** shows roster settings, scoring settings, player pool type, and league defaults. Context message when sport is Soccer: “Soccer is its own sport; roster and scoring are soccer-specific.” When NFL + IDP: “IDP is an NFL preset: offensive + defensive roster and scoring.”
5. **Submission** — Form sends **sport** and **leagueVariant** (e.g. NFL + IDP, Soccer + STANDARD). Backend stores sport_type and league_variant; bootstrap applies the correct roster and scoring.

### What Is Preserved

- Current league creation UI (StartupDynastyForm, card layout, fields).
- Current sport selector (LeagueCreationSportSelector with all seven sports).
- Current NFL creation flow (preset choice, QB format, scoring dropdown for non-IDP).
- Current preset loading flow (useSportPreset → GET /api/sport-defaults).
- Current validation and submission flow (validate name/platform ID; POST /api/league/create with sport and leagueVariant).

---

## 2. Frontend Component Updates

### LeagueCreationSportSelector

- **Helper text** updated to: “**Soccer** is its own sport with its own roster and scoring. **IDP** is an NFL preset (league type) — choose NFL then pick a preset below (Standard, PPR, Superflex, or IDP/Dynasty IDP). Selecting a preset updates roster and scoring automatically.”
- Clarifies that Soccer is its own sport and that IDP is an NFL preset, and that the preset dropdown drives roster/scoring.

### LeagueCreationPresetSelector

- **Visibility:** Now shown whenever `variantOptions.length >= 1` (previously hidden when `<= 1`). So **Soccer** shows a single option “Standard” and **NFL** shows all six presets. Label is “Preset.”
- **Helper text:** “Selecting a preset changes roster and scoring defaults automatically. For NFL, **IDP** and **Dynasty IDP** add defensive players and scoring.”
- JSDoc updated to describe NFL presets (including IDP) and Soccer/other sports (Standard).

### SportPresetLoader (useSportPreset)

- **Variant for Soccer:** StartupDynastyForm now passes `leagueVariant || 'STANDARD'` when sport is Soccer so the preset request includes `variant=STANDARD` when applicable. Preset loads Soccer defaults; preview updates before creation.
- No change to API contract; still `useSportPreset(sport, variant)` with variant optional for non-NFL.

### LeagueSettingsPreviewPanel

- **Context message** added:
  - When sport is **SOCCER:** “Soccer is its own sport; roster and scoring are soccer-specific.”
  - When sport is **NFL** and preset is **IDP** or **Dynasty IDP:** “IDP is an NFL preset: offensive + defensive roster and scoring.”
- **League defaults** line label set to “League defaults:” for clarity.
- **Footnote:** “Roster and scoring above update when you change sport or preset. You can change league size and other options before creating.”
- Preview already showed roster, scoring, player pool type, and league defaults; no structural change.

### LeagueCreationInitializationService

- No frontend component; it is a backend re-export (LeagueCreationInitializer). League creation initialization continues to run after create via LeagueBootstrapOrchestrator. No change.

---

## 3. Backend Workflow Updates

- **POST /api/league/create** — Already accepts `sport` and `leagueVariant`. Stores `League.sport` and `League.leagueVariant`. No change.
- **GET /api/sport-defaults?sport=X&load=creation&variant=Y** — Already returns creation payload for Soccer (variant optional) and for NFL + IDP (variant=IDP or DYNASTY_IDP). No change.
- **LeagueBootstrapOrchestrator** — Runs after league create with sport and scoring format (IDP for IDP leagues). No change.
- Backend already ensures selecting Soccer loads Soccer defaults and selecting NFL + IDP loads IDP defaults; no backend code changes required for this prompt.

---

## 4. Validation Updates

- **Form validation** (StartupDynastyForm) — Unchanged: league name required; platform league ID required when platform is not manual. No sport- or preset-specific validation required; backend validates sport enum and applies defaults.
- **Submission payload** — Confirmed: `sport` and `leagueVariant` are sent. For NFL, leagueVariant is the selected preset (Standard, PPR, Half PPR, Superflex, IDP, Dynasty IDP). For Soccer, leagueVariant is STANDARD. For other sports, leagueVariant can be STANDARD or undefined depending on variantOptions.
- No new validation rules added; flow ensures backend receives sport_type and league_variant for Soccer and NFL IDP.

---

## 5. Full UI Click Audit Findings

Every league-creation-UX-related interaction is wired as follows. Broader league creation E2E and sport registry flows are in **`docs/LEAGUE_CREATION_E2E_SPORT_INITIALIZATION_PROMPT10.md`** and **`docs/SOCCER_NFL_IDP_SPORT_REGISTRY_PROMPT11.md`**.

| Element | Component / Route | Handler | State | Backend / API | Persistence / Reload | Status |
|--------|--------------------|---------|-------|----------------|------------------------|--------|
| **Sport selector** | `LeagueCreationSportSelector` in `StartupDynastyForm` | `onValueChange` → `setSport` | `sport` (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) | Drives preset request | useSportPreset(sport, variant) refetches; useEffect sets leagueVariant to STANDARD when sport !== NFL | OK |
| **Preset selector** | `LeagueCreationPresetSelector` in `StartupDynastyForm` | `onValueChange` → `setLeagueVariant` | `leagueVariant`; options from getVariantsForSport(sport): NFL → 6, others → Standard | Drives variant param for preset | useSportPreset(sport, variant) refetches; preview updates | OK |
| **Preview cards / summary panel** | `LeagueSettingsPreviewPanel` | Receives `preset`, `sport`, `presetLabel` | Shows roster, scoring, player pool type, league defaults; context message for Soccer / NFL IDP | Data from GET /api/sport-defaults?sport=X&load=creation&variant=Y | Updates when preset loads (sport or variant change) | OK |
| **Continue / back buttons** | Single-step create form (no wizard) | N/A for continue/back; mode switch via LeagueCreationModeSelector (create vs import) | creationMode | — | — | OK |
| **Validation messages** | `StartupDynastyForm` validate() | setErrors; validate() before submit | errors (leagueName, platformLeagueId) | Client-side; API returns errors if invalid | User corrects and resubmits | OK |
| **Final create button** | Submit button in StartupDynastyForm | handleSubmit → validate then POST /api/league/create | loading; body includes sport, leagueVariant, name, leagueSize, scoring, etc. | app/api/league/create/route.ts; stores sport + leagueVariant; runs bootstrap | New league persisted; redirect on success | OK |
| **Success redirect** | After create success | window.location.href = leagueId ? `/leagues/${leagueId}` : '/af-legacy' | — | — | League list refetched; user lands on league or legacy dashboard | OK |
| **Post-create league card click paths** | Dashboard / league list | Click league card → navigate to league detail (e.g. /leagues/[id]) | — | GET /api/league/list returns sport, leagueVariant; league pages use useLeagueSport(leagueId) | Correct sport/variant for roster, draft, waiver, settings | OK |

**Summary:** Sport selector, preset selector, preview panel, validation, create button, success redirect, and post-create league card navigation are wired. No dead controls, stale preset state, or broken previews identified; selecting Soccer loads Soccer defaults and selecting NFL + IDP loads IDP defaults; preview updates before creation; backend stores sport_type and league_variant. Current NFL standard flows unchanged.

---

## 6. QA Findings (Summary)

- **NFL standard flow** — Select NFL, preset Standard/PPR/Half PPR/Superflex; create; league has sport NFL and selected leagueVariant; roster and scoring non-IDP. No regression.
- **NFL + IDP** — Select NFL, preset IDP or Dynasty IDP; preview shows IDP context and player pool; create; backend stores leagueVariant IDP/DYNASTY_IDP; league has IDP roster and scoring.
- **Soccer** — Select Soccer; preset shows Standard; preview shows Soccer context and player pool; create; backend stores sport SOCCER and leagueVariant STANDARD; league has Soccer roster and scoring.
- **Preview updates** — Changing sport or preset refetches preset and updates LeagueSettingsPreviewPanel; roster, scoring, player pool, and league defaults reflect selection before submit.
- **Helper and context copy** — Sport selector states Soccer is its own sport and IDP is an NFL preset; preset helper states preset changes roster and scoring automatically; preview context shows for Soccer and NFL IDP.
- **Preset visibility** — Soccer shows Preset with one option (Standard); NFL shows all six (Standard, PPR, Half PPR, Superflex, IDP, Dynasty IDP).

---

## 7. Issues Fixed

- **None required for Prompt 15.** LeagueCreationSportSelector (Soccer + helper), LeagueCreationPresetSelector (NFL six presets including IDP, Soccer Standard), useSportPreset (variant for Soccer STANDARD), LeagueSettingsPreviewPanel (context for Soccer and NFL IDP), and StartupDynastyForm (sport, leagueVariant, submit body, redirect) already support Soccer and NFL IDP. The deliverable adds the full UI click audit (Section 5), QA findings (Section 6), and the 9-section doc format. No dead controls, stale preset state, or broken redirect flows identified.

---

## 8. Final QA Checklist

- [ ] **NFL standard flow** — Select NFL, preset Standard or PPR; create league. League has sport NFL, leagueVariant as selected; roster and scoring are non-IDP. No regression.
- [ ] **NFL + IDP** — Select NFL, preset IDP or Dynasty IDP. Preview shows “IDP is an NFL preset: offensive + defensive roster and scoring” and player pool “NFL offensive + defensive (IDP).” Create league; backend stores leagueVariant IDP or DYNASTY_IDP; league has IDP roster and scoring.
- [ ] **Soccer** — Select Soccer. Preset shows “Standard.” Preview shows “Soccer is its own sport; roster and scoring are soccer-specific” and player pool “Soccer players (GKP, DEF, MID, FWD).” Create league; backend stores sport SOCCER and leagueVariant STANDARD; league has Soccer roster and scoring.
- [ ] **Preview updates** — Change sport from NFL to Soccer; preset and preview update (Soccer defaults, Standard). Change NFL preset from PPR to IDP; preview updates (IDP roster, scoring, player pool). Preview updates before submit.
- [ ] **Backend submission** — Request body includes `sport` and `leagueVariant`. League record has correct sport and league_variant after create.
- [ ] **Helper and context copy** — Sport selector helper clearly states Soccer is its own sport and IDP is an NFL preset. Preset helper states that selecting a preset changes roster and scoring automatically. Preview context message shows for Soccer and for NFL IDP.
- [ ] **Preset selector visibility** — Soccer shows Preset dropdown with one option (Standard). NFL shows Preset dropdown with Standard, PPR, Half PPR, Superflex, IDP, Dynasty IDP.
- [ ] **UI click audit** — Sport selector, preset selector, preview cards/summary, validation, create button, success redirect, and post-create league card click paths all wired; no dead controls or broken previews (see **Section 5**).

---

## 9. Explanation of Soccer and NFL IDP League Creation UX

### Soccer

- User selects **Sport: Soccer**. The sport selector helper explains that Soccer is its own sport with its own roster and scoring. The **Preset** dropdown shows a single option, **Standard**, so the UX clearly shows “Preset: Standard” for Soccer. The **SportPresetLoader** (useSportPreset) fetches Soccer creation defaults (with variant STANDARD when passed); the **LeagueSettingsPreviewPanel** updates with Soccer roster (GKP, DEF, MID, FWD, UTIL, BENCH, IR), Soccer scoring, player pool “Soccer players (GKP, DEF, MID, FWD),” and league defaults. A short context line states that “Soccer is its own sport; roster and scoring are soccer-specific.” On submit, the backend receives sport SOCCER and leagueVariant STANDARD and creates a league with Soccer roster and scoring. There is no confusion with NFL or other sports because the copy and preview are sport-specific.

### NFL IDP

- User selects **Sport: NFL** then **Preset: IDP** (or Dynasty IDP). The sport selector helper explains that IDP is an NFL preset and that the user should choose NFL then pick a preset. The preset selector lists all six NFL presets, including **IDP** and **Dynasty IDP**, and the helper states that selecting a preset changes roster and scoring automatically and that IDP/Dynasty IDP add defensive players and scoring. The preset loader fetches NFL IDP defaults (roster with IDP slots, IDP scoring); the preview panel shows IDP roster, IDP scoring template name, player pool “NFL offensive + defensive (IDP),” and league defaults, with a context line: “IDP is an NFL preset: offensive + defensive roster and scoring.” On submit, the backend receives sport NFL and leagueVariant IDP (or DYNASTY_IDP) and creates a league with IDP roster and scoring. The UX makes it clear that IDP is a league type variant of NFL, not a separate sport, and that roster and scoring update automatically when the preset is selected.

### Summary

- **LeagueCreationSportSelector** and **LeagueCreationPresetSelector** copy and visibility are updated so that Soccer is clearly its own sport and IDP is clearly an NFL preset, and so that selecting a preset updates roster and scoring automatically. **LeagueSettingsPreviewPanel** shows roster, scoring, player pool type, and league defaults and adds short context messages for Soccer and NFL IDP. **SportPresetLoader** (useSportPreset) passes variant for Soccer (STANDARD) so the preview is consistent. Backend submission already stores sport_type and league_variant; no backend changes were required. The result is a single league creation experience that supports both Soccer leagues and NFL IDP leagues without confusion.
