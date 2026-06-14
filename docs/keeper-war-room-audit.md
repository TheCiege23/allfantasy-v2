# Keeper AF War Room — Audit & Data-Path Decision

_Audited 2026-06-14 against live Neon. Keeper is its OWN format — not redraft, not dynasty.
Single-season horizon, but keep/cut decisions weigh DRAFT-CAPITAL cost (round penalty or
auction price). No fabrication of keeper costs, rounds, values, stats, injuries, or picks._

## Existing keeper infrastructure

| Area | Status | Notes |
| --- | --- | --- |
| Keeper defaults | **complete** | `lib/league-concepts/keeperDefaults.ts` — full `KeeperPolicySettings` (maxKeepers, maxYears, costSystem `round_based`/`auction_value`, roundPenalty, auctionPctIncrease, deadline, maxKeepersPerPosition), roster template, scoring, `buildKeeperSettingsSnapshot` / `normalizeKeeperSettingsSnapshot`. **Future picks explicitly DISABLED** for keeper. |
| League creation / settings | **complete** | `lib/keeper/mapKeeperCreationFromWizard.ts`; `League` keeper columns (`keeperCount`, `keeperCostSystem`, `keeperRoundPenalty`, `keeperInflationRate`, `keeperAuctionPctIncrease`, `keeperMaxYears`, `keeperWaiverAllowed`, `keeperSelectionDeadline`, `keeperEligibilityRule`, `keeperPhaseActive`). |
| Keeper data models | **complete (migrated, empty)** | `KeeperEligibility` (projectedCostRound/Auction, isEligible, yearsKept), `KeeperRecord` (originalDraftRound, costRound, costAuctionValue, status), `KeeperSelectionSession`, `KeeperPickAdjustment`, `KeeperAuditLog` — all tied to `RedraftSeason`/`RedraftRoster`. Legacy `KeeperDeclaration` (→ legacy `Roster`) also exists. **All tables present in DB; 0 rows (no keeper leagues yet).** |
| Roster source | **complete** | Keeper leagues use the **redraft-season** layer: `RedraftSeason` + `RedraftRoster` + `RedraftRosterPlayer` (`isKept` flag) + `RedraftMatchup` — same engine as the redraft War Room. |
| Eligibility / cost engine | **partial** | `lib/keeper/eligibilityEngine.ts` computes `KeeperEligibility` from League cost rules; has placeholder `originalRound`/`yearsKept`. `selectionEngine`, `carryoverEngine`, `draftIntegration`, `offseasonEngine` handle the selection workflow. |
| Keeper AI decision | **stub** | `lib/keeper/ai/keeperDecisionEngine.ts` `generateKeeperRecommendations` returns placeholder (surplus 0, "wire OpenAI + projections"). |
| Keeper selection routes | **complete (different concern)** | `/api/keeper/context`, `/api/keeper/session`, `/api/keeper/selections`, `/api/keeper/commissioner/records` — the declaration/selection WORKFLOW, not an intelligence War Room. |
| Player value / ADP | **available** | redraft ADP (`AllFantasyAdpSnapshot` leagueType=`redraft`: NFL 372, NCAAF 141 rows). No keeper-specific ADP (correct — keeper value = single-season redraft value). ADP-implied round = `ceil(adp / teamCount)`. |
| Player age | **available** | `SportsPlayer.age`. |
| Injuries / news | **available** | `InjuryReportRecord` / `PlayerNewsRecord` — reuse `fetchRedraftInjuryNews`. |
| Weekly scores / projections | **available (season active)** | `fantasy_projections` / `player_weekly_scores` — reuse the redraft path; only matters when the keeper league's season is active. |
| Free-agent pool | **available** | redraft ADP minus rostered — reuse `fetchRedraftFreeAgentPool`. |
| Trade analyzer | **partial** | generic trade routes exist; no keeper-cost-aware analysis. |
| Chimmy / global AI | **missing** | no keeper grounding adapter in `app/api/chat/chimmy/route.ts`. |
| Frontend War Room panel | **missing** | `WarRoomTab` mounts redraft + dynasty panels; no keeper panel. |
| Entitlement / gating | **complete** | same `war_room_draft_strategy` / AF War Room gate as redraft/dynasty. |
| Keeper War Room (intelligence layer) | **missing** | no `lib/keeper-war-room`, no context/engines/prompt/routes/panel. |

