# Survivor League — Full Build Plan

## Executive Summary

The Survivor League system is **~80% built**. The core data model (36 Prisma models), backend engines (54 files, ~9,234 LOC), API routes (24 endpoints), and frontend components (20 files) are all in place. This plan identifies the **7 real gaps** between the existing implementation and the 22-section design spec, then maps them to buildable phases.

**All 7 sports supported**: NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER.

---

## Current State: What's Already Built

### Fully Implemented (No Changes Needed)
| System | Status | Key Files |
|--------|--------|-----------|
| Prisma models (36 tables) | Complete | `prisma/schema.prisma` |
| League model survivor fields (40+) | Complete | `prisma/schema.prisma:4191-4245` |
| Supabase migrations | Complete | `supabase/migrations/20260319_init_from_prisma.sql` |
| Game state machine (phases) | Complete | `lib/survivor/gameStateMachine.ts` |
| Tribal Council orchestration | Complete | `lib/survivor/SurvivorTribalCouncilService.ts` |
| Vote engine (cast, count, nullify) | Complete | `lib/survivor/SurvivorVoteEngine.ts` |
| Idol system (assign, transfer, use, expire) | Complete | `lib/survivor/SurvivorIdolRegistry.ts` |
| Effect engine (powers, immunity) | Complete | `lib/survivor/SurvivorEffectEngine.ts` |
| Merge engine | Complete | `lib/survivor/SurvivorMergeEngine.ts` |
| Jury/finale flow (Final 3 → vote → winner) | Complete | `lib/survivor/SurvivorFinaleEngine.ts` |
| Exile Island (boss, tokens, return) | Complete | `lib/survivor/exileEngine.ts` |
| Challenge engine (submission, scoring) | Complete | `lib/survivor/SurvivorChallengeEngine.ts` |
| Tribe service (formation, shuffle) | Complete | `lib/survivor/SurvivorTribeService.ts` |
| Chat membership (tribe/merge/exile/jury) | Complete | `lib/survivor/SurvivorChatMembershipService.ts` |
| @Chimmy command parsing | Complete | `lib/survivor/SurvivorCommandParser.ts` |
| Notification engine | Complete | `lib/survivor/notificationEngine.ts` |
| AI context/prompts/service | Complete | `lib/survivor/ai/*.ts` |
| Host engine (AI narration) | Complete | `lib/survivor/hostEngine.ts` |
| Post-draft bootstrap (tribes, idols, chats) | Complete | `lib/survivor/SurvivorDraftBootstrapService.ts` |
| Twist events | Complete | `lib/survivor/twistEngine.ts` |
| Season snapshot + AI recap | Complete | `lib/survivor/snapshotEngine.ts` |
| Seed data (powers, challenges, arcs) | Complete | `prisma/seed/survivor*.ts` |
| 10 settings panels | Complete | `app/league/[leagueId]/components/settings/survivor/` |
| 10 main view components | Complete | `components/survivor/` |
| 24 API routes | Complete | `app/api/survivor/`, `app/api/leagues/[leagueId]/survivor/` |
| Weekly automation cron | Partial | `vercel.json` + `app/api/survivor/automation/` |
| Format engine registration | Complete | `lib/league/format-engine.ts` |

### Gaps to Fill (7 items)

| # | Gap | Spec Sections | Severity | Effort |
|---|-----|---------------|----------|--------|
| 1 | **Survivor creation wizard steps** — No tribe config, idol setup, or exile toggle during league creation | S2 | Medium | Medium |
| 2 | **Go to Rocks tiebreaker** — Only season-points tiebreak exists; no random draw, no fire-making, no configurable modes | S12 | High | Medium |
| 3 | **Scroll reveal animation** — Tribal Council vote reveal is static HTML, no dramatic sequential animation | S11 | Medium | Medium |
| 4 | **Sleeper → Survivor conversion** — No import path to convert existing Sleeper league to Survivor format | S2 | High | Medium |
| 5 | **Token Pool Pick'em endpoints** — Model exists but no API routes, validation, scoring, or UI | S15 | Medium | Medium |
| 6 | **Mini-challenge AI generation** — Currently template rotation, not actual AI-powered challenge creation | S8, S19 | Medium | Small |
| 7 | **Supabase SQL tables document** — User explicitly requested SQL table definitions for Supabase | All | Required | Small |

