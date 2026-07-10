# Executive Visualization Engine — Phase V2.0

**Branch:** `g15-event-foundation` · **Scope:** Fantasy OS B2B/licensing product only (commissioners, league
operators, platforms, media/tech partners, enterprise, white-label, internal admins). No Legacy/B2C
career, identity, social, trophy, XP, Hall of Fame, or gamification features were introduced.

This phase builds the first shared **Executive Visualization Engine** — a small, reusable visual
foundation (not a chart library) — and uses it to deliver the first Commissioner OS flagship
visualization, the **League Health Map**.

---

## Step 1 — Data + dependency audit (before any implementation)

**Charting / motion libraries already installed:** `recharts@3.7.0` (used only in admin AI + rankings +
history surfaces) and `framer-motion@12.34.2`. No new dependency was added.

**Existing visual foundation reused:** `components/decision-os/DecisionOsCardPrimitives.tsx` (Visual OS
V1.0–V1.3 tone systems — `decisionOsToneClasses`, `decisionOsSeverityToneClasses`,
`decisionOsHealthStatusToneClasses`), the app's semantic status tokens (`--color-success/warning/danger/info`
exposed as Tailwind `status-*`), the `.focus-ring` primitive, and `formatDecisionOsUpdated`.

**Real Commissioner OS data traced** (all already provider-agnostic, from
`CommissionerLeagueHealthSnapshot` in `lib/commissioner-hub/commissionerHubHealth.ts`, computed by
`monitorLeagueHealth()`):

| Data | Nature | Used as dimension |
| --- | --- | --- |
| `healthScore` / `overallStatus` (5-tier) | current snapshot, ordinal | Overall league health |
| `activeManagers` / `teamCount` / `inactiveTeams` | current snapshot | Manager activity |
| `lineupSubmissionRate` / `missedLineups` | current snapshot | Lineup readiness |
| `fairnessScore` | current snapshot | Competitive balance |
| `engagementScore` | current snapshot | Engagement |
| `pendingWaiverClaims` + `pendingTrades` + `openAiAlerts` + `commissionerActions` | current snapshot, count | Unresolved actions |
| `sustainabilityScore` | current snapshot | Season sustainability |
| `projectionCoveragePct` / `dataConfidence` | current snapshot | Data readiness |
| `healthTrend` | **frequently unavailable** (`{ available: false, reason: 'no_snapshots' }`) | *(not visualized)* |

**Decision from the audit:** the data is a **current snapshot** across categorical/ordinal dimensions,
with no legitimate per-dimension history (trend is usually unavailable). So the flagship is a **ranked,
segmented status map**, NOT a time series — and the engine deliberately ships **no sparkline** in this
phase (a sparkline would imply a history the data does not have).

---

## Step 2–3 — The Executive Visualization Engine foundation + tokens

New directory `components/executive-viz/`:

- **`executiveVizTokens.ts`** — the shared design-token/config layer: status surfaces, bar/dot colors,
  plain-language status labels, legend entries, chart typography, and motion tokens. All status colors
  route through the Visual OS `status-*` semantic tokens (no raw Tailwind hue, no hex), so light/dark and
  future white-label re-themes are automatic. `unavailable` is a first-class, non-alarming status.
- **`ExecutiveVisualizationShell.tsx`** — foundation primitives, composed by every executive chart:
  `ExecutiveVisualizationShell` (container: title/description/meta + a screen-reader-first accessible
  summary + body + footer), `ExecutiveChartHeader`, `ExecutiveFreshnessStamp`, `ExecutiveLegend`,
  `ExecutiveLoadingState`, `ExecutiveEmptyState`, `ExecutiveUnavailableState`, `ExecutiveErrorState`.

Deliberately **not** built this phase (per "stable foundation, not maximum component count"): Sankey,
network, treemap, radar, bubble, gauge, and — importantly — `ExecutiveSparkline`, which is deferred until
a surface has genuine time-series data.

---

## Step 4 — The Commissioner OS signature visualization: League Health Map

`components/executive-viz/LeagueHealthMap.tsx` answers one question: **"Which areas of this league need
the commissioner's attention right now?"**

- A **ranked, segmented status map**: each row is one provider-agnostic health dimension drawn as a
  horizontal readiness bar (higher = healthier, one consistent direction), colored by status, ranked
  **worst-first** so attention items rise to the top.
