# Big Brother League — Discovery + Game Design (Prompt 1 of 6)

Design-only deliverable. No implementation code. Merge with existing Survivor-style and specialty-league factory architecture.

---

## 1. Proposed weekly game loop

One **eviction cycle** per week (or configurable period). Order of operations:

1. **HOH (Head of Household) competition**  
   - Run a deterministic challenge (fantasy-based or mini-game) for the week.  
   - Winner becomes HOH (single roster; no tribes).  
   - HOH is ineligible to be nominated and cannot be voted out this cycle.

2. **Nominations**  
   - HOH nominates exactly **2** houseguests (rosters) to the block.  
   - Nominations are recorded; no veto yet.

3. **Veto competition**  
   - Participants: HOH + 2 nominees + **N** randomly selected houseguests (e.g. 3, configurable).  
   - Deterministic draw for the random players; same pattern as Survivor challenge participants.  
   - One veto competition per cycle; winner gets “Power of Veto.”

4. **Veto meeting / use**  
   - Veto winner may **use** veto to remove **one** nominee from the block, or **leave nominations the same**.  
   - If veto is used: HOH must name a **replacement nominee** (one new houseguest to the block).  
   - Final block is always 2 people (or 1 if league size is tiny; edge case).

5. **Private voting (eviction vote)**  
   - All eligible houseguests (except HOH and the two on the block) cast a **private** vote for who to **evict** (vote for one of the two on the block).  
   - Vote window has a deadline (e.g. same day-of-week/time pattern as Survivor vote deadline).  
   - Ties: resolve by deterministic tiebreaker (e.g. lowest total season fantasy points to date, then draft order).

6. **Eviction**  
   - Evicted roster is marked eliminated.  
   - That roster’s **players are released to waivers** (same mechanism as Guillotine: clear `playerData` / release engine).  
   - Eliminated user remains in **league chat/forum** (read-only or limited) and cannot set lineups, make waiver claims, or trade.

7. **Jury threshold (configurable)**  
   - After a configurable “jury start” point (e.g. first eviction after week X, or after N players left), each new evictee becomes a **jury member**.  
   - Jury members do not vote in subsequent evictions; they only vote in the **final vote** for the winner.

8. **Finale**  
   - When 2 (or 3) houseguests remain, **final HOH** (or final competition) determines who sits in the final.  
   - **Jury** votes for the winner (one vote per jury member).  
   - Winner is determined by deterministic tally (no AI).  
   - Optional: runner-up and other finale outcomes for display/audit.

9. **Next cycle**  
   - Advance to next week; repeat from step 1 (new HOH competition).  
   - No tribes, no merge; every-player-for-themselves from week 1.

---

## 2. Proposed league settings

- **Sport**  
  - Same as app: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER (from `lib/sport-scope.ts`).

- **League size**  
  - Min/max houseguests (e.g. 8–16).  
  - Drives roster count and eviction pace.

- **Eviction cycle**  
  - One eviction per week (or per N weeks if desired).  
  - `evictionStartWeek`, `evictionEndWeek` (or “until final 2”), `evictionsPerCycle` (usually 1).

- **HOH competition**  
  - Type: fantasy-based (e.g. highest week score) vs mini-game (score prediction, over/under, etc. from Survivor-style registry).  
  - If fantasy-based: HOH = highest scoring non-HOH-eligible roster for that week (after games lock).

- **Veto participants**  
  - HOH + 2 nominees + `vetoRandomDrawCount` (e.g. 3) randomly selected from remaining houseguests.  
  - Seed for RNG (reproducible) or commissioner override.

- **Vote window**  
  - `voteDeadlineDayOfWeek`, `voteDeadlineTimeUtc` (same idea as Survivor).  
  - Only eligible voters (non-HOH, not on block) can submit; one vote per roster.

- **Jury**  
  - `juryStartWeek` or `juryStartAfterEvictionCount` (e.g. first 7 evicted = jury).  
  - `jurySize` or “all evictees after week X are jury.”

- **Tiebreaker**  
  - Eviction tie: lowest total season fantasy points through that week; then draft order.  
  - Final vote: no tiebreaker needed if odd jury (or configurable rule).

- **Roster release**  
  - On eviction: release timing (immediate vs next waiver run), same options as Guillotine where applicable.

