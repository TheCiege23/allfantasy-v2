# Draft Defaults by Sport (Prompt 17)

## 1. Draft defaults architecture

- **Single source of truth:** Per-sport (and per-variant) draft defaults live in **SportDefaultsRegistry** (`lib/sport-defaults/SportDefaultsRegistry.ts`) in `DRAFT_DEFAULTS` and `getDraftDefaults(sportType, formatType?)`. NFL IDP uses the same registry with an overlay (more rounds, higher queue limit).
- **Persistence:** At league creation, **buildInitialLeagueSettings(sport, variant)** (LeagueDefaultSettingsService) includes a flat draft block in `League.settings`: `draft_type`, `draft_rounds`, `draft_timer_seconds`, `draft_pick_order_rules`, `draft_snake_or_linear`, `draft_third_round_reversal`, `draft_autopick_behavior`, `draft_queue_size_limit`, `draft_pre_draft_ranking_source`, `draft_roster_fill_order`, `draft_position_filter_behavior`. Commissioners can override these after creation.
- **Bootstrap:** **LeagueBootstrapOrchestrator** runs **bootstrapLeagueDraftConfig(leagueId)** so leagues missing draft config (e.g. created before this feature) get defaults merged without overwriting existing keys.
- **Draft room:** **DraftRoomConfigResolver** returns config for a league by reading `League.settings` first; when `draft_rounds` is missing, it falls back to **getDraftDefaults(sport, variant)**. **DraftOrderRuleResolver**, **DraftPlayerPoolResolver**, and **DraftRankingContextResolver** provide order rules, pool context, and ranking context for the draft room and AI assistant.
- **League creation:** **loadLeagueCreationDefaults(sport, variant)** returns an extended **draft** object (including all new fields) so the UI and creation flow get sport/variant-aware draft defaults. **getDraftDefaults(sportType, variant)** is used for both IDP and non-IDP paths.

## 2. Per-sport and per-variant draft preset definitions

| Sport   | draft_type | rounds | timer_seconds | snake_or_linear | third_round_reversal | autopick_behavior | queue_size_limit | pre_draft_ranking_source | roster_fill_order   | position_filter |
|---------|------------|--------|----------------|-----------------|----------------------|-------------------|------------------|---------------------------|---------------------|-----------------|
| NFL     | snake      | 15     | 90             | snake           | false                | queue-first       | 50               | adp                       | starter_first       | by_eligibility  |
| NFL IDP | snake      | 18     | 90             | snake           | false                | queue-first       | 60               | adp                       | starter_first       | by_eligibility  |
| NBA     | snake      | 13     | 90             | snake           | false                | queue-first       | 40               | adp                       | starter_first       | by_eligibility  |
| MLB     | snake      | 26     | 90             | snake           | false                | queue-first       | 60               | projections               | position_scarcity   | by_eligibility  |
| NHL     | snake      | 18     | 90             | snake           | false                | queue-first       | 50               | adp                       | starter_first       | by_eligibility  |
| NCAAF   | snake      | 15     | 90             | snake           | false                | queue-first       | 50               | adp                       | starter_first       | by_eligibility  |
| NCAAB   | snake      | 10     | 90             | snake           | false                | queue-first       | 40               | adp                       | starter_first       | by_eligibility  |
| SOCCER  | snake      | 15     | 90             | snake           | false                | queue-first       | 50               | adp                       | starter_first       | by_eligibility  |

All sports use `draft_order_rules: 'snake'`, `keeper_dynasty_carryover_supported: true` except NCAAF/NCAAB (false for carryover). NFL supports optional third_round_reversal in the type; default is false.

## 3. Backend bootstrap and resolver updates

