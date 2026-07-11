# Mission Control

The first real business-module UI in Commissioner OS. Owns presentation,
orchestration, prioritization, and navigation only — it computes nothing.

## History: built ahead of its data sources, then retrofitted as they landed

The Implementation Program's own sequencing (Foundation → League Health /
Manager Intelligence / Recommendations Center → Mission Control) puts
Mission Control *after* its three main data sources. It was originally
built before any of those three existed, against the Decision OS client's
stub implementation only (`lib/commissioner-os/decision-os-client/`) —
Implementation Program §12's mechanism for exactly this situation — with
an unconditional `PreviewDataBanner` making that fact unmissable.

League Health, Manager Intelligence, and Recommendations Center are now
all real. Mission Control was retrofitted module-by-module to consume
each one's own client as it landed:

- **League Health** and **Manager Intelligence** summaries still come
  through Mission Control's own `decision-os-client` (`getLeagueHealthSummary`,
  `getManagerHighlights`, `getMissionControlKpis`) —
  Mission Control's legitimate own preview/aggregation data, mode-selected
  via Demo Mode exactly like every other client in this program.
- **Recommendations** were a real duplicate, not a legitimate preview: an
  ad hoc `RecommendationSummary` type and `getRecommendationsPreview()`
  method were deleted entirely from this module's client once
  Recommendations Center's own client and the shared
  `CommissionerRecommendationContract` existed (see
  `lib/commissioner-os/decision-os-client/types.ts` and
  `components/commissioner-os/recommendations/README.md`). Today's
  Priorities now fetches from `getRecommendationsClient().getQueue()`
  directly, filtered to non-terminal statuses and sliced to 3 — the
  Decision Ownership Matrix's "do not duplicate recommendation logic"
  rule enforced as an actual deletion, not just a convention.
- **Recent Activity** followed the identical path one phase later:
  `getRecentActivity()` and `ActivityEntrySummary` (`id`, `label`, a
  pre-formatted relative-time string) were the same kind of genuine
  duplicate — answering "what recently happened" a second, independently
  maintained way once
  [Universal Activity Stream](../activity/README.md)'s own
  `CommissionerActivityEventContract` existed. Both were deleted entirely
  from this module's client (see
  `lib/commissioner-os/decision-os-client/types.ts`). `app/commissioner-os/page.tsx`
  now calls `adapter.activity.getEvents()` and maps the newest 5 into
  `TimelineCard`'s own `TimelineEntry` shape using the shared
  `formatRelativeTime` utility (`lib/commissioner-os/utils/time.ts`) —
  Mission Control still never computes what happened or when, only
  previews Activity Stream's own real events.

`PreviewDataBanner` is no longer unconditional — it's Demo Mode-aware
(`mode` prop) and renders nothing in `'live'`. Every response is still
tagged with its real `source` (`'stub' | 'demo' | 'live'`); a future swap
to real Decision OS data changes what each module's own `live.ts` does,
not UI code.

A third pass replaced both direct client imports with the
[Decision OS Adapter Layer](../../../lib/commissioner-os/adapter/README.md):
`app/commissioner-os/page.tsx` now calls `getDecisionOSAdapter()` once and
reads `adapter.missionControl.*` / `adapter.recommendations.getQueue()` —
it no longer imports `getDecisionOSClient`, `getRecommendationsClient`, or
`resolveServerDataMode` at all. `adapter.mode` replaces the page's
previous separate mode-resolution call.

**Automation Status** followed the exact same "consume a summary, never
compute it" pattern as Recommendations: `adapter.automations.getSummary()`
returns [Automation Center's](../automations/README.md) own small
aggregate (`headline`, counts), and the `StatusCard` renders
`summary.headline` verbatim — Mission Control still never counts
automations itself. **League Analytics** got the identical treatment:
`adapter.analytics.getSummary()` returns
[League Analytics'](../analytics/README.md) own headline, rendered via
`SummaryCard` next to Automation Status. **Reports** is the fourth
module to follow this pattern: `adapter.reports.getSummary()` returns
[Reports'](../reports/README.md) own `{ headline, scheduledCount,
readyCount }`, rendered as one more `SummaryCard` — Mission Control never
counts ready or scheduled reports itself, it only ever displays the
headline Reports already computed.

**Global Search deliberately does not follow this pattern.** It's a
platform service, not a business module — Mission Control "consumes
search entry points only" (the task's own wording, distinct from every
other module's "consumes summaries only"), which this satisfies simply by
being one more Commissioner OS page under the shared layout: the header's
search button and ⌘K/Ctrl+K shortcut work identically from Mission
Control as from any other route. No `SummaryCard`, no `adapter.search.getSummary()`
call, and no Mission-Control-local search widget were added — see
[Global Search's README](../search/README.md).

**Notification Center is also a platform service, but *does* get the
summary-card treatment** — its own task wording was "consumes
notification summaries only," matching Reports/Analytics/Automation's
phrasing exactly rather than Search's. `adapter.notifications.getSummary()`
returns [Notification Center's](../notifications/README.md) own
`{ headline, unreadCount, criticalCount }`, rendered as a `SummaryCard`
whose `status` reflects `criticalCount > 0` — Mission Control never
counts unread or critical notifications itself, and still never renders
the notifications themselves (no inbox, no per-notification detail) —
only the one aggregate headline Notification Center already computed.
The two platform services arrived one phase apart with two different
Mission Control footprints for exactly the reason their own task wording
differed.

**Universal Activity Stream is neither pattern — it's the "stream module"
shape, like Recommendations.** Unlike Search and Notifications, `'activity'`
is a real `CommissionerModuleId` with its own route, not a header-triggered
overlay. And unlike the four aggregate modules above, Mission Control never
calls a `getSummary()` for it — `app/commissioner-os/page.tsx` fetches
[Activity Stream's](../activity/README.md) real `adapter.activity.getEvents()`
list directly and the *page itself* slices/maps a 5-item preview into
`TimelineCard`, the same "consume the real list, no separate summary method"
treatment Recommendations' Today's Priorities already established.

**Help & Knowledge Center gets zero Mission Control footprint at all** —
not even the "consume the real list" treatment Activity Stream gets. Like
Activity Stream, `'help'` is a real `CommissionerModuleId` with its own
route, not a header overlay; unlike every other module documented above,
Mission Control has no `adapter.help.*` call anywhere, no `SummaryCard`,
and no preview widget. The shared header's `HelpCircle` link — present on
every Commissioner OS page, Mission Control included — already satisfies
"consumes help entry points only" for free, the same way Search's header
button satisfies its own identical requirement with zero
Mission-Control-specific code. See
[Help & Knowledge Center's README](../help/README.md).

## What's here

- `MissionControlView.tsx` — the client-side composition: League Health
  summary, KPI strip, Quick Actions, Today's Priorities (recommendation
  cards sourced from Recommendations Center), Manager Intelligence
  highlights, Workspace summary, Recent Activity, Automation/System
  status.
- `app/commissioner-os/page.tsx` — an async Server Component that fetches
  through the Decision OS Adapter Layer and passes plain, serializable
  data down — no functions cross the server/client boundary.

## What was deliberately not built

Real Quick Action behavior, real recommendation actions, League Pulse,
Competitive Balance Snapshot, and Upcoming Deadlines from the full Mission
Control Blueprint are not in this pass — the blueprint's 13-widget
surface was scoped down to the 11 regions this task explicitly listed.
