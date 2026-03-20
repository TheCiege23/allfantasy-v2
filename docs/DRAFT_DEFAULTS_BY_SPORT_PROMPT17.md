# Draft Defaults by Sport + Full UI Click Audit (Prompt 17)

## 1. Draft defaults architecture

- **Single source of truth:** sport-aware and variant-aware draft presets live in `lib/sport-defaults/SportDefaultsRegistry.ts` via `DRAFT_DEFAULTS` and `getDraftDefaults(sportType, formatType?)`.
- **Draft defaults registry layer:** `lib/draft-defaults/DraftDefaultsRegistry.ts` wraps the sport registry and exposes `getDraftPreset()`, `getDraftPresetDefinitions()`, and `getSupportedDraftVariantsForSport()` for UI and QA.
- **Variant resolution:** `lib/draft-defaults/DraftPresetResolver.ts` resolves sport + variant into a normalized preset result with flags like `supportsIdpPlayers`, `supportsKeeperCarryover`, and `defaultOrderMode`.
- **Persistence path:** league creation writes draft settings into `League.settings`, and `lib/draft-defaults/LeagueDraftBootstrapService.ts` backfills only missing `draft_*` keys so commissioner overrides are preserved.
- **Draft room resolution:** `lib/draft-defaults/DraftRoomConfigResolver.ts` reads `League.settings` first and falls back per key to `getDraftDefaults()`. This keeps the draft room aligned to stored overrides without breaking partially configured older leagues.
- **Order / pool / AI context:**
	- `lib/draft-defaults/DraftOrderRuleResolver.ts` resolves snake vs linear and third-round reversal labels.
	- `lib/draft-defaults/DraftPlayerPoolResolver.ts` resolves sport-aware player pool context plus queue/filter behavior.
	- `lib/draft-defaults/DraftRankingContextResolver.ts` resolves the ranking source label used by AI and UI.
- **Commissioner editing:** `components/app/settings/DraftSettingsPanel.tsx` is the commissioner-facing edit surface for draft config and draft-room behavior. `app/api/leagues/[leagueId]/draft/settings/route.ts` persists both core config and UI settings.
- **Queue-size enforcement:** `lib/draft-defaults/DraftQueueLimitResolver.ts` centralizes queue-size normalization and trimming so the client and API honor sport-specific queue limits instead of a hard-coded 50-player cap.

## 2. Per-sport and per-variant draft preset definitions

### Base sport presets

| Sport | Draft Type | Rounds | Timer | Order | 3RR | Autopick | Queue Limit | Ranking Source | Roster Fill | Position Filter | Carryover |
|---|---|---:|---:|---|---|---|---:|---|---|---|---|
| NFL | snake | 15 | 90 | snake | false | queue-first | 50 | adp | starter_first | by_eligibility | true |
| NBA | snake | 13 | 90 | snake | false | queue-first | 40 | adp | starter_first | by_eligibility | true |
| MLB | snake | 26 | 90 | snake | false | queue-first | 60 | projections | position_scarcity | by_eligibility | true |
| NHL | snake | 18 | 90 | snake | false | queue-first | 50 | adp | starter_first | by_eligibility | true |
| NCAAF | snake | 20 | 90 | snake | false | queue-first | 70 | adp | position_scarcity | by_eligibility | false |
| NCAAB | snake | 12 | 90 | snake | false | queue-first | 40 | adp | starter_first | by_eligibility | false |
| SOCCER | snake | 15 | 90 | snake | false | queue-first | 40 | sport_default | position_scarcity | by_eligibility | true |

### NFL variants

| Variant | Rounds | Queue Limit | Ranking Source | Roster Fill | Position Filter | IDP |
|---|---:|---:|---|---|---|---|
| STANDARD | 15 | 50 | adp | starter_first | by_eligibility | false |
| PPR | 15 | 50 | ecr | starter_first | by_eligibility | false |
| HALF_PPR | 15 | 50 | adp | starter_first | by_eligibility | false |
| SUPERFLEX | 16 | 55 | ecr | need_based | by_need | false |
| IDP | 18 | 60 | tiers | position_scarcity | by_need | true |
| DYNASTY_IDP | 18 | 60 | tiers | position_scarcity | by_need | true |

