# PROMPT 346 — AllFantasy Survivor League Backend Deliverable

## Label and path summary

| Label    | Relative path |
|----------|----------------|
| [UPDATED] | `prisma/schema.prisma` (Survivor section + League.survivorConfig) |
| [NEW]    | `lib/survivor/types.ts` |
| [NEW]    | `lib/survivor/constants.ts` |
| [NEW]    | `lib/survivor/SurvivorLeagueConfig.ts` |
| [NEW]    | `lib/survivor/SurvivorAuditLog.ts` |
| [NEW]    | `lib/survivor/SurvivorTribeService.ts` |
| [NEW]    | `lib/survivor/SurvivorTribeShuffleEngine.ts` |
| [NEW]    | `lib/survivor/SurvivorChatMembershipService.ts` |
| [NEW]    | `lib/survivor/SurvivorIdolRegistry.ts` |
| [NEW]    | `lib/survivor/SurvivorVoteEngine.ts` |
| [NEW]    | `lib/survivor/SurvivorTribalCouncilService.ts` |
| [NEW]    | `lib/survivor/SurvivorCommandParser.ts` |
| [NEW]    | `lib/survivor/SurvivorMergeEngine.ts` |
| [NEW]    | `lib/survivor/SurvivorJuryEngine.ts` |
| [NEW]    | `lib/survivor/SurvivorExileEngine.ts` |
| [NEW]    | `lib/survivor/SurvivorTokenEngine.ts` |
| [NEW]    | `lib/survivor/SurvivorReturnEngine.ts` |
| [NEW]    | `lib/survivor/SurvivorChallengeEngine.ts` |
| [NEW]    | `lib/survivor/SurvivorMiniGameRegistry.ts` |
| [NEW]    | `lib/survivor/index.ts` |

---

## Schema changes

- **League:** added `survivorConfig SurvivorLeagueConfig?`.
- **SurvivorLeagueConfig:** 1:1 with League when `leagueVariant = 'survivor'`. Fields: mode, tribeCount, tribeSize, tribeFormation, mergeTrigger, mergeWeek, mergePlayerCount, juryStartAfterMerge, exileReturnEnabled, exileReturnTokens, idolCount, idolPowerPool, tribeShuffle*, voteDeadline*, selfVoteDisallowed, tribalCouncil*, minigameFrequency.
- **SurvivorTribe:** leagueId, configId, name, slotIndex. Unique (configId, slotIndex).
- **SurvivorTribeMember:** tribeId, rosterId, isLeader. Unique (tribeId, rosterId).
- **SurvivorIdol:** leagueId, configId, rosterId, playerId, powerType, status (hidden|revealed|used|expired), assignedAt, usedAt, expiredAt, validUntilPhase.
- **SurvivorIdolLedgerEntry:** idolId, eventType (assigned|transferred|used|expired), fromRosterId, toRosterId, metadata.
- **SurvivorTribalCouncil:** leagueId, configId, week, phase (pre_merge|merge), attendingTribeId, voteDeadlineAt, closedAt, eliminatedRosterId, tieBreakSeasonPoints. Unique (configId, week).
- **SurvivorVote:** councilId, voterRosterId, targetRosterId. Unique (councilId, voterRosterId).
- **SurvivorExileLeague:** mainLeagueId (unique), configId (unique), exileLeagueId.
- **SurvivorExileToken:** exileLeagueId, rosterId, tokens, lastAwardedWeek. Unique (exileLeagueId, rosterId).
- **SurvivorJuryMember:** leagueId, rosterId, votedOutWeek. Unique (leagueId, rosterId).
- **SurvivorAuditLog:** leagueId, configId, eventType, metadata.
- **SurvivorChallenge:** leagueId, configId, week, challengeType, configJson, lockAt, resultJson.
- **SurvivorChallengeSubmission:** challengeId, rosterId?, tribeId?, submission.
- **SurvivorTribeChatMember:** tribeId, rosterId, userId?, isAiHost.

Run: `npx prisma generate`. Run migrations when ready: `npx prisma migrate dev --name add_survivor`.

---

## Event / job / background task requirements

