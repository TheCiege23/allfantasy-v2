# PROMPT 350 — Specialty League Factory Update for Survivor

## 1. Extracted reusable modules

These are **contracts** (interfaces) in `lib/specialty-league/reusable-modules.ts`. Implementations remain in league-specific engines (e.g. `lib/survivor/*`). Future leagues (Big Brother, Tournament, etc.) can implement the same contracts.

| Module | Contract | Description | Survivor implementation |
|--------|----------|-------------|-------------------------|
| **Tribe / group orchestration** | `TribeOrchestrationContract` | createGroups (random/commissioner), getGroupsWithMembers, getGroupForRoster, setGroupName, setGroupLeader | `SurvivorTribeService`: createTribes, getTribesWithMembers, getTribeForRoster, setTribeName, setTribeLeader |
| **Hidden power systems** | `HiddenPowerContract` | assignAfterDraft (max 1 per roster), transfer (trade/waiver/stolen), getByPlayer, use, expire, getActiveForRoster | `SurvivorIdolRegistry`: assignIdolsAfterDraft, transferIdol, getIdolByPlayer, useIdol, expireIdol, getActiveIdolsForRoster |
| **Private voting** | `PrivateVotingContract` | submitVote (before deadline), tallyVotes (with optional SeasonPointsSource for tie-break) | `SurvivorVoteEngine`: submitVote, tallyVotes |
| **Elimination pipeline** | `EliminationPipelineContract` | createRound, closeRound (tally → set eliminated → remove from group chat → enroll sidecar/jury) | `SurvivorTribalCouncilService`: createCouncil, closeCouncil (+ enrollInExile, enrollJuryMember) |
| **Exile / sidecar league** | `SidecarLeagueContract` | getOrCreateSidecarLeague, getSidecarLeagueId, enroll(rosterId, platformUserId) | `SurvivorExileEngine`: getOrCreateExileLeague, getExileLeagueId, enrollInExile |
| **Tokenized return** | `TokenizedReturnContract` | awardTokenToTop, resetAllWhenBossWins, canReturn, executeReturn | `SurvivorTokenEngine`, `SurvivorReturnEngine` |
| **Mini-game registry** | `MiniGameRegistryContract` | createChallenge, submitAnswer, resolveChallenge, getChallengesForWeek | `SurvivorChallengeEngine` |
| **Merge / jury / finale** | `MergeJuryPhaseContract` | isMergeTriggered, shouldJoinJury, enrollJuryMember, getJuryMembers | `SurvivorMergeEngine`, `SurvivorJuryEngine` |
| **@Chimmy command parsing** | `OfficialCommandParserContract` | parse(raw) → ParsedCommand, looksLikeOfficialCommand | `SurvivorCommandParser`: parseSurvivorCommand, looksLikeOfficialCommand |
| **AI host voice hooks** | `AIHostContextContract`, `AIHostPromptContract`, `AIHostGenerateContract`, `ChimmyContextBuilder` | buildContext, buildPrompt(context, type), generate(context, type), buildChimmyContext(leagueId, userId) | `lib/survivor/ai/*`: SurvivorAIContext, SurvivorAIPrompts, SurvivorAIService, survivorContextForChimmy |

---

## 2. Survivor-specific extension points

Survivor plugs into the factory as follows.

| Extension point | Location | Notes |
|-----------------|----------|--------|
| **Spec registration** | `lib/specialty-league/registry.ts` | `registerSurvivor()`: detect, getConfig, upsertConfig, homeComponent, summaryRoutePath, aiRoutePath, capabilities |
| **League create** | `app/api/league/create/route.ts` | When `leagueVariant` or `league_type` is `survivor`, set `resolvedVariant: 'survivor'` and call `upsertSurvivorConfig(leagueId, { mode, tribeCount, tribeSize })` |
| **Overview tab** | `components/app/tabs/OverviewTab.tsx` | When `isSurvivor`, render `<SurvivorHome leagueId={leagueId} />` |
| **Config API** | `app/api/leagues/[leagueId]/survivor/config` | GET/PUT config (commissioner for PUT) |
| **Tribes API** | `app/api/leagues/[leagueId]/survivor/tribes` | POST create tribes + bootstrap tribe chat |
| **Commands API** | `app/api/leagues/[leagueId]/survivor/commands` | POST process vote / play_idol / challenge_pick |
| **Summary API** | `app/api/leagues/[leagueId]/survivor/summary` | GET full summary for home/panels |
| **AI API** | `app/api/leagues/[leagueId]/survivor/ai` | POST host/helper narrative; entitlement survivor_ai |
| **Chimmy context** | `app/api/chat/chimmy/route.ts` | Optional `leagueId` in formData → `buildSurvivorContextForChimmy(leagueId, userId)` appended to user context |
| **Capabilities** | `spec.capabilities` | All true: tribeOrchestration, hiddenPowerSystem, privateVoting, eliminationPipeline, sidecarLeague, tokenizedReturn, miniGameRegistry, mergeJuryPhases, officialCommandParsing, aiHostHooks |