### Devy overlays

- `devy_dynasty` is supported for NFL and NBA.
- Round count is derived from pro startup roster demand: total starters + bench + taxi.
- Queue size is raised to at least 60.
- Ranking source stays `adp`.
- Carryover support is true.

## 3. Backend bootstrap and resolver updates

- `lib/league-creation/LeagueBootstrapOrchestrator.ts` runs `bootstrapLeagueDraftConfig(leagueId)` as part of post-create bootstrap.
- `lib/draft-defaults/LeagueDraftBootstrapService.ts` merges these keys only when absent:
	- `draft_type`
	- `draft_rounds`
	- `draft_timer_seconds`
	- `draft_pick_order_rules`
	- `draft_snake_or_linear`
	- `draft_third_round_reversal`
	- `draft_autopick_behavior`
	- `draft_queue_size_limit`
	- `draft_pre_draft_ranking_source`
	- `draft_roster_fill_order`
	- `draft_position_filter_behavior`
- `lib/draft-defaults/DraftRoomConfigResolver.ts` uses per-key fallback, so partially configured older leagues still resolve correctly.
- `app/api/leagues/[leagueId]/draft/settings/route.ts` supports commissioner PATCH for:
	- `draft_type`
	- `rounds`
	- `timer_seconds`
	- `pick_order_rules`
	- `snake_or_linear`
	- `third_round_reversal`
	- `autopick_behavior`
	- `queue_size_limit`
	- `pre_draft_ranking_source`
	- `roster_fill_order`
	- `position_filter_behavior`
	- draft UI settings like AI ADP, queue reorder, traded-pick display, timer mode, and orphan AI manager settings
- `app/api/leagues/[leagueId]/draft/queue/route.ts` now resolves the league’s queue-size limit before normalizing and saving queue entries.

## 4. Draft room integration updates

- `components/app/draft-room/DraftRoomPageClient.tsx`
	- loads draft settings from `/api/leagues/[leagueId]/draft/settings`
	- now stores the resolved `queue_size_limit` in local state
	- trims queue mutations using the resolved limit instead of a hard-coded 50
	- persists `autoPickFromQueue` and `awayMode` to `localStorage` per league so those toggles survive reloads
- `components/app/draft-room/QueuePanel.tsx`
	- queue add/remove/reorder actions are wired through parent callbacks
	- auto-pick and away-mode toggles update parent state immediately
	- AI reorder button is disabled when the queue is too small to reorder
- `components/app/draft-room/PlayerPanel.tsx`
	- search input, position filter, team filter, pool filter, ADP/name sort buttons, AI ADP toggle, and roster view toggle are all stateful and wired
	- draft / nominate / add-to-queue actions call explicit parent handlers
	- sport-aware position options are resolved through `getPositionFilterOptionsForSport(sport, formatType)`
- `components/app/draft-room/DraftTopBar.tsx`
	- commissioner controls button opens the control center
	- pause, resume, reset timer, undo pick, run orphan AI pick, and trade panel open handlers are wired from `DraftRoomPageClient`
- `components/app/draft-room/CommissionerControlCenterModal.tsx`
	- draft flow buttons call `onAction()` with supported backend actions
	- UI toggles call `onSettingsPatch()`
	- import flow, broadcast, and resync hooks are wired
- `components/app/settings/DraftSettingsPanel.tsx`
	- now exposes commissioner-editable controls for `autopick_behavior`, `queue_size_limit`, `pre_draft_ranking_source`, `roster_fill_order`, and `position_filter_behavior`
	- previously these values were display-only even though the backend supported saving them

## 5. Full UI click audit findings

