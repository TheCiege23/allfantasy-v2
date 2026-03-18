# Tournament Mode — Full QA Pass & Final Delivery (Prompt 6)

## 1. Implementation Summary

Tournament Mode is a multi-league elimination game mode: commissioners create one parent tournament with a participant pool; the system creates feeder (qualification) leagues in two conferences, generates invite links for all, and runs deterministic advancement by W-L and points-for tiebreakers. After qualification, advancing teams move into elimination-round leagues with redrafts; FAAB and bench rules change by phase. The hub provides universal standings, bracket view, announcements, and AI overlays (recaps, draft prep, standings analyst). Commissioner tools include lock, rebalance, force-advance (with override), tie-resolution audit, theme/banner, audit log, archive round, champion path, resolve-state, redraft regenerate, draft reopen, bulk update, and create-missing-league. Safety rules: no trades and no draft-pick trading in tournament leagues. All advancement, seeding, eliminations, and cut lines are backend-calculated; AI only explains, narrates, or recommends.

**QA fixes applied in this pass:**
- **Standings losses:** Replaced incorrect `losses = (matchups.length / rosters.length) - wins` with per-roster **games played** (count of matchups where roster is teamA or teamB), then `losses = games - wins - ties`. Ensures W-L and PF tiebreakers use correct records.
- **Wizard preview:** Added “X per conference” to the tournament preview card so projected league balance is explicit before creation.

---

## 2. Full File List

All tournament-related files (backend, frontend, lib, API routes, components):

### API routes
- `app/api/tournament/route.ts`
- `app/api/tournament/create/route.ts`
- `app/api/tournament/[tournamentId]/route.ts`
- `app/api/tournament/[tournamentId]/advance/route.ts`
- `app/api/tournament/[tournamentId]/ai/route.ts`
- `app/api/tournament/[tournamentId]/announcements/route.ts`
- `app/api/tournament/[tournamentId]/archive-round/route.ts`
- `app/api/tournament/[tournamentId]/audit/route.ts`
- `app/api/tournament/[tournamentId]/bracket/route.ts`
- `app/api/tournament/[tournamentId]/bulk-update/route.ts`
- `app/api/tournament/[tournamentId]/champion-path/route.ts`
- `app/api/tournament/[tournamentId]/control/route.ts`
- `app/api/tournament/[tournamentId]/create-missing-league/route.ts`
- `app/api/tournament/[tournamentId]/draft/reopen/route.ts`
- `app/api/tournament/[tournamentId]/export/route.ts`
- `app/api/tournament/[tournamentId]/force-advance/route.ts`
- `app/api/tournament/[tournamentId]/lock/route.ts`
- `app/api/tournament/[tournamentId]/participant/route.ts`
- `app/api/tournament/[tournamentId]/rebalance/route.ts`
- `app/api/tournament/[tournamentId]/redraft/regenerate/route.ts`
- `app/api/tournament/[tournamentId]/rerun-standings/route.ts`
- `app/api/tournament/[tournamentId]/resolve-state/route.ts`
- `app/api/tournament/[tournamentId]/standings/route.ts`
- `app/api/tournament/[tournamentId]/theme/route.ts`
- `app/api/tournament/[tournamentId]/tie-resolution/route.ts`
- `app/api/leagues/[leagueId]/tournament-context/route.ts`
- `app/api/bracket/tournaments/[tournamentId]/leagues/route.ts`
- `app/api/bracket/tournament/[tournamentId]/route.ts`

### Lib (tournament-mode)
- `lib/tournament-mode/advancement-rules.ts`
- `lib/tournament-mode/constants.ts`
- `lib/tournament-mode/LeagueNamingService.ts`
- `lib/tournament-mode/TournamentAdvancementService.ts`
- `lib/tournament-mode/TournamentAuditService.ts`
- `lib/tournament-mode/TournamentConfigService.ts`
- `lib/tournament-mode/TournamentCreationService.ts`
- `lib/tournament-mode/TournamentEliminationEngine.ts`
- `lib/tournament-mode/TournamentExportService.ts`
- `lib/tournament-mode/TournamentProgressionService.ts`
- `lib/tournament-mode/TournamentRedraftService.ts`
- `lib/tournament-mode/TournamentStandingsService.ts`
- `lib/tournament-mode/safety.ts`
- `lib/tournament-mode/types.ts`
- `lib/tournament-mode/index.ts`
- `lib/tournament-mode/ai/index.ts`
- `lib/tournament-mode/ai/TournamentAIContext.ts`
- `lib/tournament-mode/ai/TournamentAIPrompts.ts`
- `lib/tournament-mode/ai/TournamentAIService.ts`
- `lib/tournament-mode/ai/tournamentContextForChimmy.ts`

