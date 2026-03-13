# QA Summary – What’s Working vs Future Work

## Fully working (after this pass)

### Waiver Wire

- **Claim submission** – Members and owner can submit claims (add, optional drop, FAAB, priority).
- **Claim priority ordering** – FAAB (bid desc, then priorityOrder), rolling (waiverPriority), reverse_standings (LeagueTeam currentRank), FCFS (createdAt), standard (priorityOrder).
- **FAAB processing** – Bid validation, faabRemaining decrement on success.
- **Rolling waiver updates** – waiverPriority incremented for winning roster when waiverType is rolling.
- **Reverse standings mode** – Uses LeagueTeam.currentRank; link by externalId = roster.platformUserId.
- **Drop handling** – Roster full + no drop fails; drop not on roster fails; valid drop applied.
- **Cancel/edit before processing** – DELETE and PATCH on pending claims; owner or roster member can access claims/settings/players.
- **Processed history** – Processed claims and waiver_transactions returned for history tab.
- **Commissioner manual run** – Commissioner can trigger process from Commissioner tab.

### Mock Draft & AI Assistant

- **Setup** – Sport, league type, draft type, teams, scoring, timer, rounds, AI on/off; optional league; Start mock.
- **AI toggle** – Config.aiEnabled controls AI panel visibility.
- **Simulated picks** – Full draft simulation; live playback and step; recap on complete.
- **Recap** – Full board, team summary, grades, your roster, AI recap placeholder; Back to draft.
- **Restart** – Reset and run again; recap → Back → simulate again.
- **AI panel** – Suggestion, explanation, compare options, positional run, roster warnings; null params when no draft to avoid bad request.

### Commissioner Center

- **Commissioner-only access** – Tab and routes gated by isCommissioner (league owner).
- **League settings edits** – PATCH name, description, settings keys.
- **Draft controls API** – POST returns acknowledged; platform not wired.
- **Waiver view/run** – Pending, history, settings, manual process.
- **Invite** – Get/regenerate; stored in league.settings.
- **Operations** – post_to_dashboard, set_orphan_seeking, set_ranked_visibility, update_orphan_difficulty.
- **403 handling** – UI shows “Commissioner access denied” when API returns 403.
- **Non-commissioners** – No tab; commissioner routes return 403.

### Multi-Sport

- **Waiver engine** – No football-only logic; process and roster-utils are sport-agnostic.
- **Players API** – Uses league.sport and SportsPlayer; access control by owner or roster.

---

## Future / not in scope

- **League chat/activity after claim** – No hook from waiver process to league chat or activity feed.
- **Live draft room (platform)** – No Sleeper/ESPN live draft room; only mock simulator and draft tab (queue + AI). Commissioner draft controls are stubs.
- **Commissioner draft pause/resume/undo** – API accepts actions and returns “acknowledged”; platform integration (e.g. Sleeper) needed for real effect.
- **Force-correct roster** – Commissioner lineup endpoint returns 501 for force_correct.
- **Remove manager** – Commissioner managers DELETE returns 501; use platform.
- **Transfer commissioner** – Not implemented.
- **Broadcast/pin** – Commissioner chat broadcast/pin acknowledged; league chat channel linking and @everyone delivery not implemented.
- **NBA/MLB mock draft** – ADP and simulate are NFL-oriented; other sports need sport-specific ADP and player pools.
- **Duplicate claim prevention** – Same user can submit multiple claims for same addPlayerId; process engine awards one and fails others when player is taken. Optional: UI or API rule to prevent duplicate add targets.

---

## File list (all [UPDATED] this pass)

| Path | Label |
|------|--------|
| `docs/qa-fantasy-core-findings.md` | [NEW] |
| `docs/qa-fantasy-core-final-checklist.md` | [NEW] |
| `docs/qa-fantasy-core-summary.md` | [NEW] |
| `components/waiver-wire/WaiverWirePage.tsx` | [UPDATED] |
| `app/api/waiver-wire/leagues/[leagueId]/claims/route.ts` | [UPDATED] |
| `app/api/waiver-wire/leagues/[leagueId]/settings/route.ts` | [UPDATED] |
| `app/api/waiver-wire/leagues/[leagueId]/players/route.ts` | [UPDATED] |
| `lib/waiver-wire/process-engine.ts` | [UPDATED] |
| `components/app/tabs/CommissionerTab.tsx` | [UPDATED] |
| `components/MockDraftSimulatorClient.tsx` | [UPDATED] |
