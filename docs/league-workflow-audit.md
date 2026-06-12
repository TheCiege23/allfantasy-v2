# NFL/NCAAF League Workflow Audit

**Date:** 2026-06-12  
**Scope:** NFL Redraft + NCAAF leagues only — workflow and league mechanics  
**Out of scope:** fantasy-data imports, provider ingestion, API provider chains, Chimmy grounding, AI routes, sports data evidence, NFL/NCAAF import services, weather/news/ADP/projection services (under separate agent)

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Working | Route/service exists, wired end-to-end, no obvious gaps |
| ⚠️ Partial | Core exists but missing a key piece (a step, a route, a UI hook) |
| ❌ Missing | No implementation found |
| 🪤 Placeholder | Stub function that does nothing / returns early |
| 💥 Broken | Exists but points to wrong endpoint or produces wrong output |

---

## 1. League Creation Workflow

| Step | Status | Notes |
|------|--------|-------|
| Commissioner fills creation wizard | ✅ Working | `app/api/league/create/route.ts` (1384 lines) — full Zod validation, sport/roster/scoring defaults applied |
| `executeCanonicalLeagueCreation` called | ✅ Working | `lib/league-creation/canonical/` — creates League, RedraftSeason, RedraftRoster records |
| Commissioner assigned to league | ✅ Working | `assertCommissioner` + commissioner record created at creation time |
| NCAAF beta guard applied | ✅ Working | `NCAAFBetaGuard` in `app/league/[leagueId]/` segment — shows locked state for non-beta users |
| Default settings applied (scoring, roster, waiver) | ✅ Working | `lib/sportConfig` + `getScheduleDefaults`, `getScoringCategories` — all defaults resolved from central registry |
| Sleeper import path at creation | ✅ Working | Import mapping architecture present (`PROMPT_22`, `PROMPT_24`) |
| Invite link generated after creation | ✅ Working | `app/api/commissioner/leagues/[leagueId]/invite/route.ts` |

**Summary:** League creation is the most complete workflow. No blocking gaps.

---

## 2. Roster Management Workflow

| Step | Status | Notes |
|------|--------|-------|
| Roster GET (own team) | ✅ Working | `app/api/league/roster/route.ts` — handles Sleeper-imported + manual DB rosters |
| Lineup lock enforcement | ✅ Working | Route checks game start time before allowing lineup edits |
| Roster templates per sport | ✅ Working | `lib/sportConfig` drives roster positions; templates defined per sport |
| Starting lineup set/update | ✅ Working | `app/api/commissioner/leagues/[leagueId]/lineup/route.ts` |
| Player pool display (empty state) | ✅ Working | `PlayerPoolEmptyState` component present for pre-draft phase |
| Roster tab UI (TeamTab) | ✅ Working | `LeagueTabRouter` maps `roster`/`team`/`squad` → `TeamTab` |
| IDP roster positions | ✅ Working | `enableIDP` toggle in sportConfig; `togglesFromSportConfig` reads it |
| Superflex / TE Premium | ✅ Working | Toggle-based; `applyScoringPresetToRecPoints` handles TE Premium |

**Summary:** Roster management is solid. No blocking gaps.

---

## 3. Transactions Workflow

### 3a. Waiver Wire

| Step | Status | Notes |
|------|--------|-------|
| Waiver claim submission | ✅ Working | `lib/waiver-wire/claim-service.ts` — full validation pipeline |
| Waiver type support (guillotine, survivor, FAAB) | ✅ Working | All three types validated in claim-service |
| Claim limit enforcement | ✅ Working | Per-league claim limit checks present |
| Waiver processing job | ✅ Working | `lib/waiver-wire/process-engine.ts` → `processWaiverClaimsForLeague` |
| Commissioner waiver override | ✅ Working | `app/api/commissioner/leagues/[leagueId]/waiver-claims/[claimId]/route.ts` |
| Waiver tab UI | ✅ Working | `SportAwareWaiverWire` → `WaiverWirePage`; mapped in `LeagueTabRouter` |
| AI waiver recommendations (AF Pro) | ✅ Working | `AIWaiverRecommendationsPanel` with `AF_PRO_REQUIRED` gate |

### 3b. In-Season Trades