| Task | When | Action |
|------|------|--------|
| **Tribe creation** | After draft completes | Call `SurvivorTribeService.createTribes(leagueId, { rosterIds, formation, tribeNames?, seed? })`; then `SurvivorChatMembershipService.bootstrapTribeChatMembers(leagueId)`; then `SurvivorIdolRegistry.assignIdolsAfterDraft(leagueId, playerRosterPairs, { seed? })`. |
| **Idol transfer on trade** | When a trade is processed (player moves) | For each moved player, call `SurvivorIdolRegistry.getIdolByPlayer(leagueId, playerId)`; if idol, call `transferIdol(leagueId, idolId, receivingRosterId, 'trade')`. |
| **Idol transfer on waiver claim** | When a waiver claim is processed | For claimed player, call `getIdolByPlayer`; if idol, call `transferIdol(..., 'waiver_claim')`. |
| **Idol transfer on steal** | When idol power "steal player" is applied | Transfer stolen player's idol to new owner via `transferIdol(..., 'stolen_player')`. |
| **Vote deadline** | At vote deadline time | Close council: `SurvivorTribalCouncilService.closeCouncil(councilId, seasonPointsSource?)`; then enroll in Exile and optionally Jury; post announcement. |
| **Challenge lock** | At kickoff/deadline | Lock challenge (no new submissions); after games, resolve and apply rewards. |
| **Weekly processing** | End of week | Compute tribe scores; determine attending tribe; create council; open vote window; when deadline passes, close council; enroll eliminated in Exile (+ Jury if applicable); check shuffle trigger; run shuffle if needed; Exile token award; Boss reset if applicable. |
| **Merge transition** | When merge condition met | `SurvivorMergeEngine.recordMerge(leagueId, week)`; phase = merge from next council. |
| **Return to island** | When user has N tokens and merge happened | `SurvivorReturnEngine.canReturnToIsland`; if eligible, `executeReturn` and re-add roster to main league (product). |

---

## Route list (recommended)

Implement when wiring API layer; backend engine is callable from these routes.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/leagues/[leagueId]/survivor/config` | Return Survivor config (404 when not survivor). |
| GET | `/api/leagues/[leagueId]/survivor/tribes` | Tribes and members. |
| GET | `/api/leagues/[leagueId]/survivor/council/[week]` | Council and votes (after close). |
| GET | `/api/leagues/[leagueId]/survivor/audit` | Audit log (optional limit, since, eventTypes). |
| GET | `/api/leagues/[leagueId]/survivor/exile` | Exile league id and token states. |
| POST | `/api/leagues/[leagueId]/survivor/tribes` | Create tribes (commissioner; post-draft). |
| POST | `/api/leagues/[leagueId]/survivor/tribes/shuffle` | Run shuffle (commissioner or auto). |
| POST | `/api/leagues/[leagueId]/survivor/vote` | Submit vote (from @Chimmy command; body: councilId, voterRosterId, targetRosterId). |
| POST | `/api/leagues/[leagueId]/survivor/council/close` | Close council (commissioner or cron). |
| POST | `/api/leagues/[leagueId]/survivor/idol/use` | Play idol (body: idolId, rosterId). |
| POST | `/api/leagues/[leagueId]/survivor/challenge` | Create challenge. |
| POST | `/api/leagues/[leagueId]/survivor/challenge/submit` | Submit challenge answer. |
| POST | `/api/leagues/[leagueId]/survivor/challenge/resolve` | Resolve challenge (commissioner). |
| POST | `/api/leagues/[leagueId]/survivor/return` | Execute return to island (body: exileRosterId). |

---

## QA checklist (mandatory)

- [ ] **No illegal tribe states** — Tribe count/size within bounds; each roster in at most one tribe; shuffle preserves roster set.
- [ ] **Idol ownership transfers** — On trade/waiver/steal, idol control moves to new owner; ledger entries created.
- [ ] **Vote deadlines** — Votes after deadline are rejected; council closes at deadline when triggered.
- [ ] **Tie-breakers** — Tie resolved by lower total season points; result and tieBreakSeasonPoints stored.
- [ ] **Tribe shuffle** — Trigger rules (consecutive losses, imbalance) evaluated; shuffle rebalances; chat membership synced.
- [ ] **Merge** — Merge trigger (week or player count) evaluated; phase and council phase correct post-merge.
- [ ] **Jury** — Jury enrollment when shouldJoinJury; jury members queryable.
- [ ] **Exile Island** — Exile league created/linked; eliminated enrolled; tokens awarded and reset (Boss) correctly.
- [ ] **Best ball** — When mode = bestball, lineup optimization is deterministic (use existing best-ball path); tribe/individual scores from optimized lineup.
- [ ] **No dead backend routes** — Any route that calls Survivor engine returns 404 when `!isSurvivorLeague(leagueId)`.
- [ ] **Season points for tie-break** — Tie-break uses injectable seasonPointsSource; default uses GuillotinePeriodScore when available; Survivor-only leagues should use custom source from league scoring.

---

*End of PROMPT 346 deliverable. Merge with league create (set leagueVariant, upsertSurvivorConfig when type = survivor), draft completion (create tribes, bootstrap chat, assign idols), and chat/command flow (@Chimmy parser) as needed.*