- Consumes `CommissionerLeagueHealthViewModel` (below), never a raw provider payload. Renders **no
  player-level records** and **no provider/API identifiers**.
- States: populated, loading, and a truthful **unavailable** state ("no sample data is shown in its
  place") — never a fabricated zero-value chart.

### Provider-agnostic view model

`lib/executive-viz/commissionerLeagueHealthViewModel.ts` maps the normalized snapshot into
`CommissionerHealthDimension[]` + `CommissionerAttentionSummary`. Pure and provider-agnostic: identical
output whether the source is Sleeper, ESPN, Yahoo, Fantrax, MFL, Fleaflicker, or native AllFantasy data.
Every number already existed in the snapshot — **no new intelligence is computed here.** Each dimension
carries a plain-language label, a real value label (the honest underlying figure), a "why this matters"
sentence, and a direct action link only when a real enabled commissioner action exists.

---

## Step 5–7 — Hierarchy, explanation, motion

- **60/30/10 hierarchy** (`CommissionerOsFlagship` in `CommissionerHubPageClient.tsx`, grid
  `lg:grid-cols-5`): the League Health Map (~60%, `col-span-3`) dominates; a rail (~40%, `col-span-2`)
  holds three real KPIs (Health / Needs attention / Open actions, ~30%) above the top commissioner
  actions (~10%). `selectFlagshipSnapshot()` surfaces the most at-risk league. The existing per-league
  dashboard grid remains below as supporting detail — no full-page rewrite.
- **Plain-language only:** "League health", "Needs attention", "Stable", "Monitor", "Critical", "Not
  available". No "API status", "resolver", "payload", "Decision OS", or internal signal names appear on
  the surface (verified live — see Step 10).
- **Restrained motion, resilient by design:** the readiness bar width is rendered **directly at its
  correct value on first paint**, never gated behind an animation/effect. This was a deliberate fix after
  live testing showed that this app's runtime (and the automated QA browser's hidden tab) freezes
  requestAnimationFrame, framer-motion entrance animations, and even CSS keyframe/transition reveals — so
  any design that hid the resting state behind a reveal left the bars invisible. Motion is now limited to
  non-hiding CSS transitions (`transition-[width]`, row hover elevation) that honor `motion-reduce:*`; the
  data is never hidden by a stalled animation.

---

## Step 8 — Data-integrity boundaries (enforced)

No fake history, no fabricated trend direction, no random points, no silent sample-data substitution, no
raw-provider objects in presentation, no provider-specific fields in the visualization contract, no
unnecessary internal IDs rendered to customers, no causation claims (dimensions are status/correlation),
and empty/unavailable data is presented honestly. The visual layer consumes only the role-specific,
provider-agnostic `CommissionerLeagueHealthViewModel` / `CommissionerHealthDimension` /
`CommissionerAttentionSummary`.

---

## Step 9 — Tests

`__tests__/executive-viz/executive-visualization-engine.test.tsx` (19 tests): provider-agnostic mapping
(8 dimensions, worst-first ranking, `unavailable` not "good" for missing data, real value labels, real
attention headline, real-action-only linking, provider-agnostic context label), `selectFlagshipSnapshot`,
flagship render states (populated / loading / unavailable with no fabricated dimensions), 8 accessible
meters, reduced-motion render, **no provider/API/player names rendered**, status semantics reuse the
`status-*` tokens (no raw hue/hex), source-scan data-integrity boundary (no provider imports, no
sparkline/time-series), and confirmation the Visual OS V1.0–V1.3 primitives remain in use.

---

## Step 10 — Browser verification (real populated Commissioner OS, authenticated)

Verified live against the real **"12-Team NFL Redraft League"** via computed DOM inspection (the phase's
sanctioned supporting evidence):

- Flagship renders with real data: **8 dimensions ranked worst-first** (engagement `at_risk` on top),
  **8 accessible meters** whose `aria-valuenow` matches the data (e.g. engagement 45/100).
- **Bars render at their correct visible widths** (engagement 45% → 204px, overall 78% → 354px, manager
  activity 100% → 415px, competitive balance 90%); `data_readiness` is a legitimate 0% (real coverage),
  shown honestly with its track and value label, not hidden.
- **Solid, theme-adaptive status colors** confirmed via computed `backgroundColor` in both dark
  (`rgb(252,165,165)` etc.) and light (chip text `rgb(220,38,38)`) — all routed through theme tokens.