| Step | Status | Notes |
|------|--------|-------|
| Trade proposal (legacy `RedraftLeagueTrade`) | ⚠️ Partial | `POST /api/redraft/trades` creates the record; flagged `legacy: true` with migration path noted |
| Trade proposal (new `RedraftTradeProposal`) | ✅ Working | `POST /api/redraft/trade-proposals` — canonical system with assets + votes + decision |
| Trade accept | ✅ Working | `POST /api/leagues/[leagueId]/trades/[tradeId]/accept` → `acceptAfLeagueTrade` |
| Trade veto (commissioner) | ⚠️ Partial | `lib/redraft/tradeEngine.ts` → `checkTradeVeto` reads `vetoCount`/`vetoThreshold`; no dedicated API route to submit a commissioner veto |
| Trade vote (league vote mode) | ✅ Working | `POST /api/redraft/trade-votes` route present |
| IDP cap validation on trade | ✅ Working | `validateRedraftTradeCap` + `applyRedraftTradeCapTransfers` in `lib/idp/capEngine` |
| Collusion scan on trade | ✅ Working | `enqueueCollusionScan` called after trade accept |
| **Two parallel trade systems** | ⚠️ Partial | `RedraftLeagueTrade` (legacy) and `RedraftTradeProposal` (new) coexist. Migration phase is `"coexist"`. UI must consistently use one or the other — confirm which system the frontend renders for in-season trades |

### 3c. Free Agent Claims (non-waiver)

| Step | Status | Notes |
|------|--------|-------|
| Instant free agent add | ❌ Missing | No `POST /api/league/roster/add` or equivalent instant-add route found; waiver is the only path |

**Summary:** Waivers are complete. Trades have two parallel systems that need to converge. Commissioner veto needs a POST route. No instant free agent add route exists.

---

## 4. Draft Workflow

| Step | Status | Notes |
|------|--------|-------|
| Draft settings (commissioner) | ✅ Working | `app/api/commissioner/leagues/[leagueId]/draft/route.ts` |
| Draft start (commissioner) | ✅ Working | `app/api/draft/[draftId]/start/route.ts` |
| Live draft pick submission | ✅ Working | `lib/draft/execute-pick.ts` → `submitPick` in `PickSubmissionService`; full validation |
| Draft order / snake/auction | ✅ Working | Draft variant settings hub (`PROMPT188`, `PROMPT189`) |
| Rookie draft order | ✅ Working | `app/api/commissioner/leagues/[leagueId]/rookie-draft-order/route.ts` |
| Draft pick trades | ✅ Working | `app/api/leagues/[leagueId]/draft/trade-proposals/[proposalId]/route.ts` — accept/reject |
| Post-draft roster population | ✅ Working | Picks create roster entries in `RedraftRoster` |
| CPU / AI drafter (orphan) | ✅ Working | `PROMPT194`, `OrphanAiManager`; commissioner assigns AI via `/managers/assign-ai/route.ts` |
| NCAAF draft (beta) | ✅ Working | Same engine; sport gated by NCAAF beta guard |

**Summary:** Draft is the most complete workflow alongside league creation. No blocking gaps.

---

## 5. Schedule / Matchup Workflow

| Step | Status | Notes |
|------|--------|-------|
| Schedule generation | ✅ Working | `lib/redraft/scheduleEngine.ts` → `generateSchedule` — round-robin with bye support, median game option |
| Schedule seeded at creation | ✅ Working | `executeCanonicalLeaggeCreation` triggers schedule generation |
| Commissioner reschedule | ✅ Working | `app/api/commissioner/leagues/[leagueId]/schedule/route.ts` |
| Matchup display (MatchupView) | ⚠️ Partial | `MatchupView.tsx` shows "cached scoring" label — implies scores displayed from a snapshot, not live-calculated on render |
| Real-time score updates | ⚠️ Partial | `calculateOfficialTeamScore` in `scoringEngine.ts` exists but no WebSocket or polling route found that pushes live scoring to the matchup view; scoring appears to be a batch job result |
| Median game support | ✅ Working | `generateSchedule` emits synthetic `type: "median"` rows when `medianGame: true` |
| NFL schedule API | ✅ Working | `app/api/commissioner/leagues/[leagueId]/nfl-schedule/route.ts` |
| NCAAF schedule API | ✅ Working | `app/api/commissioner/leagues/[leagueId]/ncaaf-schedule/route.ts` |

**Summary:** Schedule generation and matchup display work. Live scoring is batch-based, not real-time; the UI already acknowledges this with the "cached scoring" label. Not a blocker for launch.

---

## 6. Scoring Workflow

| Step | Status | Notes |
|------|--------|-------|
| `calculateFantasyPoints` | ✅ Working | `lib/redraft/scoringEngine.ts` — per-category multiplication, bonus yards, per-yard/per-inning support |
| PPR / Half-PPR / Standard presets | ✅ Working | `applyScoringPresetToRecPoints` maps preset to `rec` point value |
| IDP scoring | ✅ Working | `leagueUsesDevyEngine` / `leagueUsesC2CEngine` dispatch |
| Scoring overrides (commissioner) | ✅ Working | `app/api/commissioner/leagues/[leagueId]/scoring/route.ts`; `nfl-scoring/route.ts`; `ncaaf-scoring/route.ts` |
| Devy engine | ✅ Working | `calculateOfficialTeamScore` routes to devy when toggled |
| C2C scoring | ✅ Working | `updateC2CMatchupScores` called when C2C enabled |

