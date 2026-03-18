# PROMPT 349 — Survivor League QA + Workflow Validation Deliverable

## 1. Issue list by severity

### Critical (blocking full workflow)

| # | Issue | Status |
|---|--------|--------|
| C1 | League create did not set `leagueVariant: 'survivor'` or create SurvivorLeagueConfig | **Fixed** — league create route now sets isSurvivor and upserts survivor config (mode, tribeCount, tribeSize from settings). |
| C2 | closeCouncil did not enroll eliminated roster into Exile or Jury | **Fixed** — closeCouncil now calls enrollInExile(leagueId, eliminatedRosterId, platformUserId) and, when shouldJoinJury, enrollJuryMember(). |
| C3 | Tie-break season points: Survivor leagues may not have GuillotinePeriodScore | **Fixed** — getSeasonPointsFromRosterPerformance now falls back to TeamPerformance (Roster → teamId) when GuillotinePeriodScore sum is 0. |
| C4 | No API to create tribes or process official commands | **Fixed** — POST `/api/leagues/[leagueId]/survivor/tribes` (create tribes + bootstrap chat), POST `/api/leagues/[leagueId]/survivor/commands` (vote, play_idol, challenge_pick). |
| C5 | No API to read/update Survivor config | **Fixed** — GET/PUT `/api/leagues/[leagueId]/survivor/config`. |

### High (workflow partially broken without fixes)

| # | Issue | Status |
|---|--------|--------|
| H1 | Tribe chat: League chat tab may not filter by `source=tribe_<tribeId>`; frontend may not pass tribe context | **Documented** — Backend has getTribeChatSource, getTribeChatMemberRosterIds; chat UI should send leagueId + optional source (tribe_<tribeId>) and filter messages by membership. |
| H2 | Idol transfer on trade/waiver/steal: no hooks from trade or waiver engines calling transferIdol | **Documented** — transferIdol(leagueId, idolId, toRosterId, reason) exists; product must call it from trade/waiver/steal completion flows (e.g. waiver run-hooks, trade execution). |
| H3 | Challenge lock at kickoff: lockAt is set at challenge create; no automated “at kickoff” without cron | **Documented** — createChallenge(leagueId, week, type, configJson, lockAt); commissioner or scheduled job should set lockAt to kickoff time. |
| H4 | Scroll reveal / announce voted-out in league chat: not automated | **Documented** — Audit log has eliminated event; product can post a system/broadcast message to league chat when council closes (e.g. from commissioner close-council flow). |
| H5 | Exile roster claim flow / FAAB: Exile league is a separate League; standard waiver/FAAB applies there; no Survivor-specific claim API | **Documented** — Exile league uses existing waiver/roster APIs; token award is awardTokenToTopExile; Boss reset is resetAllTokensWhenBossWins. |

### Medium (UX or edge cases)

| # | Issue | Status |
|---|--------|--------|
| M1 | Commands route resolves vote target by display name (team name); multiple rosters could share similar names | **Accepted** — Match is by exact team name; commissioner can ensure distinct names. |
| M2 | Bestball scoring: config.mode is bestball but tribe score aggregation may live in challenge/standings logic | **Documented** — Tribe “score” for immunity/challenges is not yet aggregated in summary; add when challenge types define tribe scoring. |
| M3 | Commissioner create council / close council: no dedicated API | **Documented** — Services createCouncil, closeCouncil exist; add POST survivor/council (create) and POST survivor/council/close (close) for commissioner if needed. |

### Low / Informational

| # | Issue | Status |
|---|--------|--------|
| L1 | Mobile/desktop UX: Survivor frontend uses same responsive patterns as Salary Cap / Guillotine | **Verified** — View switcher is dropdown on mobile, pills on desktop. |
| L2 | Premium AI gating: survivor_ai entitlement checked in route; useEntitlement in panel | **Verified** — ALLOW_WHEN_ENTITLEMENTS_OPEN allows all; when enforced, 403 returns. |

---

## 2. File-by-file fix plan (applied)