- **SportDefaultsRegistry:** Extended **DraftDefaults** and **DRAFT_DEFAULTS** with full preset fields; **getDraftDefaults(sportType, formatType?)** added with NFL IDP overlay (18 rounds, queue 60).
- **LeagueDefaultSettingsService:** **buildInitialLeagueSettings(sportType, variant?)** now accepts optional variant and merges draft block from **getDraftDefaults(sport, variant)** into the returned settings.
- **LeagueCreationInitializer:** Reads **leagueVariant** from the league and passes it to **buildInitialLeagueSettings** when merging/initializing settings.
- **League creation API:** Calls **buildInitialLeagueSettings(sport, leagueVariantInput)** so new leagues get variant-aware draft defaults in `League.settings`.
- **LeagueBootstrapOrchestrator:** Runs **bootstrapLeagueDraftConfig(leagueId)** and returns **draft: { draftConfigApplied }** in **BootstrapResult**.
- **LeagueCreationDefaultsLoader:** Both IDP and non-IDP paths use **getDraftDefaults(sportType, variant)** and return extended **draft** object (snake_or_linear_behavior, third_round_reversal, autopick_behavior, queue_size_limit, draft_order_rules, pre_draft_ranking_source, roster_fill_order, position_filter_behavior).

New modules:

- **lib/draft-defaults/DraftDefaultsRegistry.ts** — getDraftPreset(sport, variant), re-exports getDraftDefaults.
- **lib/draft-defaults/DraftPresetResolver.ts** — resolveDraftPreset(sport, variant) → { preset, sport, variant }.
- **lib/draft-defaults/LeagueDraftBootstrapService.ts** — bootstrapLeagueDraftConfig(leagueId): idempotent merge of draft defaults when draft_rounds is missing.
- **lib/draft-defaults/DraftRoomConfigResolver.ts** — getDraftConfigForLeague(leagueId): draft room config from settings or registry.
- **lib/draft-defaults/DraftOrderRuleResolver.ts** — getDraftOrderRule(snakeOrLinear), isSnakeDraft().
- **lib/draft-defaults/DraftPlayerPoolResolver.ts** — getDraftPlayerPoolContext(leagueId, leagueSport): pool + queue_size_limit + position_filter_behavior.
- **lib/draft-defaults/DraftRankingContextResolver.ts** — getDraftRankingContext(sport, variant): pre_draft_ranking_source and contextLabel for AI.

## 4. Draft room integration updates

- **Config API:** **GET /api/app/league/[leagueId]/draft/config** returns draft config (rounds, timer_seconds, snake_or_linear, etc.) plus leagueSize. Implemented in app/api/app/[...path]/route.ts; uses **getDraftConfigForLeague(leagueId)** and prisma.league.leagueSize.
- **DraftTab:** Fetches `draft/config` via **useLeagueSectionData(leagueId, 'draft/config')** and passes **config** (rounds, timer_seconds, leagueSize) to **LeagueDraftBoard** so the board uses sport/variant defaults (or commissioner overrides) instead of hardcoded values.
- **LeagueDraftBoard:** Accepts optional **config** prop (**DraftBoardConfig**: rounds, timer_seconds, leagueSize). When provided, initial state and useEffect keep numTeams, numRounds, secondsPerPick in sync with config; when not provided, falls back to DEFAULT_TEAMS (12), DEFAULT_ROUNDS (15), DEFAULT_SECONDS_PER_PICK (60).
- **DraftSettingsPanel:** Accepts **leagueId**; fetches `draft/config` and displays draft type, rounds, timer, order, third-round reversal, autopick, queue limit, ranking source, roster fill order, position filter, sport/variant (read-only). Commissioner overrides note: persisted via League.settings; config API returns stored values when present.
- **Order:** **getDraftOrderRule** / **isSnakeDraft** from DraftOrderRuleResolver can drive pick-order logic and UI labels.
- **Player pool:** **getDraftPlayerPoolContext(leagueId, leagueSport)** returns sport-scoped pool plus draft-specific queue size and position filter behavior.
- **Rankings / AI:** **getDraftRankingContext(sport, variant)** returns the ranking source and label for AI draft assistant and queue.
- **lib/draft-defaults/index.ts:** Single export barrel for DraftDefaultsRegistry, DraftPresetResolver, DraftRoomConfigResolver, DraftOrderRuleResolver, DraftPlayerPoolResolver, DraftRankingContextResolver, LeagueDraftBootstrapService.

## 5. QA findings