**Summary:** Scoring is complete and extensible. No gaps.

---

## 7. Standings Workflow

| Step | Status | Notes |
|------|--------|-------|
| Standings engine | ✅ Working | `lib/redraft/standingsEngine.ts` — calculates W/L, points for/against, tiebreakers |
| Standings API route | 💥 Broken | `app/api/app/leagues/[leagueId]/standings/route.ts` proxies to `/api/bracket/leagues/{id}/standings` — **this is the bracket pool standings endpoint (NBA/NHL/FIFA), not NFL fantasy league standings** |
| Commissioner standings view | ✅ Working | `StandingsView.tsx` has `generatePlayoffs` trigger |
| Division standings | ✅ Working | `listDivisionsByLeague` with `.catch(() => [])` fallback |

**Summary:** **The standings API endpoint is broken** — it proxies to the wrong system. The `standingsEngine.ts` computes correct data but no API route exposes it. This must be fixed before launch.

**Fix needed:** Create `GET /api/leagues/[leagueId]/standings` that calls `standingsEngine` instead of the bracket proxy.

---

## 8. Playoffs Workflow

| Step | Status | Notes |
|------|--------|-------|
| Playoff defaults (team count, start week, rounds, byes) | ✅ Working | `lib/redraft/playoffEngine.ts` → `getPlayoffDefaults` reads from `tryGetSportConfig` |
| Bracket generation | ✅ Working | `generatePlayoffBracket` seeds by record + points-for; upper bracket matchups created |
| Commissioner playoff settings | ✅ Working | `app/api/commissioner/leagues/[leagueId]/playoff-settings/route.ts` |
| Commissioner generate playoffs | ✅ Working | `app/api/commissioner/leagues/[leagueId]/playoffs/route.ts` |
| Bracket display | ✅ Working | `StandingsView.tsx` with `generatePlayoffs` |
| **Advance bracket winners** | 🪤 Placeholder | `advancePlayoffWinners(_seasonId, _week)` in `playoffEngine.ts` is a stub — comment reads "Placeholder: advance bracket JSON in RedraftPlayoffBracket.structure" — **does nothing** |
| Consolation bracket / toilet bowl | ⚠️ Partial | `generatePlayoffBracket` accepts `hasLowerBracket` / `lowerBracketType` params but lower bracket logic is not implemented |
| Champion crowned | ❌ Missing | No route or logic to finalize a champion after final playoff round |
| Season close-out | ❌ Missing | No `season.status = 'complete'` transition or final standings snapshot |

**Summary:** Bracket seeding and display work. **Advancing winners round-by-round is a placeholder stub** — the most critical gap in the playoff workflow. Season close-out (crowning champion, archiving season) is also missing.

---

## 9. Commissioner Tools

| Tool | Status | Notes |
|------|--------|-------|
| League settings PATCH | ✅ Working | `app/api/commissioner/leagues/[leagueId]/route.ts` — name, scoring, status, settings |
| Roster settings | ✅ Working | `/roster-settings/route.ts` + compare-template + reset-default |
| Scoring settings | ✅ Working | Sport-specific scoring routes for NFL, NCAAF, MLB, NBA, NHL, Soccer |
| Schedule management | ✅ Working | `/schedule/route.ts` |
| Playoff settings | ✅ Working | `/playoff-settings/route.ts` |
| Invite management | ✅ Working | `/invite/route.ts` + `/invite/send/route.ts` |
| Manager management | ✅ Working | `/managers/route.ts` + `/managers/assign-ai/route.ts` |
| Waiver override | ✅ Working | `/waiver-claims/[claimId]/route.ts` + `/waivers/route.ts` |
| Division settings | ✅ Working | `/division-settings/route.ts` + `/division-settings/ai-name/route.ts` |
| Orphan adoption | ✅ Working | `/orphan-adoptions/route.ts` |
| AI opponents | ✅ Working | `/ai-opponents/route.ts` + `/ai-opponents/assignments/route.ts` |
| Commissioner broadcast | ✅ Working | `app/api/commissioner/broadcast/route.ts` |
| League transfer (commissioner handoff) | ✅ Working | `/transfer/route.ts` |
| League reset | ✅ Working | `/reset/route.ts` |
| League renewal | ✅ Working | `/renew/route.ts` |
| IDP audit / scoring overrides | ✅ Working | Full IDP suite: audit, apply-scoring-preset, preview-roster-impact, regenerate-best-ball, rerun-projections, rerun-rankings, scoring-overrides, trade-warnings, waiver-logs |
| Commissioner veto (trade) | ⚠️ Partial | Logic in `checkTradeVeto`; no dedicated POST route for commissioner to submit veto |