- **60/30/10 hierarchy** confirmed (`grid lg:grid-cols-5`), 3 real KPIs (Health 78 / Needs attention 2 /
  Open actions 0), 7 action links **all carrying `.focus-ring`**, plain-language legend (Stable / Monitor
  / Needs attention / Critical / Not available), accessible summary "1 area needs attention in 12-Team NFL
  Redraft League; 6 stable."
- **No provider/API/player-level identifiers** in the flagship subtree (banned-term scan returned empty).

**Environmental limitation (honestly disclosed):** the automated QA browser tab runs hidden, which
freezes the renderer — one full-page screenshot captured successfully (hero/overview, light theme), but a
flagship-specific screenshot timed out ("renderer may be frozen"). The hidden-tab freeze is also what
surfaced (and drove the fix for) the animation-independence requirement above. All flagship claims here
are backed by computed DOM/style inspection, not a claimed screenshot.

---

## Step 11 — Boundaries honored

- Decision OS remains behind the scenes — **no new Decision OS logic, resolver, route, or composition**
  was added; the view model only reshapes an existing snapshot and computes no new intelligence.
- **No backend contracts changed, no provider logic changed, no new providers.**
- **No fake trends or historical data** — the map is explicitly a current snapshot and ships no sparkline.
- **No B2C Legacy features.**

### Pre-existing finding (documented, not fixed — out of scope)

Live testing confirmed that in this app's Tailwind config, the **opacity shorthand on `status-*`
CSS-variable colors resolves to transparent** (`bg-status-danger/10` → `rgba(0,0,0,0)`), which also
affects the existing V1.0–V1.3 Decision OS tone chips (they rely on their solid text color). The
Executive Viz bars/dots therefore use **solid** status tokens only. A broader remediation of the
opacity-on-status-token pattern across all Visual OS primitives is a separate, larger effort.

## Deferred visualization types

Sparkline (needs real time series), Sankey, network, treemap, radar, bubble, gauge — plus User/League/
Trade/Waiver/Draft/Platform OS flagship graphs — all deferred; the engine foundation is designed to
support them without a separate palette.

## Files changed

- `lib/executive-viz/commissionerLeagueHealthViewModel.ts` *(new)*
- `components/executive-viz/executiveVizTokens.ts` *(new)*
- `components/executive-viz/ExecutiveVisualizationShell.tsx` *(new)*
- `components/executive-viz/LeagueHealthMap.tsx` *(new)*
- `app/commissioner-hub/CommissionerHubPageClient.tsx` *(flagship integration + 60/30/10)*
- `__tests__/executive-viz/executive-visualization-engine.test.tsx` *(new, 19 tests)*
- docs: this file + `OS_PROGRESS_DASHBOARD.md` + `FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md`

---

# Phase V2.1 — Commissioner OS Executive Analytics Workspace

Turns Commissioner OS from "a flagship + a page of cards" into an **executive analytics workspace**: the
League Health Map stays the dominant anchor, and four supporting graphs (each answering exactly one
commissioner decision) explain the league's operational state around it. Same scope and constraints as
V2.0 — B2B/licensing only, Decision OS/backend/provider abstraction frozen, no fabricated history, no
B2C/player-centric dashboards.

## Step 1 — Data audit

All four supporting graphs are built from the **same** provider-agnostic `CommissionerLeagueHealthSnapshot`
already loaded for the flagship — no new fetch, no new contract, no new intelligence. Every field used is
a **current-snapshot** value (counts or 0–100 scores); no historical series exists, so nothing draws a
timeline.

## Step 2 — Supporting visualizations (one question each)

| Graph | Question | Real data | Form |
| --- | --- | --- | --- |
| **Manager Attention** | Where do my managers need attention? | `inactiveTeams`, `missedLineups`, `injuredStarters`, `lowConfidenceProjectionStarters`, `activeManagers`/`teamCount` | ranked severity bars (issue categories, not per-manager identities — the contract carries none) |
| **Health Breakdown** | Which dimensions drive the overall score? | `healthScore`, `engagementScore`, `fairnessScore`, `sustainabilityScore` | weakest-first 0–100 comparison bars |
| **Today's Workload** | What requires my action today? | `pendingWaiverClaims`, `pendingTrades`, `openAiAlerts`, `commissionerActions` | ranked count bars; positive empty state when all clear |
| **League Readiness** | Is the league operationally ready? | `lineupSubmissionRate`, `projectionCoveragePct`, `activeManagers`/`teamCount` | three progress rings; data confidence as a label (not a fabricated ring value) |