| Clickable Element | Component | Handler Exists | State Update | Persistence / Reload | Result |
|---|---|---|---|---|---|
| Sport selector | `LeagueCreationWizard` / `SportSelector` | `handleSportChange` | updates sport, allowed league type, draft type, variant | submitted in create payload | verified |
| Preset selector | `ScoringPresetSelector` | `handleScoringChange` | updates scoring preset + league variant | submitted in create payload | verified |
| Draft type selector | `DraftTypeSelector` | `handleDraftTypeChange` | updates wizard draft type | submitted in create payload | verified |
| Draft settings step rounds | wizard draft settings panel | `onDraftSettingsChange` | updates wizard draft settings | submitted in create payload | verified |
| Draft settings step timer | wizard draft settings panel | `onDraftSettingsChange` | updates wizard draft settings | submitted in create payload | verified |
| Auction budget selector | wizard draft settings panel | `onDraftSettingsChange` | updates wizard state | submitted in create payload | verified |
| Keeper max keepers | wizard draft settings panel | `onDraftSettingsChange` | updates wizard state | submitted in create payload | verified |
| Back / Next buttons | wizard step nav | `goBack` / `goNext` | step state changes | in-memory wizard state | verified |
| Review / Create button | wizard review | `handleCreate` | submits payload | `/api/league/create` + bootstrap | verified |
| Draft room enter button | `DraftTab` | link navigation | opens room | route load | verified |
| Queue add | `PlayerPanel` | `handleAddToQueue` | queue state changes | `/draft/queue` PUT | verified, fixed queue cap mismatch |
| Queue remove | `QueuePanel` | `handleRemoveFromQueue` | queue state changes | `/draft/queue` PUT | verified |
| Queue reorder | `QueuePanel` | `handleReorderQueue` | queue state changes | `/draft/queue` PUT | verified |
| AI reorder | `QueuePanel` | `handleAiReorderQueue` | queue state + explanation | `/draft/queue/ai-reorder` POST + `/draft/queue` PUT | verified |
| Auto-pick from queue toggle | `QueuePanel` | `setAutoPickFromQueue` | local state changes | now persisted in `localStorage` per league | fixed |
| Away mode toggle | `QueuePanel` | `setAwayMode` | local state changes | now persisted in `localStorage` per league | fixed |
| Draft button | `PlayerPanel` | `handleMakePick` | submitting state + session update | `/draft/pick` POST | verified |
| Search input | `PlayerPanel` | `setSearchQuery` | local filter state | local only | verified |
| Position filter | `PlayerPanel` | `setPositionFilter` | local filter state | local only | verified |
| Team filter | `PlayerPanel` | `setTeamFilter` | local filter state | local only | verified |
| Pool filter | `PlayerPanel` | `setPoolFilter` | local filter state | local only | verified |
| Sort buttons | `PlayerPanel` | `setSortBy` | local sort state | local only | verified |
| AI ADP toggle | `PlayerPanel` | `onUseAiAdpChange` | local sort source state | local only | verified |
| My roster / Pool toggle | `PlayerPanel` | `setShowRosterView` | local view state | local only | verified |
| Commissioner button | `DraftTopBar` | `setShowCommissionerModal(true)` | modal state | local only | verified |
| Pause / resume / reset / undo / skip / complete | `CommissionerControlCenterModal` | `onAction()` | session updates on success | `/draft/controls` POST | verified |
| Set timer | `CommissionerControlCenterModal` | `handleSetTimer` | local input + backend patch | `/draft/controls` POST | verified |
| Draft UI toggles | `CommissionerControlCenterModal` | `handleToggle` | draft UI settings state | `/draft/settings` PATCH | verified |
| Draft settings overrides | `components/app/settings/DraftSettingsPanel.tsx` | `setConfigField` + `handleSave` | config state | `/draft/settings` PATCH | fixed missing edit controls |
| Ranking source override | `components/app/settings/DraftSettingsPanel.tsx` | `setConfigField` + `handleSave` | config state | `/draft/settings` PATCH | fixed missing edit controls |
| Commissioner override controls | draft settings panel + commissioner modal | explicit handlers | config/session/ui state | backend routes persist and reload | verified |

## 6. QA findings

