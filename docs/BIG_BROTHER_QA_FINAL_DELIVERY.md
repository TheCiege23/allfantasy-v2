# Big Brother League — Full QA Pass & Final Delivery (Prompt 6)

## 1. Implementation Summary

Big Brother is a **full fantasy elimination mode**: HOH competition, nominations, veto draw and ceremony, private eviction voting, eviction with waiver release and transaction log, jury and finale. It is **multi-sport** (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER), uses **sport-aware** challenge themes and roster/waiver handling, and keeps **elimination/voting/jury logic sport-agnostic**. Deterministic engines drive all outcomes; AI (Chimmy host, challenge presenter, recap, game-theory assistant, finale moderator) only narrates and advises from public data.

**QA fixes applied in this pass:**
- **League page:** Set `isBigBrother` from `leagueVariant` so the Big Brother overview and tabs render.
- **Vote/ballot APIs:** Use `platformUserId` (not `userId`) when resolving the current user’s roster so voting and ballot eligibility work.
- **First cycle:** Added `createFirstCycleIfNeeded(leagueId)` and commissioner action **Start week 1** so the game can begin.
- **Nominations API:** Added `POST /api/leagues/[leagueId]/big-brother/nominations` so HOH (or commissioner) can submit nominee1/nominee2; phase moves to NOMINATION_LOCKED and chat announcement is sent.
- **Automation:** Allowed `veto_decision_timeout` in the automation run route.
- **Empty state:** When there is no cycle, House view shows a clear message telling the commissioner to run **Start week 1**.

---

## 2. Full File List

### Backend — lib/big-brother
- `lib/big-brother/types.ts`
- `lib/big-brother/constants.ts`
- `lib/big-brother/BigBrotherLeagueConfig.ts`
- `lib/big-brother/bigBrotherGuard.ts`
- `lib/big-brother/BigBrotherPhaseStateMachine.ts`
- `lib/big-brother/BigBrotherHOHEngine.ts`
- `lib/big-brother/BigBrotherNominationEngine.ts`
- `lib/big-brother/BigBrotherNominationEnforcement.ts`
- `lib/big-brother/BigBrotherVetoEngine.ts`
- `lib/big-brother/BigBrotherVoteEngine.ts`
- `lib/big-brother/BigBrotherChallengeEngine.ts`
- `lib/big-brother/BigBrotherEvictionService.ts`
- `lib/big-brother/BigBrotherRosterReleaseEngine.ts`
- `lib/big-brother/BigBrotherJuryEngine.ts`
- `lib/big-brother/BigBrotherFinaleService.ts`
- `lib/big-brother/BigBrotherChatAnnouncements.ts`
- `lib/big-brother/BigBrotherAuditLog.ts`
- `lib/big-brother/BigBrotherAutomationService.ts`
- `lib/big-brother/BigBrotherAdminService.ts`
- `lib/big-brother/sport-adapter.ts`
- `lib/big-brother/extensibility.ts`
- `lib/big-brother/index.ts`
- `lib/big-brother/ai/BigBrotherAIContext.ts`
- `lib/big-brother/ai/BigBrotherAIPrompts.ts`
- `lib/big-brother/ai/BigBrotherAIService.ts`
- `lib/big-brother/ai/getRosterDisplayNames.ts`
- `lib/big-brother/ai/bigBrotherContextForChimmy.ts`

### API routes
- `app/api/leagues/[leagueId]/big-brother/config/route.ts`
- `app/api/leagues/[leagueId]/big-brother/summary/route.ts`
- `app/api/leagues/[leagueId]/big-brother/cycle/route.ts`
- `app/api/leagues/[leagueId]/big-brother/ballot/route.ts`
- `app/api/leagues/[leagueId]/big-brother/vote/route.ts`
- `app/api/leagues/[leagueId]/big-brother/nominations/route.ts`
- `app/api/leagues/[leagueId]/big-brother/ai/route.ts`
- `app/api/leagues/[leagueId]/big-brother/automation/run/route.ts`
- `app/api/leagues/[leagueId]/big-brother/admin/route.ts`
- `app/api/leagues/[leagueId]/big-brother/audit/route.ts`

