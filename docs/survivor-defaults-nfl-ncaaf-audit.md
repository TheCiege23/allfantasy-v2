# Survivor Defaults — NFL & NCAAF — Phase 1 Audit

**Date:** 2026-06-12  
**Scope:** Phase 1 canonical Survivor defaults for NFL and NCAAF  
**Author:** Claude Code (auto-generated)

---

## What Was Found

### Format Engine
- `survivor` is a registered format in `lib/league/format-engine.ts`
- `defaultRosterMode: 'redraft'`
- `capabilities.deterministicFeatures: ['elimination', 'challenge_scoring', 'state_transitions']`
- `capabilities.weeklyAutomation: true` (declared, not yet built)

### Draft Type Registry
- `DRAFT_TYPES_SURVIVOR = ['snake', 'auction']` — correct
- `SURVIVOR_ELIGIBLE_SPORTS = [...ALL_SPORTS]` — any sport allowed

### Wizard Types
- `WizardSurvivorSettings` existed in `lib/league-creation-wizard/types.ts`:
  - `commissionerPlays`, `tribeCount`, `mergeAtCount`, `idolsEnabled`, `exileEnabled`, `rocksEnabled`, `idolCount`
  - Missing: tribe assignment mode, challenge settings, voting automation, exile automation, idol automation, token economy

### Concept Preset Catalog (before fix)
- **NFL only** — no NCAAF entry
- `draftTypesAllowed: ['snake']` — missing auction
- `defaultTeamCount: 12` — wrong (cast size should be 16)
- `benchSlots: 0` — wrong (survivors need a small bench for waiver activity)
- No tribe / challenge / idol / exile / token defaults anywhere in pipeline

### No Canonical Module
- No `lib/league-concepts/survivorDefaults.ts` existed
- Survivor settings were scattered: wizard UI fields only, no creation snapshot, no guardrails, no automation-status flags

### Survivor-Specific Backend
- No survivor challenge engine found
- No tribal council / voting engine found
- No exile island engine found
- No idol inventory or search engine found
- No token ledger or token shop found
- All Phase 2 — correctly marked `pending` / `not_started` in Phase 1 defaults

---

## What Was Broken / Missing

| Area | Issue | Fix |
|------|-------|-----|
| Catalog NFL entry | `draftTypesAllowed: ['snake']` only | Added auction |
| Catalog NFL entry | `defaultTeamCount: 12` | Fixed to 16 (cast size) |
| Catalog NFL entry | `benchSlots: 0` | Fixed to 3 |
| Catalog NCAAF entry | Missing entirely | Added |
| Pipeline | No `buildSurvivorSettingsSnapshot` anywhere | Created canonical module |
| Snapshot | No tribe/challenge/voting/exile/idol/token fields | All added to snapshot |
| Guardrails | No blocks on dynasty/keeper/devy/C2C/taxi | Added to `normalizeSurvivorSettingsSnapshot` |
| Automation claims | No Phase 2 status flags — automation would appear active | All automation marked `pending` or `not_started` |
| Tabs | No safe survivor tab config | `buildTabsEnabled()` with pending flags for unbuilt tabs |
| Mock draft | No game-event guard | Added mock-draft gate in normalize |
| NCAAF pool isolation | No enforcement | `includeNflPlayers: false, collegeOnly: true` enforced |

---

## Files Changed

| File | Change |
|------|--------|
| `lib/league-concepts/survivorDefaults.ts` | **CREATED** — canonical module |
| `lib/league-concepts/conceptPresetCatalog.ts` | NFL entry fixed; NCAAF entry added |
| `lib/league-concepts/resolveConceptPreset.ts` | Wired in 3 locations |
| `lib/league-creation/preset-engine/runPresetEngine.ts` | Import + compute + chain |
| `__tests__/survivor-defaults-nfl-ncaaf.test.ts` | **CREATED** — 172 tests |
| `docs/survivor-defaults-nfl-ncaaf-audit.md` | **CREATED** — this file |

---

## Final NFL Survivor Defaults

```
sport:                NFL
league_type:          survivor
survivor_enabled:     true
survivor_phase:       setup
draft_type:           snake (auction supported)
cast_size / teams:    16
tribe_count:          2
tribe_assignment:     random
merge_at_count:       8
commissioner_plays:   false
rocks_enabled:        true
scoring_preset:       fb_half_ppr
roster:               QB:1 RB:2 WR:2 TE:1 FLEX:1 K:1 DST:1 = 9 starters + 3 bench = 12 total
draft_rounds:         12
timer_seconds:        90
waiver_type:          FAAB ($100 budget)
trades_enabled:       false
player_pool:          NFL active fantasy players (no college)
queue_limit:          50
ranking_source:       ADP
```

### NFL Challenge Defaults
```
weekly_challenges_enabled:    true
challenge_automation_status:  pending (Phase 2)
pre_merge_challenge_type:     tribe_score
post_merge_challenge_type:    individual_score
challenge_scoring_source:     fantasy_points_for
immunity_enabled:             true
```

### NFL Voting Defaults
```
tribal_council_enabled:       true
voting_automation_status:     pending (Phase 2)
pre_merge_voting_mode:        tribe_vote
post_merge_voting_mode:       individual_vote
eliminations_per_cycle:       1
vote_visibility:              hidden_until_reveal
tie_resolution:               rocks_after_revote
commissioner_override_status: pending (Phase 2)
```

### NFL Exile Defaults
```
exile_enabled:                true
exile_automation_status:      pending (Phase 2)
exile_selection_mode:         challenge_loser_chooses
exile_duration_periods:       1
exile_effects:
  cannot_vote:                true
  still_scores_fantasy:       true
  receives_clue_or_token:     true
```