- Existing NFL draft flow: Preserved; NFL leagues get 15 rounds, 90s timer, snake, and existing behavior. No changes to draft-engine or mock-draft flow beyond optional use of new resolvers.
- NFL IDP: getDraftDefaults('NFL','IDP') returns 18 rounds and queue_size_limit 60; league create with leagueVariant IDP persists these via buildInitialLeagueSettings; creation payload includes IDP draft defaults.
- NBA, MLB, NHL, NCAAF, NCAAB, Soccer: Each sport has distinct rounds and optional fields (e.g. MLB projections, position_scarcity); creation and bootstrap use correct sport/variant.
- Commissioner overrides: Draft keys in League.settings are only set at creation or by bootstrap when draft_rounds is missing; commissioners can edit settings and DraftRoomConfigResolver will use stored values.

## 6. Issues fixed

- Draft defaults were not persisted to the league at creation; they are now written into League.settings via buildInitialLeagueSettings(sport, variant).
- League creation API did not pass variant into initial settings; it now passes leagueVariantInput to buildInitialLeagueSettings.
- Creation payload draft object was minimal; it now includes snake_or_linear_behavior, third_round_reversal, autopick_behavior, queue_size_limit, pre_draft_ranking_source, roster_fill_order, position_filter_behavior so UI and future draft room can use them.
- No variant-aware draft defaults for NFL IDP; getDraftDefaults(sportType, formatType?) and IDP overlay added.
- No central draft room config resolver; DraftRoomConfigResolver and related resolvers added for draft room and AI context.
- **Draft room not using league config:** LeagueDraftBoard used hardcoded DEFAULT_ROUNDS (15), DEFAULT_SECONDS_PER_PICK (60), DEFAULT_TEAMS (12). Added GET /api/app/league/[leagueId]/draft/config and wired DraftTab to fetch it and pass config to LeagueDraftBoard; board now uses league’s rounds, timer, and leagueSize when available.
- **Draft Settings panel placeholder:** DraftSettingsPanel was non-functional. It now accepts leagueId, fetches draft/config, and displays draft type, rounds, timer, order, autopick, queue limit, ranking source, roster fill, position filter, sport/variant (read-only).
- **LeagueSettingsTab not passing leagueId:** DraftSettingsPanel and other panels now receive leagueId from LeagueSettingsTab.
- **Single export for draft-defaults:** Added lib/draft-defaults/index.ts exporting all draft-defaults modules for a single import path.

## 7. Full UI click audit findings

| Element | Component | Handler / wiring | State / API | Notes |
|--------|-----------|-------------------|-------------|--------|
| Create League (sport selector) | LeagueCreationSportSelector | onChange → setSport | Sport drives getDraftDefaults at creation | Preserved; draft defaults applied via bootstrap when draft_rounds missing. |
| Create League (preset selector) | LeagueCreationPresetSelector | onChange → setLeagueVariant | Variant passed to getInitialSettingsForCreation | Preserved; IDP variant gets IDP draft defaults at bootstrap. |
| Draft Settings tab (subtab) | LeagueSettingsTab | onClick → setActive('Draft Settings') | Renders DraftSettingsPanel with leagueId | **Fixed:** leagueId now passed to DraftSettingsPanel. |
| Draft Settings panel | DraftSettingsPanel | useLeagueSectionData(leagueId, 'draft/config') | GET /api/app/league/[id]/draft/config → getDraftConfigForLeague | **Wired:** displays draft type, rounds, timer, order, autopick, queue limit, ranking source, roster fill, position filter, sport/variant (read-only). |
| Draft tab (league app) | DraftTab | useLeagueSectionData(leagueId, 'draft') + 'draft/config' | draft → ADP; draft/config → rounds/timer/leagueSize | **Wired:** board receives config; rounds/timer/leagueSize from league. |
| Draft board (rounds/timer/teams) | LeagueDraftBoard | config prop + useEffect sync | State: numTeams, numRounds, secondsPerPick | **Wired:** uses config when provided; else defaults 12/15/60. |
| Queue add | DraftQueue + useDraftQueue | onAddToQueue → addToQueue | Local state (queue array) | Wired; add/remove/reorder work. No server persistence in current flow. |
| Queue remove | DraftQueue | onRemove → removeFromQueue | Same | Wired. |
| Queue reorder | DraftQueue | onReorder (drag/drop) → reorder | Same | Wired. |
| Run Draft AI | DraftTab | runDraftAi → POST .../draft/recommend-ai | setAnalysis | Wired; proxies to mock-draft/ai-pick. |
| Legacy Draft War Room | LegacyAIPanel | endpoint="draft-war-room" | Legacy panel | Preserved. |
| Save / Continue (league create) | StartupDynastyForm | handleSubmit → POST /api/league/create | League created; bootstrap runs draft config when missing | Preserved. |
| Commissioner override | DraftSettingsPanel | Read-only display | Override by editing League.settings elsewhere (e.g. commissioner tools); config API returns stored values | Save/override UI for draft settings not in this panel; resolver uses stored values when present. |