- **Eliminated user access**  
  - Chat/forum: view only (or limited posts).  
  - No lineup, waiver, trade.  
  - Enforced via `rosterGuard` and optional “eliminated” status in UI.

---

## 3. Deterministic systems list

- **Eligibility**  
  - Who can be HOH (e.g. not previous HOH if “can’t win back-to-back” rule).  
  - Who can be nominated (everyone except HOH).  
  - Who can play veto (HOH + nominees + random draw).  
  - Who can vote (everyone except HOH and the two on the block).  
  - Who is jury (evictees after jury start).

- **State changes**  
  - HOH assignment (from challenge result).  
  - Nomination records (two nominees per cycle).  
  - Veto winner and veto use (save one nominee or not).  
  - Replacement nominee when veto is used.  
  - Eviction vote submission (one per voter, before deadline).  
  - Eviction tally and tiebreak (season points, draft order).  
  - Evicted roster marked eliminated; jury enrollment when applicable.

- **Nominations**  
  - Create “block” for cycle; store nominee roster IDs; replacement nominee overwrite when veto used.

- **Vote window**  
  - Open/close by deadline; reject votes after close or from ineligible voters.

- **Tallying**  
  - Count votes per nominee; evictee = most votes (or tiebreak).  
  - No AI in tally.

- **Elimination**  
  - Set roster/league state to “eliminated”; trigger roster release to waivers (reuse Guillotine-style release engine pattern).

- **Waiver release**  
  - Clear evicted roster’s `playerData` (or equivalent) so players enter waiver pool; optional event log.

- **Jury status**  
  - After each eviction, if past jury start, add evictee to jury list (read-only for finale).

- **Finale**  
  - Final vote: jury members submit one vote each for a finalist; winner = most votes (deterministic).

- **Guards**  
  - Eliminated rosters cannot set lineup, claim waivers, or trade (`rosterGuard`).  
  - HOH/nominees/veto participants derived from config and current cycle state only.

---

## 4. AI systems list

- **Challenge / atmosphere**  
  - AI-generated HOH and veto **challenge prompts** or flavor text (e.g. “This week’s HOH is a score prediction challenge…”).  
  - AI does **not** decide who wins; scoring/mini-game result decides.

- **Recaps and narrative**  
  - Weekly recap: who won HOH, who was nominated, veto winner, veto use, who was evicted, jury count.  
  - “House atmosphere” or strategy commentary (no outcome decisions).

- **Explanations**  
  - Explain rules, tiebreakers, jury start, and “how to vote” to users.  
  - Chimmy (or equivalent) can answer questions using **deterministic context only** (current HOH, block, vote deadline, user’s status).

- **Strategy (advisory only)**  
  - Draft strategy for “Big Brother” format (survival, targeting, veto importance).  
  - No AI in eviction or finale outcome.

- **Chimmy integration**  
  - Build `bigBrotherContextForChimmy(leagueId, userId)`: current week, HOH, nominees, veto winner, vote deadline, user’s eligibility (can vote / on block / eliminated), jury count.  
  - Official command parsing for “vote [name]” if commands go through Chimmy (or dedicated commands API like Survivor).

---

## 5. Reusable files / modules to extend

- **Specialty league factory**  
  - `lib/specialty-league/registry.ts` — register Big Brother spec (`id: 'big_brother'`, `leagueVariant: 'big_brother'`).  
  - `lib/specialty-league/types.ts` — already has `big_brother` in `SpecialtyLeagueId`.  
  - `lib/specialty-league/reusable-modules.ts` — implement or adapt: `PrivateVotingContract`, `EliminationPipelineContract`, `MiniGameRegistryContract`, `MergeJuryPhaseContract` (jury/finale), `OfficialCommandParserContract`, `AIHostContextContract` / Chimmy context builder.