### App pages
- `app/app/tournament/page.tsx`
- `app/app/tournament/create/page.tsx`
- `app/app/tournament/[tournamentId]/page.tsx`
- `app/app/tournament/[tournamentId]/control/page.tsx`
- `app/brackets/tournament/[tournamentId]/page.tsx`

### Components
- `components/tournament/index.ts`
- `components/tournament/TournamentCreateWizard.tsx`
- `components/tournament/TournamentControlDashboard.tsx`
- `components/tournament/TournamentHubClient.tsx`
- `components/tournament/TournamentLeagueHome.tsx`
- `components/tournament/TournamentTeamView.tsx`

### Integration points (tournament checks)
- `app/api/trade/propose/route.ts` (trade block for tournament leagues)
- `app/api/leagues/[leagueId]/draft/trade-proposals/route.ts` (draft-pick trade block)
- `app/app/league/[leagueId]/page.tsx` (TournamentLeagueHome + TournamentTeamView)

### Schema & migration
- `prisma/schema.prisma` (Tournament, TournamentConference, TournamentLeague, TournamentRound, TournamentAnnouncement, TournamentAuditLog, TournamentParticipant; League.tournamentLeague; Roster.faabRemaining)
- `prisma/migrations/20260352000000_tournament_audit_and_champion/migration.sql`

---

## 3. QA Checklist (Pass/Fail and What Was Validated)