**Dead clicks / partial wiring addressed:** DraftSettingsPanel was placeholder; now loads and displays draft config. LeagueDraftBoard used hardcoded rounds/timer/teams; now uses league draft config when available via DraftTab.

## 8. Final QA checklist

- [ ] Create a league for each sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) and confirm draft defaults (rounds, timer, snake) in league settings and/or creation payload.
- [ ] Create an NFL IDP league and confirm 18 rounds and IDP-specific draft defaults; confirm defensive players appear in player pool when using pool resolver.
- [ ] Confirm existing NFL standard draft flow still works (mock draft, draft room, queue, timer, pick processing).
- [ ] Open league → Draft tab; confirm board shows league’s rounds/timer/league size (from GET draft/config) when available.
- [ ] Open league → Settings → Draft Settings; confirm panel shows draft type, rounds, timer, order, autopick, queue limit, ranking source, sport/variant.
- [ ] Confirm draft room (or mock draft) can use getDraftConfigForLeague(leagueId) and getDraftPlayerPoolContext(leagueId, leagueSport) for sport-specific config and pool.
- [ ] Confirm AI draft suggestions / rankings use correct context (e.g. getDraftRankingContext(sport, variant)).
- [ ] Confirm commissioners can override draft_rounds, draft_timer_seconds, etc. in League.settings and that draft room config resolver uses stored values when present.
- [ ] Confirm bootstrapLeagueDraftConfig(leagueId) does not overwrite existing draft_rounds and only backfills when missing.
- [ ] Every draft-related click path: sport selector, preset selector, Draft Settings subtab, Draft tab, queue add/remove/reorder, Run Draft AI — handlers exist, state or API updated, no dead buttons.

## 9. Explanation of draft defaults by sport

- **NFL:** 15 rounds, 90s timer, snake, queue 50, ADP rankings, starter-first fill, position by eligibility. Standard redraft/dynasty behavior; keeper/dynasty carryover supported.
- **NFL IDP:** Same as NFL but 18 rounds and queue 60 to accommodate defensive slots; same timer, snake, and ranking/fill behavior. Defensive players included in pool when using sport/variant-aware pool and roster template.
- **NBA:** 13 rounds, 90s timer, snake, queue 40, position- and utility-aware drafting; roster fill and position filter by eligibility.
- **MLB:** 26 rounds (deeper draft), 90s timer, snake, queue 60, projections as default ranking source, position_scarcity roster fill for pitcher/hitter balance and bench depth.
- **NHL:** 18 rounds, 90s timer, snake, queue 50, skater and goalie support; roster-aware recommendations via starter_first and by_eligibility.
- **NCAAF:** 15 rounds, 90s timer, snake, queue 50; college-specific rankings and draft rounds; keeper/dynasty carryover not supported by default.
- **NCAAB:** 10 rounds, 90s timer, snake, queue 40; basketball-based defaults for college; keeper/dynasty carryover not supported by default.
- **Soccer:** 15 rounds, 90s timer, snake, queue 50; position-aware (GKP, DEF, MID, FWD, UTIL); utility/flex-aware drafting where supported.

All use snake order by default; third_round_reversal is optional and defaults to false. Autopick defaults to queue-first; queue size limits and position filter behavior are sport-appropriate so draft room and AI assistant can align with roster and format.