---

## Build Phases

### Phase 1: Survivor Creation Wizard Steps
**Spec sections**: S2 (League Creation + Core Setup)

**What exists**: Generic 8-step wizard; survivor recognized as format but no custom config steps.

**What to build**:
- `app/leagues/create/steps/SurvivorSetupStep.tsx` — NEW: Player count (16-20), tribe count, tribe formation mode (auto/manual/draft-pattern), naming mode (custom/auto/AI), logo mode
- `app/leagues/create/steps/SurvivorRulesStep.tsx` — NEW: Merge trigger (week/player count), jury start, exile on/off, idol system on/off, challenge automation mode, vote rules (self-vote, rocks, reveal mode)
- `app/leagues/create/types.ts` — ADD survivor-specific form state fields
- `app/api/league/create/route.ts` — EXTEND: After league creation, call `SurvivorDraftBootstrapService` to set up tribes, seed idols, create chat channels
- `lib/survivor/SurvivorLeagueConfig.ts` — VERIFY defaults match spec (20 players, 4 tribes of 5, merge at 10 remaining)

**Deliverable**: Users configure Survivor-specific rules during creation. Post-create bootstrap sets up tribes, idols, chats.

---

### Phase 2: Go to Rocks Tiebreaker
**Spec sections**: S12 (Tiebreaker System)

**What exists**: `SurvivorVoteEngine.ts` only uses season-points as tiebreaker.

**What to build**:
- `lib/survivor/rocksEngine.ts` — NEW: Random rock draw logic with seeded RNG for auditability
  - Determine eligible rock-drawers (non-tied, non-immune players)
  - Seeded random selection
  - Full audit trail
- `SurvivorVoteEngine.ts` — EXTEND tie-break flow:
  1. First tie → revote (existing)
  2. Still tied → check league config for tie mode
  3. If `rocks`: run rocksEngine
  4. If `fire_making`: trigger fire-making challenge
  5. If `commissioner`: notify commissioner for manual override
  6. If `score`: use existing season-points logic
- `SurvivorTribalCouncilService.ts` — EXTEND: Add `tiePhase` tracking (revote → rocks → resolved)
- `components/survivor/SurvivorRocksReveal.tsx` — NEW: Dramatic rock draw animation
- League model / SurvivorLeagueConfig — VERIFY: `survivorTieRule` and `survivorRocksEnabled` fields exist (they do)

**Deliverable**: Full Go to Rocks flow with configurable alternatives. Commissioner can choose rocks/fire-making/score/manual.

---

### Phase 3: Scroll Reveal Animation
**Spec sections**: S11 (Tribal Council + Scroll Reveal)

**What exists**: `SurvivorTribalCouncilView.tsx` has static vote history list. `revealSequence` field exists on `SurvivorTribalCouncil` model.

**What to build**:
- `components/survivor/SurvivorScrollReveal.tsx` — NEW: Sequential vote reveal component
  - Renders one vote at a time with configurable delay (2-4 seconds)
  - Shows vote count progression bar
  - Handles "Does Not Count" votes (idol/nullifier)
  - Pause beats between reveals
  - Final elimination announcement with animation
  - Respects `survivorRevealMode` config (full_public, anonymized, delayed, dramatic)
- `SurvivorTribalCouncilService.ts` — EXTEND: Generate `revealSequence` JSON ordering votes for maximum drama (save close votes for last)
- `app/api/survivor/tribal/reveal/route.ts` — NEW: SSE endpoint that streams vote reveals one at a time
- `SurvivorTribalCouncilView.tsx` — WIRE: Replace static list with SurvivorScrollReveal component

**Deliverable**: Dramatic sequential vote reveal matching TV-show pacing. Configurable reveal modes.

---

### Phase 4: Sleeper → Survivor Conversion
**Spec sections**: S2 (League Creation)