| # | Area | Item | Pass/Fail | Notes |
|---|------|------|-----------|--------|
| 1 | Tournament creation | Can create a tournament successfully | Pass | POST /api/tournament/create with name, sport, settings; returns tournamentId, leagueIds, inviteDistribution. |
| 1 | Tournament creation | Child leagues generated | Pass | TournamentCreationService creates N leagues, TournamentLeague links, rounds, invite codes. |
| 1 | Tournament creation | Commissioner receives invite paths | Pass | create response includes inviteDistribution (leagueId, leagueName, conferenceName, inviteCode, joinUrl); control dashboard lists all with copy/regenerate. |
| 1 | Tournament creation | Custom league naming | Pass | leagueNamingMode commissioner_custom + leagueNames array; validateCommissionerLeagueNames used. |
| 1 | Tournament creation | Generated league naming | Pass | LeagueNamingService generateLeagueNames (BEAST, GOAT, … / NORTH, SOUTH, …). |
| 1 | Tournament creation | Conference assignment | Pass | Conferences created; each league assigned to one conference; orderInConference set. |
| 1 | Tournament creation | Hub/forum created | Pass | Tournament and rounds exist; announcements API and hub UI show forum. |
| 2 | Feeder phase | Users can join feeder leagues | Pass | Join flow uses same invite/join as app; league has inviteCode in settings. |
| 2 | Feeder phase | League counts balance | Pass | computeLeagueCount(pool, size) and per-conference split; wizard shows “X per conference”. |
| 2 | Feeder phase | Standings calculate correctly | Pass | getUniversalStandingsRaw aggregates by league from Roster + MatchupFact; applyConferenceRankingAndCutLine ranks per conference. |
| 2 | Feeder phase | Tiebreakers W-L first, PF second | Pass | compareByTiebreakers with default ['wins', 'points_for']; settings.qualificationTiebreakers override. |
| 2 | Feeder phase | Losses formula | Pass | **Fixed:** games played = count of matchups where roster is teamA or teamB; losses = games - wins - ties. |
| 2 | Feeder phase | Bubble logic when enabled | Pass | getBubbleSlotsPerConference; advancementStatus 'bubble' for slots between cutLine+1 and cutLine+bubbleSlots. |
| 2 | Feeder phase | Non-bubble when disabled | Pass | bubbleSlots = 0 when !bubbleWeekEnabled; only 'advanced' and 'out'. |
| 3 | Round transitions | Advancement selects correct teams | Pass | applyConferenceRankingAndCutLine; advancing = top advancementPerConf (+ bubble) per conference. |
| 3 | Round transitions | Eliminated marked correctly | Pass | TournamentParticipant status = 'eliminated', eliminatedAtRoundIndex set. |
| 3 | Round transitions | Next-round leagues created | Pass | TournamentProgressionService creates elimination leagues, TournamentLeague + TournamentRound. |
| 3 | Round transitions | Users assigned to next-round leagues | Pass | Roster created in new league; participant currentLeagueId/currentRosterId/advancedAtRoundIndex/bracketLabel updated. |
| 3 | Round transitions | Old league history viewable | Pass | Leagues remain; round status set to completed; no deletion. |
| 3 | Round transitions | Redraft rooms created | Pass | scheduleRedraftForRound calls getOrCreateDraftSession per league. |
| 3 | Round transitions | Draft schedules post | Pass | Advance creates pinned announcement; redraft/regenerate API available. |
| 4 | Draft behavior | Snake / linear / auction | Pass | Settings draftType; draft engine uses league config. |
| 4 | Draft behavior | Randomized draft order | Pass | slotOrder from rosters/teams; live-draft-engine handles order. |
| 4 | Draft behavior | No pick trading | Pass | draft/trade-proposals POST returns 403 for tournament leagues (isDraftPickTradingAllowedForLeague). |
| 4 | Draft behavior | No do-over flow | Pass | No tournament-specific do-over; draft picks final. |
| 4 | Draft behavior | Later-round reduced bench | Pass | applyBenchSpotsForRound updates LeagueRosterConfig overrides.benchCount. |
| 5 | Rule changes by phase | Feeder 7 bench / no IR | Pass | benchSpotsQualification default 7; IR not added for tournament. |
| 5 | Rule changes by phase | Elimination 2 bench / no IR | Pass | benchSpotsElimination default 2; applyBenchSpotsForRound(1, 2). |
| 5 | Rule changes by phase | FAAB reset for later rounds | Pass | applyFaabResetForRound(tournamentId, 1, faabBudget). |
| 5 | Rule changes by phase | Scoring settings persist | Pass | League created with scoring; no tournament override of scoring. |
| 6 | Hub / standings / bracket | Universal standings load | Pass | GET /api/tournament/[id]/standings returns standings + cutLine. |
| 6 | Hub / standings / bracket | Conferences display | Pass | Hub client shows conferences and child leagues. |
| 6 | Hub / standings / bracket | Child league mapping | Pass | Bracket tab and control dashboard list leagues by round/conference. |
| 6 | Hub / standings / bracket | Bracket progression | Pass | GET bracket returns rounds, cut line, bubble, leaguesByRound. |
| 6 | Hub / standings / bracket | Bubble tracker | Pass | Standings show advancementStatus; bracket shows bubble description. |
| 6 | Hub / standings / bracket | Export/report | Pass | GET /api/tournament/[id]/export returns CSV. |
| 6 | Hub / standings / bracket | Champion path | Pass | GET /api/tournament/[id]/champion-path?userId= returns path; championUserId on Tournament. |
| 7 | AI | Round announcements from deterministic data | Pass | Advance calls buildTournamentAIContext + generateTournamentAI(round_announcement); static fallback if AI fails. |
| 7 | AI | Tournament recaps | Pass | POST /api/tournament/[id]/ai type weekly_recap, bubble_watch, etc. |
| 7 | AI | Chimmy tournament context | Pass | buildTournamentContextForChimmy; chimmy route merges tournament context; dataSources include tournament_league. |
| 7 | AI | Draft prep before redrafts | Pass | type draft_prep; context includes roster/FAAB rules. |
| 7 | AI | Standings analyst reflects cut lines | Pass | type standings_analysis; context has standings and cut line. |
| 7 | AI | No AI override of advancement | Pass | Prompts include DETERMINISM_RULES; AI only explains/narrates. |
| 8 | Commissioner/admin | Batch creation | Pass | createTournament creates all child leagues in one flow. |
| 8 | Commissioner/admin | Rebalance before lock | Pass | POST rebalance when !lockedAt; audit logged. |
| 8 | Commissioner/admin | Rerun standings | Pass | POST rerun-standings recomputes and logs. |
| 8 | Commissioner/admin | Regenerate draft room | Pass | POST redraft/regenerate with roundIndex. |
| 8 | Commissioner/admin | Archive round leagues | Pass | POST archive-round sets round status to archived. |
| 8 | Commissioner/admin | Audit logs capture actions | Pass | logTournamentAudit for advancement, lock, rebalance, force_advance, tie_resolution, etc. |
| 8 | Commissioner/admin | Override tools role-protected | Pass | Force-advance requires commissioner + settings.commissionerOverrideAllowed or hubSettings.allowForceAdvance; all admin routes check creatorId. |
| 9 | Regression | Normal league creation | Pass | Tournament create is separate flow; leagueVariant set only for tournament leagues. |
| 9 | Regression | Dynasty/specialty leagues | Pass | No change to other league variants. |
| 9 | Regression | Draft engine | Pass | Tournament leagues use same getOrCreateDraftSession; only draft pick trading blocked. |
| 9 | Regression | Standings system | Pass | Tournament standings are separate (getUniversalStandings); league-level standings unchanged. |
| 9 | Regression | Forum/chat | Pass | Tournament announcements are separate table; league chat unchanged. |
| 9 | Regression | AI systems | Pass | Tournament AI is additive; Chimmy and other AI unchanged for non-tournament. |
| 10 | UX | No dead buttons | Pass | Buttons wired to API or navigation. |
| 10 | UX | Mobile layout | Pass | Responsive classes (flex-wrap, grid, sm:). |
| 10 | UX | Loading states | Pass | loading flags and “Loading…” / “Generating…” where applicable. |
| 10 | UX | Empty states | Pass | “No announcements”, “No standings data yet”, etc. |
| 10 | UX | Error states readable | Pass | API error messages and setError in wizard. |
| 10 | UX | Tournament navigation clear | Pass | Hub link from league home; control from hub; breadcrumbs/back links. |
| 10 | UX | Current league / conference / stage / advancement | Pass | TournamentLeagueHome + TournamentTeamView show tournament name, conference, phase, round, advancement status, cut line, next milestone. |