- **Survivor (primary reuse)**  
  - `lib/survivor/SurvivorChallengeEngine.ts` — create/lock/resolve challenges; reuse for HOH and veto **competitions** (different types: `hoh`, `veto`).  
  - `lib/survivor/SurvivorVoteEngine.ts` — `submitVote`, `tallyVotes`, tiebreak by season points; reuse pattern for **eviction vote** (different council/round model: “eviction round” with 2 nominees).  
  - `lib/survivor/SurvivorTribalCouncilService.ts` — create round, close round, tally, eliminate; adapt to “eviction round” (no tribes; nominations + veto step before vote).  
  - `lib/survivor/SurvivorJuryEngine.ts` — `shouldJoinJury`, `enrollJuryMember`, `getJuryMembers`; reuse for jury after eviction and for **finale vote**.  
  - `lib/survivor/SurvivorMiniGameRegistry.ts` — add Big Brother challenge types (e.g. `hoh_fantasy_week`, `hoh_prediction`, `veto_*`).  
  - `lib/survivor/SurvivorCommandParser.ts` — pattern for parsing “vote [name]”; add Big Brother command parser (vote, veto_use if needed).  
  - `lib/survivor/ai/survivorContextForChimmy.ts` — template for `bigBrotherContextForChimmy`.

- **Guillotine (roster release + guards)**  
  - `lib/guillotine/GuillotineRosterReleaseEngine.ts` — `releaseChoppedRosters`; **reuse or clone** for “release evicted roster’s players to waivers.”  
  - `lib/guillotine/guillotineGuard.ts` — pattern for `rosterGuard` (chopped = can’t act); Big Brother: eliminated = can’t act.  
  - `lib/guillotine/GuillotineEliminationEngine.ts` — pattern for “run elimination, mark chopped, trigger release, log”; Big Brother: “close eviction round, set evictee, release roster, enroll jury.”

- **League chat / announcements**  
  - `lib/commissioner-settings/CommissionerAnnouncementService.ts` — resolve league chat thread for announcements.  
  - `lib/league-chat/LeagueSystemNoticeRenderer.ts` — system message types; add optional “big_brother_eviction” or “big_brother_hoh” for UI.  
  - Guillotine’s `guillotineChat.ts` — post chop message; similar “eviction notice” post for Big Brother.

- **League create**  
  - `app/api/league/create/route.ts` — add branch for `big_brother` variant; call `upsertBigBrotherConfig` after create (same pattern as Survivor/Guillotine).  
  - `lib/specialty-league/league-create.ts` — `getSpecialtyBootstrapForCreate`, `bootstrapSpecialtyConfig`; register Big Brother in registry so bootstrap runs.

- **Sport scope**  
  - `lib/sport-scope.ts` — all seven sports; Big Brother must work for all (no new sports).  
  - Use `normalizeToSupportedSport`, sport-aware defaults for eviction/jury weeks per sport.

---

## 6. Likely new files needed

- **Config**  
  - `lib/big-brother/BigBrotherLeagueConfig.ts` — `isBigBrotherLeague`, `getBigBrotherConfig`, `upsertBigBrotherConfig` (sport-aware defaults).  
  - Prisma: `BigBrotherLeagueConfig` (and related tables) or single config JSON; plus `BigBrotherEvictionRound`, `BigBrotherVote`, `BigBrotherJuryMember`, `BigBrotherHOH`, `BigBrotherNomination`, `BigBrotherVeto` (or combined “cycle” table with JSON for state).

- **Engines (deterministic)**  
  - `lib/big-brother/BigBrotherHOHEngine.ts` — assign HOH from challenge result or fantasy week score.  
  - `lib/big-brother/BigBrotherNominationEngine.ts` — record nominations; replacement nominee when veto used.  
  - `lib/big-brother/BigBrotherVetoEngine.ts` — select veto participants (HOH + nominees + random); record veto winner; apply “use veto” (remove one nominee, HOH names replacement).  
  - `lib/big-brother/BigBrotherVoteEngine.ts` — submit eviction vote, tally, tiebreak (reuse Survivor tally/tiebreak logic; different round model).  
  - `lib/big-brother/BigBrotherEvictionService.ts` — close round: tally, set evictee, release roster to waivers, enroll jury, remove from “active” actions, post announcement.  
  - `lib/big-brother/BigBrotherJuryEngine.ts` — jury enrollment; finale vote submission and tally (or extend Survivor jury + new “finale vote” table).  
  - `lib/big-brother/BigBrotherRosterReleaseEngine.ts` — release evicted roster’s players (clone/adapt Guillotine).

- **Guards**  
  - `lib/big-brother/bigBrotherGuard.ts` — `isEliminated(leagueId, rosterId)`; used by `rosterGuard` in spec.