**What exists**: Generic Sleeper import pipeline. No Survivor conversion.

**What to build**:
- `lib/survivor/importEngine.ts` — NEW: Convert imported Sleeper league to Survivor format
  - Map Sleeper rosters to SurvivorPlayer records
  - Auto-form tribes from imported teams (random split or draft-order split)
  - Create SurvivorLeagueConfig with defaults
  - Seed idols from power templates
  - Create all chat channels (tribe, league, exile)
  - Set game state to `pre_merge` (skip draft phase since rosters exist)
- `app/api/league/import-survivor/route.ts` — NEW: Import endpoint
  - Accept Sleeper username + league ID
  - Fetch via sleeper-client
  - Create League + SurvivorLeagueConfig + tribes + players + chats
- `app/leagues/create/steps/SurvivorImportStep.tsx` — NEW: Sleeper username → league selection → tribe formation preview → confirm

**Deliverable**: Import existing Sleeper league as Survivor. Rosters carry over, tribes form, game begins at pre-merge.

---

### Phase 5: Token Pool Pick'em API + UI
**Spec sections**: S15 (Token System)

**What exists**: `TokenPoolPick` Prisma model with fields. No API or UI.

**What to build**:
- `app/api/survivor/token-pool/route.ts` — NEW: CRUD for token pool picks
  - POST: Submit pick (validate sport, week, deadline, user is on exile)
  - GET: List picks for user/week with results
- `app/api/survivor/token-pool/resolve/route.ts` — NEW: Score picks against real results
  - Fetch game results via sports-router
  - Mark picks correct/incorrect
  - Award/deduct tokens per config (harsh mode = lose all on wrong)
  - Update SurvivorExileToken balance
- `lib/survivor/tokenPoolEngine.ts` — NEW: Pick validation, scoring, token math
  - Support pick types: win_pick, over_under, prop_bet, exact_score
  - All 7 sports supported
  - Configurable frequency (daily/weekly/event-based)
- `components/survivor/SurvivorTokenPoolPicks.tsx` — NEW: Pick submission UI
  - Show available games/events for current sport
  - Pick type selector
  - Token balance display
  - Results history
- Wire into `SurvivorExileView.tsx` as a tab/section

**Deliverable**: Exiled players can earn tokens through pick'em. Full submit → score → award flow.

---

### Phase 6: AI-Powered Challenge Generation
**Spec sections**: S8 (Mini-Challenges), S19 (AI Features)

**What exists**: `challengeCreator.ts` rotates through pre-defined templates. No actual AI call.

**What to build**:
- `lib/survivor/ai/challengeCreator.ts` — REWRITE: Add actual Claude API call
  - Build context: current sport, week, schedule, tribe standings, recent drama
  - Generate challenge title, description, instructions, reward, penalty
  - Validate output against challenge schema
  - Fallback to template if AI fails
  - Commissioner approval workflow (auto/semi-auto/manual per config)
- `lib/survivor/ai/SurvivorAIPrompts.ts` — ADD challenge generation prompt templates per sport
- `app/api/survivor/challenge/generate/route.ts` — NEW: Trigger AI challenge generation
  - Accepts sport, week, optional theme
  - Returns generated challenge for approval or auto-post
- Commissioner setting: `challengeAutomationMode` (fully_automatic, semi_automatic, manual)

**Deliverable**: AI generates unique weekly challenges based on current sport schedule and game state. Commissioner can approve or auto-post.

---

### Phase 7: Supabase SQL Tables Document
**Spec sections**: User requirement (all sections)

**What to build**:
- `supabase_ensure_survivor_tables.sql` — NEW: Comprehensive idempotent SQL for all 36 Survivor models
  - CREATE TABLE IF NOT EXISTS for every Survivor table
  - ALTER TABLE ADD COLUMN IF NOT EXISTS for all fields
  - CREATE INDEX IF NOT EXISTS for all performance indexes
  - Organized in sections: Config → Tribes → Players → Council/Voting → Idols → Exile → Challenges → Chat → Game State → Audit → Templates → Scoring → Snapshots
