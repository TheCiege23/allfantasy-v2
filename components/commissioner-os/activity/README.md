# Universal Activity Stream

The curated, cross-module chronological record — per its own placeholder
description, "never a duplicate of any module's own evidence, workflow,
or audit log." Distinct from [Notification Center](../notifications/README.md)
by design, not just by name:

| | Notification Center | Activity Stream |
|---|---|---|
| Question it answers | "What needs my attention?" | "What happened, in order?" |
| Shape | `CommissionerNotificationPayload` — `read` state, an optional `relatedLink` | `CommissionerActivityEventContract` — `type`, `initiator`, `evidenceHref` |
| Lifecycle | Actionable, dismissible (read/unread, mute) | Permanent — nothing here is ever marked read or hidden |
| Reuses | — | The exact same event-severity vocabulary (`CommissionerNotificationSeverity`), never a third scale |

Both contracts already existed in Platform Contracts before this phase,
already sharing that one severity vocabulary — this phase completed
Activity Stream's own client, adapter namespace, and UI without touching
Notification Center's state or behavior at all.

## A genuine hybrid, architecturally

Every other platform service this program has built (Search, Notification
Center) has no `CommissionerModuleId` and no sidebar entry — reached only
via a header overlay. Activity Stream is different: `'activity'` was
already a real `CommissionerModuleId`, already had a sidebar entry
(`COMMISSIONER_SECONDARY_NAV_ITEMS`) and a placeholder page, even though
`lib/commissioner-os/platform/serviceRegistry.ts` also nominally lists
`'activity-stream'` among the four platform services. This phase followed
the scaffolding that already existed — a real module page — rather than
retrofitting it into the header-overlay pattern Search/Notifications use.
`wrapMethod`'s `moduleId` argument is passed as a plain `CommissionerModuleId`
here, no `CommissionerErrorAttributableId` widening needed (unlike Search
and Notifications).

## The Mission Control duplicate this phase deleted

Mission Control's own `getRecentActivity()` / `ActivityEntrySummary`
(`id`, `label`, a pre-formatted relative-time string) were a genuine
architectural duplicate of what this module now owns — the same
"answering the identical question with two independently-maintained
implementations" problem the Recommendations Center phase already found
and deleted (`RecommendationSummary`/`getRecommendationsPreview()`).
Both were removed entirely from
`lib/commissioner-os/decision-os-client/{types,stub,demo,live}.ts`.
`app/commissioner-os/page.tsx` now calls `adapter.activity.getEvents()`
and maps the newest few into `TimelineCard`'s own `TimelineEntry` shape
— `TimelineCard` was already a fully generic Card System component with
no dependency on Mission Control's deleted type, so this retrofit touched
nothing about how the card itself renders.

## Ownership

Chronological activity history, cross-module activity events, source
attribution, activity filtering, severity indicators, timeline
presentation, event metadata, and navigation to source modules — all of
it is exactly what `CommissionerActivityEventContract` already carries
(`id, type, sourceModuleId, severity, initiator, summary, evidenceHref?,
timestamp`); this phase added no fields to that contract.

- **Filtering** reuses the exact tablist pattern Workspace's
  `WorkQueueStrip` and Recommendations Center's Queue/History toggle
  already established (`role="tablist"`/`role="tab"`/`aria-selected`),
  filtering by source module.
- **Severity indicators** and **module labels/icons** reuse
  `components/commissioner-os/cards/severityStyles.ts`'s
  `getEventSeverityStyle`/`EVENT_SEVERITY_LABELS` and
  `lib/commissioner-os/navigation/moduleNav.ts`'s `getModuleLabel` —
  both promoted out of Notification Center's own label file this phase,
  once Activity Stream needed the identical lookups for the identical
  types. Neither module defines its own copy anymore; both re-export or
  import from the shared home.
- **Navigation to source modules** is `evidenceHref`, reusing the exact
  "a link back to the owning module, never a duplicate of its data"
  pattern every other module's `relatedLink`/`CommissionerRelatedLink`
  already established.

## Data

`lib/commissioner-os/activity/decision-os-client/` — stub, demo, and an
honest live placeholder for the one method (`getEvents`). The demo
implementation composes every event by **awaiting the real owning
module's own demo client** (League Health's risk, Automation Center's
catalog, Reports' history, Recommendations' queue, Workspace's tasks) —
never a second copy of a risk's description, an automation's health
detail, a report's failure reason, or a task's own fields, only enough
(`summary`, `evidenceHref`) to know about it and get back to it.

## Tests

`__tests__/commissioner-os-activity.test.tsx` — client parity, live's
honest-error contract, demo events spanning multiple modules/severities/
initiators, newest-first ordering, a structural check that no event
carries anything beyond the contract's own fields, the source-module
filter, severity/module/initiator metadata rendering, evidence-link
correctness, the empty state, and both error states.
`__tests__/commissioner-os-adapter.test.ts` extended for the eleventh
namespace. `__tests__/commissioner-os-mission-control.test.tsx` and
`__tests__/commissioner-os-demo-mode.test.ts` updated for the deleted
`getRecentActivity()` method, plus a new regression-guard test confirming
it stays deleted.
