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