- The sport/variant draft defaults system requested by Prompt 17 was already substantially implemented in the repository before this pass.
- The required core modules exist and are wired:
	- `DraftDefaultsRegistry`
	- `DraftPresetResolver`
	- `LeagueDraftBootstrapService`
	- `DraftRoomConfigResolver`
	- `DraftOrderRuleResolver`
	- `DraftPlayerPoolResolver`
	- `DraftRankingContextResolver`
- Existing tests already covered the baseline per-sport defaults and bootstrapping behavior in `__tests__/draft-defaults-by-sport.test.ts`.
- Two production mismatches remained:
	- queue size enforcement ignored sport/variant limits above 50
	- commissioner settings UI could not edit several backend-supported draft default fields
- One UX persistence gap remained:
	- `autoPickFromQueue` and `awayMode` reset on reload despite being active draft-room toggles

## 7. Issues fixed

- **Fixed:** draft queue saving no longer hard-caps every league to 50 entries.
	- Client now trims queue actions using the league’s resolved queue-size limit.
	- Queue API now resolves `queue_size_limit` from draft config before normalizing saved entries.
- **Fixed:** draft-room `autoPickFromQueue` and `awayMode` toggles now persist across reloads via per-league `localStorage`.
- **Fixed:** commissioner draft settings UI now exposes editable controls for:
	- autopick behavior
	- queue size limit
	- pre-draft ranking source
	- roster fill order
	- position filter behavior
- **Added:** shared queue-limit helper in `lib/draft-defaults/DraftQueueLimitResolver.ts` to keep client and API behavior aligned.
- **Added:** focused regression tests in `__tests__/draft-queue-limit-resolver.test.ts`.

## 8. Final QA checklist

- [x] Draft defaults exist for NFL, NBA, MLB, NHL, NCAAF, NCAAB, and SOCCER.
- [x] NFL variants include STANDARD, PPR, HALF_PPR, SUPERFLEX, IDP, and DYNASTY_IDP handling.
- [x] League bootstrap backfills missing draft settings without overwriting commissioner overrides.
- [x] Draft room config resolves saved overrides first and defaults second.
- [x] NFL IDP draft pool context supports IDP-aware behavior.
- [x] Commissioner controls for pause/resume/reset/undo/skip/complete are wired to backend routes.
- [x] Queue add / remove / reorder actions are wired end to end.
- [x] Queue size limit is now enforced using sport-aware / variant-aware settings.
- [x] Draft-room autopick / away toggles now reload correctly for the same league in the same browser.
- [x] Commissioner settings UI now supports overriding the draft-default fields that the backend already persisted.
- [x] Existing NFL standard draft flow remains intact.

## 9. Explanation of draft defaults by sport

- **NFL:** balanced redraft baseline with snake order, 15 rounds, 90-second timer, ADP rankings, and starter-first roster fill.
- **NFL SUPERFLEX:** slightly deeper draft with need-based roster fill and `by_need` filtering to account for QB scarcity and two-QB pressure.
- **NFL IDP / DYNASTY_IDP:** deeper draft, larger queue, `tiers` ranking source, and `by_need` filtering so defensive positions are represented correctly in pool and recommendation context.
- **NBA:** shorter draft with utility-aware roster structure and standard basketball eligibility filtering.
- **MLB:** deepest default draft with projections-first ranking source and position-scarcity roster fill to balance hitters, starters, relievers, and bench depth.
- **NHL:** skater + goalie support with standard eligibility filtering and balanced queue size.
- **NCAA Football:** deeper college-football draft with the highest base queue limit in the standard presets.
- **NCAA Basketball:** shorter basketball-style college draft aligned to smaller core lineup structures.
- **Soccer:** snake draft with sport-default rankings, position-scarcity fill order, and soccer-aware filter behavior built on GKP/DEF/MID/FWD/UTIL roster structure.

The overall pattern is consistent: defaults establish a safe starting point, league settings persist them, draft-room resolvers consume them, and commissioners can now override the important draft knobs after initialization without fighting hidden hard-coded behavior.