**Summary:** Commissioner tooling is exceptionally complete. Only trade veto route is missing.

---

## 10. User Journey Test

End-to-end happy path: can a user complete the full lifecycle?

| Step | Possible? | Blocker |
|------|-----------|---------|
| Create league | ✅ Yes | — |
| Invite friends | ✅ Yes | — |
| Friends claim teams | ✅ Yes | — |
| Hold draft | ✅ Yes | — |
| View roster | ✅ Yes | — |
| Set lineup | ✅ Yes | — |
| Submit waiver claim | ✅ Yes | — |
| Propose trade | ⚠️ Partial | Two systems coexist; frontend must consistently hit the right one |
| Accept trade | ✅ Yes | — |
| View matchup | ✅ Yes | — |
| View standings | 💥 No | Standings API proxies to wrong endpoint |
| Reach playoffs | ✅ Yes | Bracket generated correctly |
| Advance through playoff rounds | 🪤 No | `advancePlayoffWinners` is a placeholder |
| Crown champion | ❌ No | Not implemented |

---

## Priority Roadmap

### Phase 1 — Must-have before public launch

These gaps prevent users from completing the core fantasy football experience.

1. **Fix standings API** (`app/api/app/leagues/[leagueId]/standings/route.ts`)  
   Replace bracket proxy with `standingsEngine` call. Without this, standings tab shows wrong data or errors for all NFL/NCAAF leagues.

2. **Implement `advancePlayoffWinners`** (`lib/redraft/playoffEngine.ts`)  
   The stub must be replaced with logic that reads week scores, determines matchup winners, and advances them in `RedraftPlayoffBracket.structure`. Without this, playoffs stall after week 1.

3. **Season close-out** — champion crowning + `season.status = 'complete'`  
   A finalized season is the literal end of the user journey. Needs a route and a commissioner-triggered or auto-triggered completion flow.

4. **Consolidate trade systems** — pick one: `RedraftLeagueTrade` (legacy) or `RedraftTradeProposal` (new)  
   The legacy system is self-labeled for migration. The new system has the full asset/vote/decision model. Frontend should consistently use `RedraftTradeProposal`; the legacy `POST /api/redraft/trades` route should be retired or redirected.

5. **Commissioner trade veto route**  
   `POST /api/commissioner/leagues/[leagueId]/trades/[tradeId]/veto` calling `checkTradeVeto` + updating status. Currently the logic exists but has no HTTP surface.

---

### Phase 2 — Needed for paid subscribers

These are expected features for leagues with entry fees or premium access.

6. **Real-time live scoring**  
   Replace "cached scoring" with a polling or WebSocket-based score update. The `calculateOfficialTeamScore` function already does the math; missing is the delivery mechanism to the `MatchupView`.

7. **Instant free agent add route**  
   `POST /api/league/roster/add` for leagues without a waiver period. Currently there's no way to add a player outside of waiver claims.

8. **Consolation bracket / toilet bowl**  
   `generatePlayoffBracket` accepts the params but doesn't implement lower bracket logic.

9. **Trade reject route**  
   There's an accept route but no explicit reject route for `RedraftTradeProposal`. Proposals expire, but a manager should be able to explicitly reject.

---

### Phase 3 — Advanced commissioner features

These are quality-of-life or advanced features for experienced leagues.

10. **Mid-season schedule edit** — commissioner reschedule beyond defaults (swap matchups, add weeks)
11. **Historical season archive** — view prior seasons' rosters, scores, and standings
12. **Rookie draft order tie-breaking** — automated worst-to-first reverse standings seeding for dynasty/keeper leagues
13. **Median game scoring** — `generateSchedule` emits median rows but no UI displays or resolves median game wins
14. **Salary cap trade audit trail** — IDP cap transfer logs accessible to managers (not just commissioner)

---

## File Map for Phase 1 Fixes

| Fix | File(s) |
|-----|---------|
| Standings API | `app/api/app/leagues/[leagueId]/standings/route.ts` — replace proxy body |
| `advancePlayoffWinners` | `lib/redraft/playoffEngine.ts` — implement stub |
| Season close-out | New route `app/api/commissioner/leagues/[leagueId]/close-season/route.ts` |
| Trade system convergence | Retire `app/api/redraft/trades/route.ts` POST; frontend points to `/api/redraft/trade-proposals` |
| Commissioner veto route | New route `app/api/commissioner/leagues/[leagueId]/trades/[tradeId]/veto/route.ts` |