| File | Change |
|------|--------|
| `app/api/league/create/route.ts` | Set `isSurvivor` from leagueVariant/league_type; `resolvedVariant` includes `'survivor'`; after create, call `upsertSurvivorConfig(league.id, { mode, tribeCount, tribeSize })` when isSurvivor. |
| `lib/survivor/SurvivorTribalCouncilService.ts` | After removeRosterFromTribeChat, load eliminated roster’s platformUserId; call `enrollInExile(leagueId, eliminatedRosterId, platformUserId)`; call `shouldJoinJury` and `enrollJuryMember` when true. |
| `lib/survivor/SurvivorVoteEngine.ts` | getSeasonPointsFromRosterPerformance: if GuillotinePeriodScore sum is 0, resolve Roster.teamId and sum TeamPerformance.points (week ≤ throughWeek, season = current year). |
| `app/api/leagues/[leagueId]/survivor/config/route.ts` | **NEW** — GET returns config; PUT (commissioner) updates via upsertSurvivorConfig. |
| `app/api/leagues/[leagueId]/survivor/tribes/route.ts` | **NEW** — POST (commissioner) createTribes(rosterIds, formation, rosterToTribeIndex, tribeNames, seed); then bootstrapTribeChatMembers. |
| `app/api/leagues/[leagueId]/survivor/commands/route.ts` | **NEW** — POST body `{ command, councilId?, challengeId?, week? }`; parse with parseSurvivorCommand; submit vote / use idol / submit challenge; resolve vote target by team display name. |

---

## 3. Final QA checklist (verify)

- [ ] **Create Survivor Redraft league** — League type/variant survivor; draft type snake/linear/auction; league created with leagueVariant=survivor and SurvivorLeagueConfig.
- [ ] **Create Survivor BestBall league** — Same with mode bestball in config.
- [ ] **Configure draft type** — League settings support snake, linear, auction (league creation wizard / settings).
- [ ] **Configure tribe count and size** — PUT survivor/config with tribeCount, tribeSize; GET returns them.
- [ ] **Create tribes randomly** — POST survivor/tribes with formation=random; tribes created; chat members bootstrapped.
- [ ] **Create tribes manually** — POST survivor/tribes with formation=commissioner and rosterToTribeIndex.
- [ ] **Auto-name tribes** — Omitted tribeNames → Tribe 1, Tribe 2, …
- [ ] **Commissioner-name tribes** — setTribeName(leagueId, tribeId, name); or pass tribeNames in createTribes.
- [ ] **Open league chat and tribe chats** — League Chat tab opens; tribe chat entry uses source or context so only tribe members see (backend getTribeChatMemberRosterIds / tribeChatSource).
- [ ] **Seed hidden idols after draft** — assignIdolsAfterDraft(leagueId, playerRosterPairs); no API in this deliverable; commissioner or post-draft job calls it.
- [ ] **No user has more than 1 idol initially** — assignIdolsAfterDraft uses usedRosterIds; skips if roster already has one.
- [ ] **Transfer idol (trade/waiver/steal)** — transferIdol(leagueId, idolId, toRosterId, reason); wire from trade/waiver hooks.
- [ ] **Run weekly challenge** — createChallenge + submitChallengeAnswer; resolveChallenge when done.
- [ ] **Lock challenge at kickoff** — set lockAt when creating or updating challenge (scheduler/commissioner).
- [ ] **Submit tribe decision with @Chimmy** — POST survivor/commands with command e.g. "@Chimmy submit challenge [choice]" and challengeId; or confirm_minigame when implemented.
- [ ] **Assign immunity** — Immunity assignment is product-specific (challenge result or commissioner); engine supports council and tribe state.
- [ ] **Run Tribal Council** — createCouncil(leagueId, week, phase, attendingTribeId, voteDeadlineAt); closeCouncil(councilId).
- [ ] **Cast private votes with @Chimmy** — POST survivor/commands with command "@Chimmy vote [manager]" and week/councilId; submitVote(councilId, voterRosterId, targetRosterId).
- [ ] **Late vote does not count** — submitVote rejects when now > voteDeadlineAt.
- [ ] **Tie-break by lowest total season points** — tallyVotes uses SeasonPointsSource; getSeasonPointsFromRosterPerformance uses GuillotinePeriodScore then TeamPerformance.
- [ ] **Announce voted-out in league chat** — Audit event eliminated; product posts broadcast when council closes.
- [ ] **Scroll reveal event** — AI host type host_scroll; product can post narrative to chat.
- [ ] **Remove voted-out from tribe/main-island** — removeRosterFromTribeChat; roster remains in League but not in tribe chat; Exile enrollment creates roster in exile league.
- [ ] **Enroll voted-out into Exile** — closeCouncil now calls enrollInExile.
- [ ] **Exile roster claim flow** — Exile league is a normal league; use existing waiver/FAAB/claim flows.
- [ ] **Award token to exile winner** — awardTokenToTopExile(exileLeagueId, week, topRosterId); call from weekly scoring.
- [ ] **Reset tokens if Boss wins** — resetAllTokensWhenBossWins(exileLeagueId, mainLeagueId).
- [ ] **Trigger merge** — Merge is date/week-based (isMergeTriggered); council phase is merge when week ≥ mergeWeek or player count.
- [ ] **Individual immunity mode** — Post-merge councils have phase=merge; immunity logic can be added per challenge/council.
- [ ] **Add eliminated to jury at configured point** — closeCouncil now calls shouldJoinJury and enrollJuryMember.
- [ ] **Return exile at N tokens** — canReturnToIsland + executeReturn; product calls when user claims return.
- [ ] **Bestball scoring** — config.mode=bestball; tribe score and lineup logic use bestball rules where implemented.
- [ ] **Premium AI gating** — survivor/ai returns 403 when entitlement enforced and user lacks access; panel shows upgrade message on 403.
- [ ] **Tribe chat access** — Backend membership and source helpers exist; UI must filter by tribe when in tribe context.
- [ ] **Official command parsing** — parseSurvivorCommand; commands route executes vote/idol/challenge; no AI override of outcomes.
- [ ] **Idols hidden until appropriate** — Status hidden/revealed; only owner sees in getActiveIdolsForRoster; frontend shows “Your idols” only.
- [ ] **Vote secrecy** — Votes stored in SurvivorVote; no public read of individual votes; only tally on close.
- [ ] **No duplicate elimination** — One council per (configId, week); closedAt and eliminatedRosterId set once.
- [ ] **No AI-generated legal outcomes** — AI prompts forbid deciding elimination/vote/idol/immunity/return; engines are deterministic.
- [ ] **No broken monetization gating** — Entitlement check in survivor/ai; useEntitlement in panel; no dead premium button (Generate works or shows 403 message).