Survivor does **not** currently set `rosterGuard` or `getExcludedRosterIds` on the spec; product can add a helper that returns voted-out + jury roster IDs and register it for waiver/lineup guards.

---

## 3. Common automation modules

Defined in `lib/specialty-league/common-automation.ts`.

| Concept | Description |
|--------|-------------|
| **WeeklyAutomationRunner** | `(leagueId, weekOrPeriod, sport, specId) => Promise<{ ok, error? }>`. Dispatches to `spec.runAutomation` when present. |
| **AppendEventFn** | `(leagueId, eventType, metadata?) => Promise<void>`. League-specific event log append. |
| **SeasonPointsSourceFactory** | Factory that returns `{ getSeasonPointsForRoster(leagueId, rosterId, throughWeek) }` for tie-break (e.g. vote tally). |
| **COMMON_AUTOMATION_HOOKS** | `weekly_evaluation`, `period_close`, `token_award`, `boss_reset`, `merge_check`, `jury_enrollment`, `return_eligibility`, `event_log_append`. Use to classify what a league’s automation does. |

Guillotine uses weekly evaluation (chop, danger, release). Survivor uses period_close (close council), jury_enrollment, token_award, boss_reset, return_eligibility, event_log_append via engine functions; no single `runAutomation` is registered—commissioner or cron calls engine APIs.

---

## 4. Common AI modules

Defined in `lib/specialty-league/common-ai.ts`.

| Concept | Description |
|--------|-------------|
| **SPECIALTY_AI_RULE** | “Deterministic context only. AI never decides: elimination, vote validity, power validity, immunity, or return. AI explains and narrates only.” |
| **BuildAIContextFn** | `(leagueId, weekOrPeriod, type, userId, userRosterId?) => Promise<context \| null>`. No outcome logic. |
| **BuildAIPromptFn** | `(context, type) => { system, user }`. All prompts must state no legal outcomes from AI. |
| **GenerateAIFn** | `(context, type) => Promise<{ narrative, explanation?, model? }>`. |
| **SpecialtyAIEntitlementCheck** | `(userId, featureId) => Promise<boolean>`. Gate for premium AI. |
| **BuildChimmyContextFn** | `(leagueId, userId) => Promise<string>`. Short context for Chimmy when user is in this league. |
| **COMMON_AI_HOST_TYPES** | host_intro, host_weekly, host_merge, host_round_close, host_scroll_reveal, host_jury_finale. |
| **COMMON_AI_HELPER_TYPES** | tribe_strategy, power_advice, round_risk, sidecar_strategy, return_strategy, bestball_advice. |

Guillotine: `lib/guillotine/ai` (context, prompts, generate); route `/api/leagues/[leagueId]/guillotine/ai`; entitlement `guillotine_ai`.  
Survivor: `lib/survivor/ai` (context, prompts, generate, survivorContextForChimmy); route `/api/leagues/[leagueId]/survivor/ai`; entitlement `survivor_ai`; Chimmy receives context when `leagueId` is sent.

---

## 5. Future specialty league build checklist

Use this when adding a new specialty league (Big Brother, Devy, Tournament, BestBall, IDP, Zombie, Keeper).

### 5.1 Backend

- [ ] **Config** — Prisma model (e.g. `BigBrotherLeagueConfig`); loader `getConfig(leagueId)`; upsert `upsertConfig(leagueId, input)`; sport-aware defaults where needed.
- [ ] **Detection** — `isXLeague(leagueId)` (config row or `League.leagueVariant === 'x'`).
- [ ] **Registry** — Add `registerX()` in `lib/specialty-league/registry.ts`: id, leagueVariant, label, wizardLeagueTypeId, detect, getConfig, upsertConfig, assets, homeComponent, summaryRoutePath, aiRoutePath; optional rosterGuard, getExcludedRosterIds, capabilities, runAutomation, appendEvent, ai, commissionerActions.
- [ ] **League create** — In `app/api/league/create/route.ts`, set `resolvedVariant` and call `spec.upsertConfig(leagueId, { ... })` when variant/type matches.
- [ ] **Summary route** — `GET /api/leagues/[leagueId]/x/summary` (or equivalent) for home/panels; 404 when not this type.
- [ ] **Guards** — If league has “excluded” rosters (chopped, eliminated, etc.), implement `rosterGuard` and/or `getExcludedRosterIds` and wire waiver/lineup/trade to them.
- [ ] **Reusable contracts** — If the league uses tribes, voting, powers, sidecar, tokens, minigames, merge/jury, implement the corresponding contracts in `lib/x/*` (no need to move code; just align with interfaces).
- [ ] **Automation** — If weekly/period jobs are needed, implement `spec.runAutomation` or document which engine APIs cron/commissioner calls.
- [ ] **AI** — If the league has dedicated AI: deterministic context builder, prompt builder, generate; entitlement check; `POST /api/leagues/[leagueId]/x/ai`. Respect SPECIALTY_AI_RULE.
- [ ] **Chimmy** — Optional: if league benefits from Chimmy context, add `buildXContextForChimmy(leagueId, userId)` and call it from Chimmy route when `leagueId` is provided and league is this type.