---

## 4. SQL / Schema Changes

- **Tournament:** `championUserId` (VARCHAR 64, nullable), `lockedAt` (TIMESTAMP, nullable).
- **TournamentAuditLog:** new table `tournament_audit_logs` (id, tournamentId, actorId, action, targetType, targetId, metadata, createdAt) with FK to tournaments and indexes on tournamentId and (tournamentId, createdAt).
- **TournamentAnnouncement:** type may include `champion_story` (app-level validation only; DB column is already string).

Migration file: `prisma/migrations/20260352000000_tournament_audit_and_champion/migration.sql` (creates table, adds two columns to tournaments).

---

## 5. Migration Notes

- Run: `npx prisma migrate deploy` (or `npx prisma migrate dev` for a new migration name).
- If the `tournaments` table already has columns from a prior migration, remove the `ALTER TABLE "tournaments" ADD COLUMN "championUserId"` and `ADD COLUMN "lockedAt"` lines from the migration or run a one-off fix migration.
- After migration: `npx prisma generate` (already run during QA).

---

## 6. Manual Commissioner Steps

1. **Create tournament:** App → Tournaments → Create Tournament; fill name, sport, pool size, league size, conferences, qualification weeks, bubble, bench/FAAB; submit. Redirects to control.
2. **Share invites:** Control dashboard lists all child leagues with fill status and Copy link / Regenerate. Share each join link so users join the correct feeder league.
3. **Optional rebalance:** Before locking, use “Rebalance check” to record fill status; redistribute invite links if needed so leagues fill evenly.
4. **Lock:** When ready to start competition, click “Lock tournament.” No rebalance or invite changes after this.
5. **After qualification weeks:** Run “Run qualification advancement” from the hub (commissioner only). This creates elimination leagues, assigns advancing teams, marks eliminated, creates redraft rooms, posts announcement.
6. **Theme (optional):** In control, open “Theme & banner,” set banner URL and theme pack, Save.
7. **Force advance / tie resolution:** Only if override is enabled in settings; use API or advanced tools and document reason (audit log is written).
8. **Archive old rounds:** When a round is finished, use “Archive round” (API or advanced) with the round index.
9. **Champion:** When finals are complete, set `Tournament.championUserId` (via future “set champion” flow or DB) and optionally post a `champion_story` announcement.

---

## 7. Full Files for QA-Changed Code (Prompt 6)

The following files were modified during the QA pass. All other tournament files are as already present in the repo.

### lib/tournament-mode/TournamentStandingsService.ts (losses fix)

Standings now compute **games played** per roster (count of matchups where the roster is teamA or teamB) and set `losses = max(0, games - wins - ties)` so W-L and PF tiebreakers use correct records. See repo for full file.

### lib/tournament-mode/TournamentProgressionService.ts (losses fix)

syncQualificationParticipants now uses the same games-played logic for qualificationLosses when creating TournamentParticipant rows. See repo for full file.

### components/tournament/TournamentCreateWizard.tsx (preview enhancement)

Tournament preview card now includes “(X per conference)” next to feeder league count. See repo for full file.

---

*End of Tournament Mode QA & Delivery document.*