Builders live in `lib/executive-viz/commissionerLeagueHealthViewModel.ts`
(`buildManagerAttentionDistribution`, `buildLeagueHealthBreakdown`, `buildCommissionerWorkload`,
`buildLeagueReadiness`) — pure, provider-agnostic, each returning display data + an accessible headline +
an honest `available` flag.

## Step 3–4 — Composition + reusable primitives

- **Workspace layout** (`CommissionerOsFlagship`): Row 1 = League Health Map (dominant ~60%) + KPI/action
  rail (~30/10); Row 2 = the four supporting graphs in a `md:grid-cols-2` grid, rendered in the
  **non-dominant** shell so they reinforce rather than compete with the map.
- **New shared chart primitives** (`components/executive-viz/ExecutiveCharts.tsx`), added only because
  each has two or more consumers: `ExecutiveHorizontalBars` (used by Manager Attention, Health Breakdown,
  and Workload) and `ExecutiveProgressRing` (three rings in League Readiness). Both render fill **directly
  at the correct value** (never gated behind an animation/effect that freezes in hidden tabs) and honor
  `motion-reduce:*`.

## Step 6 — Hierarchy audit

The cross-league 7-metric aggregate strip is now **gated to multi-league commissioners** (`snapshots.length
> 1`); for a single league it fully duplicated the flagship workspace, so it is suppressed there to keep
the map dominant and remove the duplicate KPIs — while multi-league commissioners still get their
cross-league summary. No unrelated card rewrite.

## Step 7 — Provider abstraction

Verified live (banned-term scan returned empty across the whole workspace): no provider names, API
terminology, normalized payload fields, internal identifiers, or player-level records reach the surface.
Manager Attention deliberately shows a **distribution of issue categories**, not per-manager identities,
because the normalized contract does not carry them (and the phase permits severity distribution).

## Step 8 — Browser verification (real authenticated "12-Team NFL Redraft League")

Via computed DOM inspection: all four supporting cards present with correct real-data summaries — Manager
Attention "All 12 managers are active and set" (honest 0% bars — this league has zero manager issues),
Health Breakdown "Engagement is the weakest dimension at 45/100" with bars rendering at correct visible
widths (engagement 45%/197px through sustainability 100%/438px, weakest-first), Today's Workload showing
the positive empty state ("Nothing requires your action"), League Readiness rendering three rings ("Lineups
set: 100%"). Zero provider/API/player identifiers found. **Limitation (disclosed):** the automated QA tab
runs hidden and its renderer freezes for frame capture — a screenshot call returned a blank frame, so no
flagship-workspace screenshot is claimed; all findings are backed by computed DOM/style inspection, which
the phase permits as supporting evidence.

## Step 9 — Tests

`__tests__/executive-viz/executive-analytics-workspace.test.tsx` (15 tests): the four builders
(worst/weakest-first ranking, real value labels, real headlines, all-clear and unavailable paths), the two
chart primitives (accessible meters + aria values), the four cards (populated / positive-empty /
unavailable states, accessible summaries, no provider/API/player names), and the dashboard hierarchy
(workspace renders map + all four graphs; aggregate strip gated to multi-league; `ExecutiveHorizontalBars`
reused two or more times).

## Deferred (V2.1)

Per-manager attention (needs a per-manager contract this snapshot doesn't carry), and the still-unbuilt
Sankey/treemap/radar/etc. and User/League/Trade/Waiver/Draft/Platform OS flagships.

## Files changed (V2.1)

- `lib/executive-viz/commissionerLeagueHealthViewModel.ts` *(4 new builders + types)*
- `components/executive-viz/ExecutiveCharts.tsx` *(new — ExecutiveHorizontalBars, ExecutiveProgressRing)*
- `components/executive-viz/SupportingExecutiveViz.tsx` *(new — 4 supporting cards)*
- `app/commissioner-hub/CommissionerHubPageClient.tsx` *(workspace composition + hierarchy gate)*
- `__tests__/executive-viz/executive-analytics-workspace.test.tsx` *(new, 15 tests)*
- docs: this file + `OS_PROGRESS_DASHBOARD.md` + `FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md`