## Step 3 — data-path decision (native keeper)

| Concern | Authoritative source |
| --- | --- |
| Roster | **`RedraftSeason` + `RedraftRoster` + `RedraftRosterPlayer`** (most recent season for the league). `isKept` marks declared keepers. |
| Standings / schedule | `RedraftRoster` record fields + `RedraftMatchup`. |
| Keeper settings | `League` keeper columns + `settings.keeperPolicy` / `normalizeKeeperSettingsSnapshot`. |
| Keeper eligibility | `KeeperEligibility` (real, when computed) — `isEligible`, `ineligibleReason`, `yearsKept`. |
| **Keeper cost** | `KeeperEligibility.projectedCostRound` / `projectedCostAuction` / `projectedCost` (primary) → else `KeeperRecord.costRound` / `costAuctionValue` → **else MISSING/limited (never fabricated)**. Cost SYSTEM (`round_based` / `auction_value` / `inflation` / `free`) + `roundPenalty` / `auctionPctIncrease` come from `League`. |
| Player value | redraft ADP (`AllFantasyAdpSnapshot` leagueType=`redraft`), sport-isolated; ADP-implied round = `ceil(adp / teamCount)`. |
| **Keeper value surplus** | `adpImpliedRound − keeperCostRound` (round_based) or `adpImpliedValue − keeperAuctionCost` (auction). Positive = good keeper. The keeper-specific signal. |
| Age | `SportsPlayer.age` (context only; not a core keeper signal). |
| Injuries / news | `fetchRedraftInjuryNews` (real, by name). |
| Projections / stats | `fantasyProjection` + `playerWeeklyScore` (only when season active). |
| Free agents | `fetchRedraftFreeAgentPool` (redraft ADP minus rostered). |
| Draft picks / rounds | keeper draft is **round-based** (no future picks). "Draft impact" = which rounds are consumed by kept players (cost rounds) and what remains for the live draft. **No dynasty future-pick logic** (`future_picks` is disabled for keeper). |
| Global Chimmy context | new Keeper War Room context/engines/prompt. |

**Decision:** Build a **native** Keeper War Room (`lib/keeper-war-room`) that consumes the
**redraft-season roster layer** + **KeeperEligibility/KeeperRecord costs** + **redraft ADP**,
and adds keeper-specific engines (value surplus, keep/cut, draft plan after keepers). It
reuses redraft provider helpers (free-agent pool, injury/news, ADP, projections) but is its
own format: keeper COST vs VALUE surplus drives every recommendation. Never use dynasty
future-pick capital. Never use redraft logic that ignores keeper cost.

## Classification summary
- **complete:** keeper defaults/settings, League columns, all keeper tables (migrated),
  redraft-season roster layer, ADP/ages/injuries/news/free-agent providers, entitlement.
- **available (wire it):** redraft ADP value, eligibility/cost from `KeeperEligibility`.
- **stub/partial:** keeper AI decision engine, keeper-cost-aware trade analysis.
- **missing/to build:** Keeper War Room context, engines, prompt, consolidated routes,
  global-Chimmy grounding, frontend panel, runtime seed + E2E.
- **honest gaps:** when no `KeeperEligibility`/`KeeperRecord` cost rows exist, keeper cost is
  `missing` → value-surplus/keep-cut degrade to a limited-data state (never fabricated).

## Build plan (mirrors redraft/dynasty)
`lib/keeper-war-room/{types,keeperWarRoomContext,keeperValue,keeperWarRoomPrompt,keeperChimmyGrounding}`
+ engines (`value, recommendation, rosterNeeds, cutList, draftPlan, trade, tradeFinder, waiver, lineup`)
→ `GET /api/leagues/[leagueId]/keeper-war-room` + `POST .../[action]` → `KeeperWarRoomPanel`
in `WarRoomTab` → seed + `e2e/keeper-war-room-runtime.spec.ts`.
