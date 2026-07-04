# League Analytics

The open-ended executive workbench for how the league has evolved —
trends, benchmarking, and season-over-season comparisons — distinct from
[League Health](../league-health/README.md), which explains the league's
*current* condition (score, active risks). League Analytics never
recomputes League Health's score or Recommendations Center's guidance;
it owns its own historical/aggregate view.

## Ownership

Executive KPI dashboards, league trends, participation analytics,
competitive balance metrics, scoring distributions, transaction
analytics, roster utilization, season-over-season comparisons,
visualizations, and exportable analytics views. Mission Control consumes
only `adapter.analytics.getSummary()` — a small aggregate League
Analytics computes over its own snapshot — the same "Mission Control
renders, never recomputes" pattern already established for Recommendations
and Automation Center.

## One cohesive snapshot, not eight fetches

`getSnapshot()` returns one `LeagueAnalyticsSnapshot` covering all eight
owned concerns in a single call — this is one executive dashboard page
conceptually, the same reasoning Mission Control's own `MissionControlKpis`
already applies to bundle several numbers together.

## Two shared chart primitives, reused five times

Phase 0.4's Component Library deliberately deferred a shared chart
component (see League Health's README: "Trend charting specifically was
already scoped out of the Component Library for the same reason full
charting was deferred there"). This module is where that gap finally
gets filled — two new Card System additions, both wrapping `recharts`
(already a project dependency, used elsewhere in the app) rather than
introducing a competing charting library, and both fully theme-aware via
the same `var(--...)` tokens every other Commissioner OS component uses
(existing `recharts` usages elsewhere in the app hardcode hex/rgba
colors instead):

- **`TrendLineChart`** (`components/commissioner-os/cards/TrendLineChart.tsx`)
  — multi-series time series. Used once, for League Trends (engagement +
  participation together).
- **`DistributionBarChart`** (`components/commissioner-os/cards/DistributionBarChart.tsx`)
  — single-series bars. Reused **three times** — Scoring Distribution,
  Roster Utilization, and Season-over-Season Comparison — precisely so
  those three metrics don't each get a bespoke chart component.

Competitive Balance and Transaction Analytics reuse existing primitives
instead (`InfoCard` and `Table`), since they're better suited to a
labeled-list and a two-column-per-row shape respectively than either
chart.

Each chart is wrapped in a `role="img"` container with a descriptive
`aria-label`, since Recharts' SVG output carries no accessibility
semantics of its own. A fuller accessible alternative (a hidden data
table per chart) is a known, deferred enhancement — noted here rather
than silently skipped.

## A real, working export — not a represented placeholder

Unlike Workspace's unwired next-action button, "Export CSV"
(`lib/commissioner-os/analytics/exportCsv.ts`) genuinely works: it
serializes the already-fetched snapshot to CSV and triggers a real
browser download via a Blob URL. This needed no Decision OS backend at
all — it's a pure client-side transform of data already in memory, so
"Do not implement a real Decision OS backend" never applied to it.
`buildAnalyticsCsv` is the pure, DOM-free half (directly unit-tested);
`downloadAnalyticsCsv` is the thin, impure browser-only trigger.

**Update (Reports phase):** the actual escape/row/download primitives
this file used were promoted to `lib/commissioner-os/utils/csv.ts` once
[Reports](../reports/README.md) needed the identical logic for its own
CSV export. This file's public API (`buildAnalyticsCsv`,
`downloadAnalyticsCsv`) is unchanged — it now imports `escapeCsvValue`,
`csvRow`, and `downloadTextFile` from the shared location instead of
defining them locally.

## Data

`lib/commissioner-os/analytics/decision-os-client/` — stub, demo ("Iron
Horse Dynasty," an 11-week mid-season snapshot with a four-season
2022→2025 upward trajectory consistent with League Health's own current
88–91 score), and an honest live placeholder for both methods. Consumed
exclusively through `adapter.analytics` — neither this module's page nor
Mission Control's imports `lib/commissioner-os/analytics/decision-os-client`
directly.

## Tests

`__tests__/commissioner-os-analytics.test.tsx` — client parity, live's
honest-error contract, the demo summary's internal consistency with its
own snapshot, CSV row-count and escaping correctness, chart
accessible-role/label rendering, table/list rendering, and both error
states. `__tests__/commissioner-os-adapter.test.ts` extended for the
seventh namespace and this page's import hygiene.