### NFL Idol Defaults
```
idols_enabled:                true
idol_count:                   2
idol_play_window:             before_vote_reveal
idol_effect:                  cancels_votes_against_target
idol_search_automation:       pending (Phase 2)
idol_inventory_status:        not_started (Phase 2)
```

### NFL Token Economy Defaults
```
tokens_enabled:               true
starting_token_balance:       0
token_earning_rules:
  challenge_win_reward:       1
  exile_reward:               1
  weekly_participation_reward:0
token_spending_rules:
  buy_clue:                   2 tokens
  buy_vote_steal:             null (Phase 2)
  buy_waiver_priority_boost:  null (Phase 2)
  buy_protection:             null (Phase 2)
token_shop_status:            pending (Phase 2)
token_ledger_status:          not_started (Phase 2)
```

---

## Final NCAAF Survivor Defaults

```
sport:                NCAAF
league_type:          survivor
survivor_enabled:     true
survivor_phase:       setup
draft_type:           snake (auction supported)
cast_size / teams:    14
tribe_count:          2
tribe_assignment:     random
merge_at_count:       7
commissioner_plays:   false
rocks_enabled:        true
scoring_preset:       ncaaf_half_ppr
roster:               QB:1 RB:2 WR:2 TE:1 FLEX:1 K:1 DEF:1 = 9 starters + 3 bench = 12 total
draft_rounds:         12
timer_seconds:        90
waiver_type:          FAAB ($100 budget)
trades_enabled:       false
player_pool:          NCAAF college players only (no NFL)
queue_limit:          70
ranking_source:       ECR (college fallback)
```

All challenge / voting / exile / idol / token defaults mirror NFL.  
DEF position used instead of DST. excludeNflPool enforced.

---

## Draft Modes

### Survivor + Snake
- pick order: snake
- third round reversal: false
- autopick: queue-first
- auction budget: null

### Survivor + Auction
- pick order: snake (nomination order — Phase 2 for full nomination flow)
- auction budget per team: $200
- all other survivor game systems apply

### Survivor + Mock Draft
- `mock_triggers_challenges: false`
- `mock_triggers_immunity: false`
- `mock_triggers_votes: false`
- `mock_triggers_exile: false`
- `mock_triggers_idols: false`
- `mock_triggers_tokens: false`
- Mock draft uses survivor roster/scoring/player pool/ranking but creates no real game events

---

## Automation Statuses (Phase 1)

| Subsystem | Status |
|-----------|--------|
| Challenge finalization | `pending` |
| Immunity assignment | `pending` |
| Tribal council voting | `pending` |
| Revote / rocks resolution | `pending` |
| Exile island selection | `pending` |
| Exile effects engine | `pending` |
| Idol search / clue | `pending` |
| Idol inventory | `not_started` |
| Token ledger | `not_started` |
| Token shop | `pending` |
| Tribe assignment | `not_started` |
| Merge transition | implicit in phase |

---

## Tab Configuration

| Tab | Status |
|-----|--------|
| `overview` | enabled |
| `survivor_hub` | enabled |
| `cast` | enabled |
| `tribes` | enabled |
| `roster` | enabled |
| `standings` | enabled |
| `weekly_challenges` | enabled |
| `immunity` | enabled |
| `tribal_council` | enabled |
| `exile_island` | `pending` — Phase 2 |
| `idols_advantages` | `pending` — Phase 2 |
| `tokens_shop` | `pending` — Phase 2 |
| `draft` | enabled |
| `mock_draft` | enabled |
| `waivers` | enabled |
| `settings` | commissioner-gated |
| `commissioner_tools` | commissioner-gated |
| `invite_share` | enabled |

---

## Tests Run

```
__tests__/survivor-defaults-nfl-ncaaf.test.ts   172 passed
__tests__/redraft-defaults-nfl-ncaaf.test.ts     (passing — no regression)
__tests__/dynasty-defaults-nfl-ncaaf.test.ts     (passing — no regression)
__tests__/best-ball-defaults-nfl-ncaaf.test.ts   (passing — no regression)
__tests__/keeper-defaults-nfl-ncaaf.test.ts      (passing — no regression)
__tests__/guillotine-defaults-nfl-ncaaf.test.ts  (passing — no regression)
__tests__/tournament-defaults-nfl-ncaaf.test.ts  (passing — no regression)

Total: 585 tests / 7 suites — all passed
```

TypeScript: zero errors in all touched files.

---

## Phase 2 Remaining Work

- [ ] Weekly challenge finalization engine (`lib/survivor/challengeEngine.ts`)
- [ ] Immunity winner assignment from challenge result
- [ ] Challenge finalization UI / commissioner confirm flow
- [ ] Tribal council vote-casting workflow (per-player vote submission)
- [ ] Vote reveal sequence and animation
- [ ] Revote engine (triggered on tie)
- [ ] Rocks resolution engine (if revote ties again)
- [ ] Exile island selection UI (challenge loser chooses)
- [ ] Exile effects engine (waiver block, token grant)
- [ ] Idol search / clue engine (clue delivery)
- [ ] Idol inventory (ownership tracking per player)
- [ ] Idol play workflow (submit before vote reveal)
- [ ] Token ledger (earn / spend / balance tracking)
- [ ] Token shop / advantage purchase UI
- [ ] Vote steal / protection advantage (if token-gated)
- [ ] Merge transition engine (flip phase → post_merge)
- [ ] Individual challenge scoring post-merge
- [ ] Jury tracking (eliminated players as jury members)
- [ ] Final tribal council / finale mechanics
- [ ] Public Survivor league landing/share pages
- [ ] Mobile-first Survivor dashboard
- [ ] WizardSurvivorSettings — expand to include all new fields from this module
- [ ] Commissioner tools UI — challenge confirm, vote override, exile select, idol seed