- **API routes**  
  - `app/api/leagues/[leagueId]/big-brother/config/route.ts` — GET/PATCH config.  
  - `app/api/leagues/[leagueId]/big-brother/summary/route.ts` — current cycle, HOH, block, veto, vote deadline, standings, jury.  
  - `app/api/leagues/[leagueId]/big-brother/commands/route.ts` — submit vote (and optional veto choice if via API).  
  - `app/api/leagues/[leagueId]/big-brother/ai/route.ts` — AI recap/strategy (deterministic context only).  
  - Commissioner: nomination, veto draw, close round, force eviction (override), etc., as needed.

- **Chimmy / AI**  
  - `lib/big-brother/ai/bigBrotherContextForChimmy.ts` — build context string for Chimmy.  
  - `lib/big-brother/ai/BigBrotherAIContext.ts` — build context for AI recap/prompts.  
  - `lib/big-brother/ai/BigBrotherAIPrompts.ts` — prompt templates (recap, strategy, explanations).  
  - `lib/big-brother/SurvivorCommandParser.ts`-style: `lib/big-brother/BigBrotherCommandParser.ts` — parse “vote [name]” for eviction.

- **UI**  
  - `components/big-brother/BigBrotherHome.tsx` — specialty home (replaces Overview for this league).  
  - Components: current HOH, block, veto status, vote button, eviction history, jury list, finale vote (when applicable).  
  - Mobile-first; no dead buttons (disable when ineligible with clear reason).

- **Schema (Prisma)**  
  - `BigBrotherLeagueConfig` (leagueId, evictionStartWeek, juryStartWeek, vetoRandomDrawCount, voteDeadline*, etc.).  
  - `BigBrotherCycle` or `BigBrotherEvictionRound` (leagueId, week, hohRosterId, nominee1RosterId, nominee2RosterId, vetoWinnerRosterId, vetoUsed, replacementNomineeRosterId, evictedRosterId, closedAt, voteDeadlineAt).  
  - `BigBrotherEvictionVote` (roundId, voterRosterId, targetRosterId).  
  - `BigBrotherJuryMember` (leagueId, rosterId, evictedWeek).  
  - `BigBrotherFinaleVote` (leagueId, juryRosterId, targetRosterId) for winner vote.  
  - Optional: `BigBrotherEliminatedRoster` or use a status table for “eliminated at week X” for guards and display.

- **Automation / jobs**  
  - Cron or manual: “run HOH competition,” “open veto,” “close veto,” “open eviction vote,” “close eviction vote and run eviction.”  
  - Optional: scheduled job to close vote at deadline and run eviction (same pattern as Survivor council close).

---

## 7. Risks / edge cases

- **Tiebreak**  
  - Eviction vote tie: must be deterministic (e.g. lowest season points, then draft order).  
  - Final vote tie: rare; define rule (e.g. jury revote or configurable).

- **Replacement nominee**  
  - HOH must name someone not on block and not themselves; validation required.  
  - If veto used and HOH doesn’t name replacement in time: define rule (e.g. auto-replacement by lowest season points among eligible).

- **Veto “leave same”**  
  - No change to block; vote proceeds between the two nominees.

- **Random veto draw**  
  - Reproducible seed (e.g. leagueId + week) so same league/week always gets same draw.  
  - Exclude HOH and nominees from pool; draw N from rest.

- **Eliminated user in chat**  
  - Clarify: view-only vs can post (e.g. “jury can post but not vote in evictions”).  
  - Enforce “no competitive actions” via rosterGuard and UI hiding of lineup/waiver/trade for eliminated rosters.

- **Final 2 vs final 3**  
  - Config: “finale at 2 houseguests” vs “final 3, then final 2”; jury votes for one winner.  
  - Final HOH or final competition can determine who sits in final 2 (or 3); logic must be deterministic.

- **Late commissioner actions**  
  - Override eviction, override HOH, reopen vote: define commissioner-only actions and audit log (like Survivor/Zombie).

- **Sport-specific weeks**  
  - Eviction/jury weeks depend on season length (NFL vs MLB); use sport-aware defaults from config.

- **Draft and waivers**  
  - Draft: standard; all houseguests get rosters.  
  - Waivers: run as usual for non-eliminated rosters; evicted roster’s players released per release engine.

---

## 8. Migration strategy

- **Schema**  
  - Add Prisma models for Big Brother (config, cycle/round, votes, jury, finale vote).  
  - New migration; no change to existing Survivor/Guillotine/Zombie tables.