### 5.2 Frontend

- [ ] **Overview** — In `components/app/tabs/OverviewTab.tsx`, when variant is this type, render specialty home component (e.g. `XHome`).
- [ ] **League page** — Ensure `leagueVariant` is fetched from `/api/leagues/[leagueId]` and passed to Overview (and first-entry modal if any).
- [ ] **Specialty home** — Component that fetches summary from summary route and renders panels/tabs (view switcher, mobile dropdown, desktop pills).
- [ ] **First-entry modal** — Optional; if present, register in spec and show once per league (e.g. localStorage).

### 5.3 Policy and QA

- [ ] **Automation vs AI** — In `lib/specialty-league/automation-ai-policy.ts`, add `X_DETERMINISTIC_FEATURES` and `X_AI_OPTIONAL_FEATURES` (and hybrid map if needed).
- [ ] **QA harness** — Implement optional `spec.qaHarness` or run `runSpecialtyQAHarness({ leagueId, spec })` for standard checks.
- [ ] **Sport scope** — Use `lib/sport-scope.ts` (SUPPORTED_SPORTS, DEFAULT_SPORT, normalizeToSupportedSport) for any sport-specific logic.

### 5.4 Docs

- [ ] **Checklist** — Add this league to “Current specialty leagues” in this doc and in README.
- [ ] **Deliverable** — Create a short deliverable or QA doc (routes, component tree, QA checklist) for the new league.

---

## 6. Recommended next league build order

Recommended order for implementing upcoming leagues, based on reuse and product impact.

| Order | League | Rationale |
|-------|--------|-----------|
| 1 | **Big Brother** | Reuses most Survivor patterns: tribes → houseguests, voting, eviction pipeline, sidecar (jury), power/advantage, possible tokens. Easiest reuse of tribe orchestration, private voting, elimination pipeline, AI host. |
| 2 | **Best Ball** | Already a league type in wizard; may need specialty config and bestball-specific scoring/lineup optimization. Reuses deterministic bestball_optimization category; AI helper for construction. |
| 3 | **Keeper** | Keeper rules (slots, rounds, costs). Reuses config + guards; no tribe/voting/sidecar. Simpler than Survivor. |
| 4 | **IDP** | Format variant (roster/scoring); often combined with redraft/dynasty. Reuses sport-scope and roster/position logic; specialty config for IDP-specific defaults. |
| 5 | **Devy** | Devy rosters and eligibility. Reuses config and roster guards; devy-specific player pool and eligibility. |
| 6 | **Merged Devy** | Devy + merge of multiple devy leagues; more complex data model. |
| 7 | **Tournament** | Bracket or tournament structure. New contracts: bracket tree, matchups, advancement. Less overlap with Survivor than Big Brother. |
| 8 | **Zombie** | Zombie-specific rules (resurrection, scoring). Reuses elimination/return concepts; different flavor than Survivor. |

**Do not start the next league yet** — this deliverable only updates the factory and documents the order.

---

## File summary (new/updated)

| File | Role |
|------|------|
| `lib/specialty-league/reusable-modules.ts` | **NEW** — Contracts for tribe, hidden power, voting, elimination, sidecar, tokens, minigame, merge/jury, command parsing, AI host. |
| `lib/specialty-league/common-automation.ts` | **NEW** — WeeklyAutomationRunner, AppendEventFn, SeasonPointsSourceFactory, COMMON_AUTOMATION_HOOKS. |
| `lib/specialty-league/common-ai.ts` | **NEW** — SPECIALTY_AI_RULE, BuildAIContextFn, BuildAIPromptFn, GenerateAIFn, ChimmyContextBuilder, COMMON_AI_HOST_TYPES, COMMON_AI_HELPER_TYPES. |
| `lib/specialty-league/qa-harness.ts` | **NEW** — runSpecialtyQAHarness, QA_HARNESS_CHECKS. |
| `lib/specialty-league/types.ts` | **UPDATED** — SpecialtyLeagueCapabilities, SpecialtyQAHarness; spec extended with capabilities?, qaHarness?. |
| `lib/specialty-league/registry.ts` | **UPDATED** — registerSurvivor(); Survivor spec with capabilities. |
| `lib/specialty-league/index.ts` | **UPDATED** — Exports for reusable-modules, common-automation, common-ai, qa-harness. |
| `docs/PROMPT350_SPECIALTY_LEAGUE_FACTORY_UPDATE.md` | **NEW** — This deliverable. |