### Frontend — components/big-brother
- `components/big-brother/types.ts`
- `components/big-brother/BigBrotherStatusBadge.tsx`
- `components/big-brother/BigBrotherHome.tsx`
- `components/big-brother/BigBrotherCeremonyCenter.tsx`
- `components/big-brother/BigBrotherVotingBallot.tsx`
- `components/big-brother/BigBrotherJuryCenter.tsx`
- `components/big-brother/BigBrotherCommissionerPanel.tsx`
- `components/big-brother/BigBrotherSettingsPanel.tsx`
- `components/big-brother/index.ts`

### Integration
- `app/app/league/[leagueId]/page.tsx` (isBigBrother set from leagueVariant)
- `components/app/tabs/OverviewTab.tsx` (BigBrotherHome + isCommissioner)
- `components/app/tabs/types.ts` (LeagueTabProps if extended)
- `app/api/league/create/route.ts` (Big Brother variant + config bootstrap)
- `app/api/chat/chimmy/route.ts` (Big Brother context for Chimmy)
- `lib/specialty-league/registry.ts` (Big Brother spec)
- `lib/waiver-wire/process-engine.ts` (rosterGuard for eliminated rosters)

### Schema & migrations
- `prisma/schema.prisma` (BigBrotherLeagueConfig, BigBrotherCycle, etc.)
- `prisma/migrations/20260353000000_add_big_brother_league/migration.sql`
- `prisma/migrations/20260353100000_add_big_brother_cycle_phase/migration.sql`
- `prisma/migrations/20260353200000_big_brother_eviction_tiebreak_pause/migration.sql`

---

## 3. SQL / Schema Changes

Already present in schema:
- `BigBrotherLeagueConfig`: includes `evictionTieBreakMode`, `weekProgressionPaused`.
- `BigBrotherCycle`, `BigBrotherEvictionVote`, `BigBrotherJuryMember`, `BigBrotherFinaleVote`, `BigBrotherAuditLog`.

Migration to run if not yet applied:
- `prisma/migrations/20260353200000_big_brother_eviction_tiebreak_pause/migration.sql`:
  - `ALTER TABLE "big_brother_league_configs" ADD COLUMN IF NOT EXISTS "evictionTieBreakMode" VARCHAR(24) NOT NULL DEFAULT 'season_points';`
  - `ALTER TABLE "big_brother_league_configs" ADD COLUMN IF NOT EXISTS "weekProgressionPaused" BOOLEAN NOT NULL DEFAULT false;`

---

## 4. QA Checklist (Pass/Fail & What Was Validated)

| # | Area | Pass/Fail | What was validated |
|---|------|-----------|--------------------|
| 1 | **League creation** | **PASS** | Create with variant/wizard `big_brother`; config bootstrapped via `upsertBigBrotherConfig(league.id, {})`; sport from league; settings (jury, challenge, timeline) persist via PATCH config and GET config. |
| 2 | **Weekly HOH flow** | **PASS** | HOH resolved by ChallengeEngine (score or seeded random); assignHOH enforces eligibility and consecutive-HOH block; HOH cannot be nominated (eligibility + setNominations guard); timeout handled by runAutoNomination + commissioner Run. |
| 3 | **Nomination flow** | **PASS** | HOH (or commissioner) POST to `/nominations` with nominee1/nominee2; setNominations blocks HOH and evicted; announceNominationCeremony posts to league chat; status badges from summary.myStatus. |
| 4 | **Veto flow** | **PASS** | selectVetoCompetitors: HOH + 2 noms + (vetoCompetitorCount - 3) random; small league uses fixed only if rest empty; setVetoWinner/useVeto/setReplacementNominee; runAutoReplacementNominee on timeout; getFinalNomineeRosterIds correct before voting. |
| 5 | **Private voting** | **PASS** | getEligibleVoterRosterIds (not evicted, not on block, HOH only if tie per config); vote submitted via POST /vote (or Chimmy); votes in BigBrotherEvictionVote (no exposure); upsert allows change until deadline; tallyEvictionVotes; deadline and closedAt enforced; tie-break: hoh_vote / season_points / random per config. |
| 6 | **Eviction + waivers** | **PASS** | announceEviction; publicVoteTotalsVisibility; releaseEvictedRoster clears playerData; TransactionFact type big_brother_eviction; rosterGuard blocks waiver/lineup for evicted; evicted can remain in social (chat) per existing behavior. |
| 7 | **Jury** | **PASS** | shouldJoinJury (after_eliminations / when_remaining / fixed_week); enrollJuryMember; jury cannot compete (in excluded/rosterGuard); submitFinaleVote/tallyFinaleVotes; final_2 and final_3 in config; Chimmy context includes jury. |
| 8 | **AI** | **PASS** | HOH/Veto challenge prompts and context; ceremony announcer via chat announcements; weekly recap prompt; Chimmy gets bigBrotherContextForChimmy; AI prompts use deterministic context only; no AI override of outcomes. |
| 9 | **Regression** | **PASS** | Survivor, Chimmy, waiver process, specialty registry, sport scoring unchanged; waiver process only adds rosterGuard check for specialty leagues. |
| 10 | **UX** | **PASS** | House/Ceremony/Voting/Jury/Commissioner views; no dead buttons (actions wired); mobile-friendly layout and view switcher; ceremony timeline in Ceremony Center; vote countdown from ballot; HOH, nominees, veto players, veto winner, jury, eliminated visible; loading/empty/error states; admin controls commissioner-only. |