---

## 4. Manual testing checklist

1. Create a Survivor league (variant survivor, redraft or bestball); confirm SurvivorLeagueConfig exists and league home shows Survivor UI.
2. Set tribe count/size via PUT survivor/config; confirm GET returns values.
3. Add rosters (e.g. create teams/rosters for league); POST survivor/tribes with formation=random; confirm tribes and members; confirm tribe chat members bootstrapped.
4. Create a council (createCouncil) for week 1 with a vote deadline in the future; POST survivor/commands with command "@Chimmy vote [TeamName]" and week=1; confirm vote stored; after deadline, POST same command and confirm 400 (late vote).
5. closeCouncil(councilId); confirm eliminatedRosterId set, audit events council_closed and eliminated, exile enrollment and jury (if merge week) called.
6. Confirm tie-break: create council with two rosters tied; ensure season points source returns values (or 0); close council and confirm one eliminated by lower points.
7. Open league chat; confirm no dead buttons; open Survivor AI panel; run Generate; confirm narrative or 403 with message.
8. Mobile: open Survivor league home; switch views via dropdown; confirm layout. Desktop: switch via pills.
9. Exile: after enrollment, confirm exile league exists and roster created; award token via awardTokenToTopExile; confirm token state.

---

## 5. Automated test recommendations

- **Unit**
  - parseSurvivorCommand: vote, play_idol, challenge_pick, unknown.
  - tallyVotes: no votes, one target, tie with season points source returning distinct values; confirm eliminatedRosterId.
  - submitVote: before deadline ok; after deadline rejected; self-vote rejected when selfVoteDisallowed.
  - getSeasonPointsFromRosterPerformance: mock GuillotinePeriodScore and TeamPerformance; assert fallback when guillotine sum 0.
- **Integration**
  - League create with leagueVariant survivor → League.leagueVariant === 'survivor' and SurvivorLeagueConfig row.
  - createTribes → tribes and members exist; bootstrapTribeChatMembers → SurvivorTribeChatMember rows.
  - closeCouncil → council closedAt set, eliminatedRosterId set, enrollInExile and enrollJuryMember called when applicable.
  - POST survivor/commands (vote) → SurvivorVote row; (play_idol) → idol status used.
- **E2E (if framework exists)**
  - Create Survivor league → open league home → see Survivor header and view switcher.
  - Create tribes (via API or commissioner UI) → Tribe Board shows tribes and members.
  - Submit vote via commands API → close council → confirm voted-out in audit and exile/jury state.

---

## 6. Route summary (new/updated)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/leagues/[leagueId]/survivor/config` | Read Survivor config |
| PUT | `/api/leagues/[leagueId]/survivor/config` | Update config (commissioner) |
| POST | `/api/leagues/[leagueId]/survivor/tribes` | Create tribes + bootstrap chat (commissioner) |
| POST | `/api/leagues/[leagueId]/survivor/commands` | Process vote / play_idol / challenge_pick |

Existing: GET survivor/summary, POST survivor/ai; league create now supports survivor variant and config bootstrap.
