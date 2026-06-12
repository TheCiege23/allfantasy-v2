# Survivor Phase 2 — Gameplay Engine

## Overview

Phase 2 wires the existing `lib/survivor/` engine library into league-scoped REST routes and adds a canonical state aggregator. No new Prisma migration was required; all models (SurvivorIdol, SurvivorVote, SurvivorTribalCouncil, SurvivorExileLeague, SurvivorPlayer, etc.) were already present.

---

## New Files

### Engine / Aggregator

| File | Purpose |
|------|---------|
| `lib/survivor/getSurvivorLeagueState.ts` | Canonical per-user state aggregator. Returns a single typed `SurvivorLeagueState` payload: phase, week, tribes, challenge, immunity, voting, exile, own idols, own tokens, eliminations, commissioner actions, and pending automation warnings. User-gated: non-commissioners cannot see other players' hidden idols or un-revealed votes. |

### League-Scoped Routes (`app/api/leagues/[leagueId]/survivor/`)

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `state/route.ts` | GET | Member | Canonical state via `getSurvivorLeagueState` |
| `vote/route.ts` | POST | Member | Cast/update vote (requires `voterRosterId` + `targetRosterId`) |
| `votes/route.ts` | GET | Member | List votes — commissioner sees all, member sees own only pre-reveal |
| `votes/lock/route.ts` | POST | Commissioner | Lock voting on open council |
| `votes/reveal/route.ts` | POST | Commissioner | Tally votes and reveal eliminations |
| `exile/route.ts` | GET | Member | Exile island status and own exile state |
| `exile/assign/route.ts` | POST | Commissioner | Assign player to exile (`enrollInExile`) |
| `exile/complete/route.ts` | POST | Commissioner | Return player from exile (`processReturnFromExile`) |
| `idols/route.ts` | GET | Member | Own idols + revealed/played idols; commissioner sees all |
| `idols/assign/route.ts` | POST | Commissioner | Transfer/seed idol to player (`transferIdol`) |
| `idols/play/route.ts` | POST | Member (owner) | Play owned idol at tribal council (`playIdol`) |
| `idols/expire/route.ts` | POST | Commissioner | Manually expire an idol (e.g., at merge) |
| `tokens/route.ts` | GET | Member | Own token balance, total earned, recent exile tokens |
| `tokens/grant/route.ts` | POST | Commissioner | Grant tokens to a player (with audit log) |
| `tokens/spend/route.ts` | POST | Member | Spend tokens on shop items (buy_clue: 2 tokens) |
| `token-shop/route.ts` | GET | Member | Available/pending token shop catalog |

---

## Engine Delegation Map

| Route | Delegates to |
|-------|-------------|
| `vote` | `submitVote` — `lib/survivor/votingEngine` |
| `votes/lock` | `lockVoting` — `lib/survivor/votingEngine` |
| `votes/reveal` | `tallyVotes` — `lib/survivor/SurvivorVoteEngine` |
| `exile/assign` | `enrollInExile` — `lib/survivor/SurvivorExileEngine` |
| `exile/complete` | `processReturnFromExile` — `lib/survivor/SurvivorExileEngine` |
| `idols/assign` | `transferIdol` — `lib/survivor/idolEngine` |
| `idols/play` | `playIdol` — `lib/survivor/idolEngine` |

Rocks tiebreaker is handled inside `SurvivorVoteEngine.tallyVotes` → `rocksEngine.executeRocksDraw` (seeded deterministic).

---

## Token Economics

In-game tokens only — no real-money mechanics.

| Action | Cost | Status |
|--------|------|--------|
| `buy_clue` | 2 tokens | Available |
| `buy_vote_steal` | TBD | Phase 3 / pending |
| `buy_waiver_priority_boost` | TBD | Phase 3 / pending |
| `buy_protection` | TBD | Phase 3 / pending |
| `buy_extra_vote` | TBD | Phase 3 / pending |

Spending a pending advantage returns HTTP 422 with `{ error, pending: true }`. No tokens are deducted.

---

## Security / Access Control

- All routes use `getServerSession(authOptions as never)` + `assertLeagueMember` or `assertLeagueCommissioner`.
- Commissioner-only routes (`lock`, `reveal`, `assign`, `grant`, `expire`) return 403 for non-commissioners.
- Votes are `hidden_until_reveal`; non-commissioners only see own vote pre-reveal.
- Own idols always visible; other players' idols hidden unless revealed/played/expired.

---

## Automation Status

All survivor automation remains **pending** (unchanged from Phase 1 defaults). Commissioners must manually:
- Open and finalize weekly challenges
- Lock and reveal tribal council votes
- Assign and complete exile island stints
- Trigger rocks tiebreakers when tallying produces a tie

`getSurvivorLeagueState` surfaces `pendingAutomationWarnings[]` to remind the commissioner.

---

## Known Phase 3 Gaps

- Pending token advantages (vote steal, waiver boost, protection, extra vote)
- Automated challenge resolution (score-based immunity)
- Automated exile assignment (weekly rotation)
- Automated rocks tiebreaker trigger (no manual step)
- Jury management UI / final vote
- Merge trigger automation (auto-merge at configurable cast threshold)
- `tallyVotes` currently requires `getSeasonPointsForRoster` callback — Phase 3 should wire this to the live scoring engine

---

## Tests

`__tests__/survivor-phase2-engines.test.ts` — smoke tests covering:
- `rocksEngine` determinism (`seededRandom` same-seed identity, cross-seed difference)
- Token shop module load
- `getSurvivorLeagueState` function export
- `votingEngine` / `idolEngine` / `SurvivorExileEngine` function exports
- Import smoke test for all 16 new route files