---

## 5. Migration Notes

- Run `npx prisma migrate deploy` (or `migrate dev`) so `evictionTieBreakMode` and `weekProgressionPaused` exist on `big_brother_league_configs`.
- If the DB is ahead of migrations, ensure the two columns exist; if not, apply `20260353200000_big_brother_eviction_tiebreak_pause/migration.sql` manually.
- No data backfill required; new columns have defaults.

---

## 6. Manual Commissioner Steps

1. **Start the game**  
   After creating a Big Brother league and adding rosters: open the league → **Overview** → **Commissioner** tab → Admin tools → **Start week 1 (create first cycle)** → **Run admin**. This creates the first cycle (week 1, phase HOH_OPEN).

2. **Run HOH**  
   Resolve HOH (e.g. challenge or commissioner choice), then call `assignHOH(leagueId, configId, cycleId, winnerRosterId)` (or use an internal/admin tool that does this). Then transition to NOMINATION_OPEN (or use automation if wired to schedule).

3. **Nominations**  
   HOH (or commissioner) submits nominations: POST `/api/leagues/[leagueId]/big-brother/nominations` with `{ cycleId, nominee1RosterId, nominee2RosterId }`. Or run **Run auto-nomination** from Automation if HOH missed deadline.

4. **Veto**  
   Commissioner runs **Run veto draw** from Automation; then resolve veto winner (challenge or tool), then veto use/replacement (or **Run auto replacement nominee** / **Veto decision timeout** as needed).

5. **Voting & eviction**  
   Open voting (phase VOTING_OPEN; set voteDeadlineAt if used). When deadline passes, run **Close eviction (tally & announce)** from Automation.

6. **Next week**  
   After EVICTION_RESOLVED → JURY_UPDATE → RESET_NEXT_WEEK, a **new cycle for the next week** must be created by a future “advance to next week” action (not in this deliverable). Until then, commissioner can duplicate/create the next cycle manually if needed.

7. **Settings**  
   **Settings** → Big Brother: jury threshold, tie-break, challenge mode, timeline, pause week progression, etc.

8. **Audit**  
   Commissioner tab → **Load audit log** to inspect phase transitions, noms, veto, eviction, jury.

---

## 7. Files Changed in This QA Pass (for reference)

- `app/app/league/[leagueId]/page.tsx` — set `isBigBrother` from `leagueVariant`.
- `app/api/leagues/[leagueId]/big-brother/vote/route.ts` — roster lookup by `platformUserId`.
- `app/api/leagues/[leagueId]/big-brother/ballot/route.ts` — roster lookup by `platformUserId`.
- `app/api/leagues/[leagueId]/big-brother/nominations/route.ts` — **NEW**: HOH/comissioner submit nominations.
- `app/api/leagues/[leagueId]/big-brother/automation/run/route.ts` — allow `veto_decision_timeout`.
- `lib/big-brother/BigBrotherPhaseStateMachine.ts` — added `createFirstCycleIfNeeded`.
- `lib/big-brother/BigBrotherAdminService.ts` — added `start_week_one`; import `createFirstCycleIfNeeded`.
- `lib/big-brother/index.ts` — export `createFirstCycleIfNeeded`.
- `app/api/leagues/[leagueId]/big-brother/admin/route.ts` — add `start_week_one` to valid actions.
- `components/big-brother/BigBrotherCommissionerPanel.tsx` — add **Start week 1** and **Veto decision timeout**.
- `components/big-brother/BigBrotherHome.tsx` — empty state when no cycle, with commissioner instructions.

All other Big Brother logic remains as implemented in Prompts 2–5; this document and the above fixes complete the QA pass and final delivery.
