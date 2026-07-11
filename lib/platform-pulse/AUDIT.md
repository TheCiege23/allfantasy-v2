# Phase 3.6 — Platform Pulse: Intelligence Source Audit

> **Audit-first deliverable.** Platform Pulse answers *"What deserves my attention right now?"*
> by aggregating the highest-value intelligence for the **current dashboard context** — it does
> not compute anything new. This inventories every real source already available, so Pulse
> **reuses in-memory data, never re-fetches, and never duplicates an engine.**

## Key finding

**Every source Pulse needs is already held in `DashboardOverview` state** (fetched once via
`/api/dashboard/today-actions`, or passed as SSR props). Pulse is therefore a **pure aggregation
function** fed from that existing state + a thin client card — **zero new network calls, zero new
backend, zero duplicate recommendation logic.**

## Inventory (all already in `DashboardOverview` memory)

| Source (in-memory) | Origin | Fields used | Pulse category |
|---|---|---|---|
| `lineupData.actions: LineupActionItem[]` | `/api/dashboard/today-actions` | `leagueId`, `leagueName`, `reasonType`, `urgency`, `severity`, `playerName`, `confidence`, `expectedGain`, `message`, `recommendedAction`, `sourceModule` | **Recommend** (start/sit, waiver, matchup, war-room) + **Monitor** (injured/questionable starters) + **Explain** (`message`) |
| `waiverChipCount` | today-actions counts | count | **Recommend** (Global) |
| `pendingTradeChipCount` (`tradeData.totalPending`) | today-actions | count | **Monitor** (Global) |
| `expiringNativeTrades` | today-actions | league, expiry | **Monitor** |
| `initialCommissionerHealthSnapshots: CommissionerLeagueHealthSnapshot[]` | SSR prop (`getCommissionerHubHealthForUser`) | `leagueId`, `leagueName`, `healthScore`, `engagementScore`, `fairnessScore`, `sustainabilityScore`, `summary` | **Monitor** (current-state — see note) |
| `upcomingDrafts` | derived from `leagues[].draftDate` | league, draftDate | **Predict** |
| `context` / `selectedLeagueId` / `leagues` | `useFantasyContext` | scope | routing |

## Context behavior (which sources feed each context)

- **Global** — cross-league: top `actions` across all leagues, the single **worst-health** league
  (only when below threshold), cross-league waiver/trade counts, imminent drafts.
- **Commissioner** — scoped to `selectedLeagueId`: that league's low health sub-scores
  (health/engagement/fairness/sustainability), plus its scoped actions (injuries, recommendations).
- **Team** — scoped to `selectedLeagueId`: that league's lineup decisions, injury watches, and
  highest-confidence AI recommendations (from scoped `actions`).

## No-duplication rule

Pulse surfaces the **single highest-value pointer** per signal and ranks across signals; it does
**not** repeat the full lists the detailed cards already show (Recommendation Timeline, Season
Outlook, Injury Impact, Commissioner HQ). It is a briefing / table-of-contents, not a second copy.
Dedupe is by a stable `dedupeKey` (e.g. `action:<league>:<reason>:<player>`,
`health:<league>:<metric>`), keeping the highest priority per key.

## Honesty constraints (carried from Phase 3.2–3.5)

- **No fabricated confidence.** `confidence` is populated only from a real `action.confidence`
  (normalized to 0–1); health/draft/count items carry none.
- **No fabricated movement.** Commissioner health is **current-state only** (no per-time store —
  see Phase 3.3 AUDIT), so health items are framed as *"needs attention"*, never *"changed"*, and
  carry **no** `trajectory`. The `trajectory?` field exists so that when a source that already has a
  real `TrajectorySummary` (e.g. Season Outlook's forecast trajectory) is lifted into memory, it
  drops in with zero item-shape change — but nothing fabricates one in v1.
- **No fabricated explanations.** `why` is the source's own real `message`, or `null`.

## Not wired in v1 (available next, same item shape)

- **Closest matchup / matchup status** and **playoff-odds trajectory** (Season Outlook's
  `TeamForecastTrajectory`) are fetched by their own cards today, not held in `DashboardOverview`.
  Lifting either into shared state later populates a Pulse item (with a real `trajectory` chip) with
  no engine change — an explicit extension seam, not a v1 gap to paper over.