- Follows project conventions: TEXT PKs, TIMESTAMPTZ, no foreign keys, double-quoted identifiers

**Deliverable**: Complete Supabase SQL that can be run against any fresh database to create the full Survivor schema.

---

## Sports API Integration (All 7 Sports)

The existing `lib/sports-router.ts` already handles all sports with provider fallback chains. Survivor uses it for:

| Usage | Data Type | Source |
|-------|-----------|--------|
| Weekly fantasy scoring | `stats` + `games` | Sports router (per sport) |
| Challenge content (game picks) | `schedule` + `games` | Sports router |
| Token pool pick'em validation | `games` (results) | Sports router |
| Lineup lock detection | `games` (kickoff times) | Sports router |

**No new sports API work needed** — the router already supports all 7 sports with caching, circuit breakers, and rate limiting.

---

## Key Existing Files Reference

| Category | File | LOC | Purpose |
|----------|------|-----|---------|
| State machine | `lib/survivor/gameStateMachine.ts` | — | Phase transitions |
| Tribal council | `lib/survivor/SurvivorTribalCouncilService.ts` | 7,894 | Council orchestration |
| Vote engine | `lib/survivor/SurvivorVoteEngine.ts` | 9,045 | Vote processing + tie-break |
| Idol system | `lib/survivor/SurvivorIdolRegistry.ts` | 11,848 | Full idol lifecycle |
| Effect engine | `lib/survivor/SurvivorEffectEngine.ts` | 23,121 | Power effects |
| @Chimmy commands | `lib/survivor/SurvivorOfficialCommandService.ts` | 23,264 | Command parsing + execution |
| Finale | `lib/survivor/SurvivorFinaleEngine.ts` | 10,761 | Final 3 + jury vote |
| Exile | `lib/survivor/exileEngine.ts` | 8,366 | Exile Island mechanics |
| Challenges | `lib/survivor/SurvivorChallengeEngine.ts` | 6,321 | Challenge scoring |
| Tribes | `lib/survivor/SurvivorTribeService.ts` | 6,951 | Tribe management |
| Chat | `lib/survivor/SurvivorChatMembershipService.ts` | 5,035 | Permission-gated channels |
| AI host | `lib/survivor/hostEngine.ts` | 5,350 | AI narration |
| AI prompts | `lib/survivor/ai/SurvivorAIPrompts.ts` | 10,162 | Prompt templates |
| Post-draft setup | `lib/survivor/SurvivorDraftBootstrapService.ts` | 3,762 | Tribes + idols + chats |
| Sports data | `lib/sports-router.ts` | — | Multi-provider chain |
| Sleeper import | `lib/sleeper-client.ts` | — | Platform API client |

---

## Verification Plan

| Phase | Verification |
|-------|-------------|
| 1 (Wizard) | Create Survivor league via wizard → verify SurvivorLeagueConfig, tribes, idols, chat channels created |
| 2 (Rocks) | Force a tie at Tribal → verify revote → verify rocks draw → verify elimination of random non-tied player |
| 3 (Scroll) | Complete a Tribal Council → verify sequential vote reveal with animation and timing |
| 4 (Import) | Import Sleeper league → verify rosters map to SurvivorPlayer, tribes formed, game state = pre_merge |
| 5 (Tokens) | Submit pick'em as exiled player → verify scoring against real results → verify token balance update |
| 6 (AI Challenges) | Trigger challenge generation → verify AI produces valid challenge → verify commissioner approval flow |
| 7 (SQL) | Run SQL against fresh Supabase → verify all 36 tables created with correct columns and indexes |

---

## Implementation Priority

1. **Phase 7** (SQL tables) — Quick win, unblocks DB work
2. **Phase 1** (Wizard) — Unblocks user-facing creation flow
3. **Phase 2** (Go to Rocks) — Core gameplay mechanic
4. **Phase 3** (Scroll reveal) — Signature UX feature
5. **Phase 5** (Token pool) — Completes exile gameplay loop
6. **Phase 4** (Sleeper import) — Broadens player acquisition
7. **Phase 6** (AI challenges) — Polish feature, template fallback works