- **Registry**  
  - Register Big Brother in `lib/specialty-league/registry.ts` with `detect`, `getConfig`, `upsertConfig`, `rosterGuard`, `getExcludedRosterIds`, `homeComponent`, `summaryRoutePath`, `aiRoutePath`, `capabilities`, optional `runAutomation` and `appendEvent`.  
  - Wire league create: in `app/api/league/create/route.ts` add `big_brother` variant branch and call `upsertBigBrotherConfig`.

- **Wizard**  
  - Add “Big Brother” to league creation wizard (league type selector); map to `leagueVariant: 'big_brother'` and wizard type `big_brother`.  
  - Use `getSpecialtySpecByWizardType('big_brother')` and existing bootstrap flow.

- **Feature flag / entitlement**  
  - Optional: entitlement for `big_brother_ai` (same pattern as `survivor_ai`, `guillotine_ai`).  
  - League visibility: same as other specialty leagues (no separate migration of existing leagues).

- **Chimmy**  
  - In `app/api/chat/chimmy/route.ts`, add `buildBigBrotherContextForChimmy` to the parallel context fetches; append to `userContextStr` when present.  
  - Commands: either same commands API with league-type dispatch (Survivor vs Big Brother) or dedicated `app/api/leagues/[leagueId]/big-brother/commands/route.ts`.

- **Rollout**  
  - Backend and schema first; then summary/commands API; then UI (BigBrotherHome); then AI/Chimmy.  
  - QA on one sport (e.g. NFL) then validate others.

---

## 9. QA plan

- **Creation flow**  
  - Create league with type Big Brother; verify `leagueVariant` and config created; sport-aware defaults.

- **Settings flow**  
  - Update eviction weeks, jury start, veto draw count, vote deadline; save and reload.

- **Draft flow**  
  - Draft runs; all rosters get players; no Big Brother-specific draft logic (unless future “draft order = entry order” etc.).

- **Season flow (deterministic)**  
  - HOH: run HOH competition (fantasy or mini-game); winner assigned; ineligible for nomination.  
  - Nominations: HOH nominates 2; API validates; replacement when veto used.  
  - Veto: draw participants; run veto competition; winner uses or leaves same; replacement nominee if used.  
  - Vote: only eligible voters can submit; one vote per roster; deadline enforced; tally and tiebreak correct.  
  - Eviction: evictee marked; roster released to waivers; jury enrolled when applicable; eliminated roster blocked from lineup/waiver/trade.

- **Guards**  
  - Eliminated roster: cannot set lineup, claim waiver, or trade; can view league and chat (per product).

- **Jury and finale**  
  - Jury members list; finale vote submission (jury only); winner tally deterministic.

- **AI gating**  
  - AI recap/strategy uses only deterministic context; no outcome decided by AI.  
  - Chimmy context includes Big Brother state; no vote or eviction decided by Chimmy.

- **Mobile QA**  
  - Big Brother home and vote/nomination flows usable on small viewports; no dead buttons; clear ineligible states.

- **Multi-sport**  
  - Smoke test NFL, NBA, MLB (or at least two) for config defaults and one full eviction cycle.

- **Reuse**  
  - Verify no regressions in Survivor, Guillotine, or Zombie (shared vote/challenge/jury patterns and registry).

---

## 10. Summary

- **Weekly loop:** HOH → nominations → veto (draw, compete, use/replacement) → private eviction vote → eviction → roster release → jury when applicable → next cycle; finale with jury vote for winner.  
- **Settings:** Sport-agnostic (use app’s seven sports), league size, eviction/jury/veto/vote deadline, tiebreaker.  
- **Deterministic:** Eligibility, nominations, veto draw/use, vote tally, tiebreak, eviction, roster release, jury, finale winner.  
- **AI:** Challenge flavor, recaps, explanations, Chimmy context; no decisions.  
- **Reuse:** Survivor (challenges, vote engine, council/round, jury, commands, Chimmy context), Guillotine (roster release, guards), specialty registry and league create.  
- **New:** Big Brother config, HOH/nomination/veto/eviction/jury engines, guards, API routes, Prisma models, BigBrotherHome and components, AI context/prompts, optional cron for vote close/eviction.

This design is ready for implementation in subsequent prompts (backend, frontend, AI, QA) with full files as requested.
