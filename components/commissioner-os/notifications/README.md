# Notification Center

A platform service, not a business module — the same category as
[Global Search](../search/README.md) (see `lib/commissioner-os/platform/serviceRegistry.ts`'s
`CommissionerPlatformServiceId`). No `CommissionerModuleId`, no sidebar
entry; reached from the header's bell icon (previously inert) and, once
opened, from anywhere in Commissioner OS via the same `openServiceId`
mechanism Phase 0.3 built and Search's palette already proved out.

## A repository discovery finding worth stating plainly

Unlike every other module in this program, **no placeholder route existed
for Notification Center** before this phase — `app/commissioner-os/notifications/`
simply didn't exist. There was also no dedicated blueprint document the
way Search had `PROMPT78_UNIVERSAL_SEARCH_DELIVERABLE.md` — `serviceRegistry.ts`'s
own comment says as much (`hasDedicatedBlueprint: false`, "has never had
its own dedicated specification"). What *did* already exist and shaped
this phase directly: `CommissionerNotificationPayload` in Platform
Contracts (`id`, `severity`, `message`, `sourceModuleId`, `createdAt`,
`read`) — a real, if minimal, "future Notification Center" contract this
phase completes rather than redesigns — and the header's bell icon,
already scaffolded and fully inert.

**`sonner` is a separate, pre-existing, ephemeral toast system** (used in
a couple of unrelated places in the wider app) — not integrated with here,
the same "don't duplicate, don't force-merge unrelated infrastructure"
call Search made about `lib/search`. Notification Center's entire remit is
a *persistent* read/unread inbox; a fire-and-forget toast library answers
a different question and was never a fit for it.

## Ownership

Notification inbox, categories, read/unread state, priority, history,
actions, preferences, and cross-module notification routing. Mission
Control consumes only `adapter.notifications.getSummary()` — this
phase's task wording ("consumes notification summaries only") matches
Reports/Analytics/Automation's pattern exactly, unlike Search's "entry
points only" — so, unlike Search, Notification Center *does* get a real
`SummaryCard` on Mission Control.

- **Categories** — derived from `sourceModuleId` directly (module *is*
  the category), the same grouping Search's palette already used; no new
  category field needed.
- **Priority** — `CommissionerNotificationSeverity` (informational/
  success/warning/critical), the *event* severity vocabulary, is the
  priority signal. Never conflated with the five-tier *condition*
  vocabulary (`SeverityTier`) League Health/Recommendations/Automations
  use — see `components/commissioner-os/README.md`'s "Severity vocabulary
  note." The one place a condition tier is translated to an event
  severity is `demo.ts`'s `conditionToEventSeverity`, explicit and
  isolated.
- **Actions** — a new, additive, optional `relatedLink?: CommissionerRelatedLink`
  on `CommissionerNotificationPayload` (`lib/commissioner-os/contracts/notifications.ts`).
  Reuses the existing cross-module link shape rather than inventing a
  second "notification action" concept.
- **Read/unread state and preferences** are local, client-persisted state
  (`useNotificationReadState`, `useNotificationPreferences` — both mirror
  `useRecentSearches`'/`CommissionerLayoutProvider`'s exact localStorage
  pattern), never a second adapter mutation method — the same "interactive
  demo behavior is local state, not a fake backend write" precedent
  Reports' Share/Unshare and Automation's enable/disable already
  established. The fetched `read` flag is only the baseline a fresh
  session starts from; marking something read locally never mutates it.

## A small, additive type change

`CommissionerErrorAttributableId` (`lib/commissioner-os/contracts/errors.ts`)
gained `'notifications'` alongside `'search'` — the same one-line,
additive widening Search's phase already established a precedent for, so
this namespace's errors flow through the adapter's existing
`wrapMethod`/`normalizeErrorContract`/logging pipeline without a
type-level lie. `MODULE_ICONS` (`components/commissioner-os/shell/CommissionerSidebar.tsx`)
was exported for the same reason — Notification Center's per-source-module
icons reuse it directly rather than defining a second, driftable mapping.

## Where the UI lives

- `NotificationPanel.tsx` — `Dialog` + a compact All/Unread filter, a
  "Mark all as read" action, and a per-source-module mute list toggled by
  a gear icon. Grouped by `sourceModuleId`, mirroring Search's own
  category grouping for visual/interaction consistency between the two
  sibling platform-service overlays.
- `NotificationRow.tsx` — one row per notification: severity badge
  (reusing the five-tier severity color tokens via a small translation,
  not new CSS variables), source module icon + label, relative timestamp,
  the message, and — when present — a `relatedLink` that both marks the
  notification read and closes the panel on click, the same "selecting
  something in an overlay dismisses it" behavior Search's palette
  established.
- `useNotificationReadState.ts` / `useNotificationPreferences.ts` —
  localStorage-backed hooks, `commissioner_os_notifications_read` and
  `commissioner_os_notifications_muted_modules`.
- `app/commissioner-os/notifications/page.tsx` — direct-linkable, per
  this phase's own version of the "still resolves to a route" requirement
  Search's placeholder already established; opens the panel on mount and
  fetches nothing itself (the layout already did).
- The header's Bell button (`components/commissioner-os/shell/CommissionerHeader.tsx`)
  now calls `openService('notifications')` and shows a small unread-count
  indicator — a custom-styled dot/number, not the shared `Badge`
  component (whose fixed gradient classes aren't token-driven and whose
  pill shape doesn't fit a corner indicator) — consistent with the
  "style overrides layered on reused primitives" precedent already used
  throughout this program.

## Data

`lib/commissioner-os/notifications/decision-os-client/` — stub, demo,
and an honest live placeholder for both methods (`getNotifications`,
`getSummary`). The demo client builds every notification by **awaiting
the real owning module's own demo client** (League Health's risk,
Automation Center's elevated-health entry, Reports' failed report,
Recommendations' queue) and projecting only a `message` + `relatedLink`
out of each — never a second copy of a risk's description, an
automation's health detail, or a report's failure reason. Consumed
exclusively through `adapter.notifications`.

## A gap closed in the Phase 2 production-hardening audit

`NotificationPanel` didn't distinguish a genuinely empty inbox from
`adapter.notifications.getNotifications()` itself failing (e.g. live
mode) — both silently rendered the same "No notifications yet." affirmative
empty state, the one inconsistency with every other module's honest
`ErrorState` in that situation. Fixed additively: an `errorMessage?: string
| null` prop, threaded from `app/commissioner-os/layout.tsx` the same way
every module page already threads its own error message, rendering
`ErrorState` in place of the notification list/empty-state/preferences
view when present.

## Tests

`__tests__/commissioner-os-notifications.test.tsx` — client parity,
live's honest-error contract, the demo summary's internal consistency
with its own notification list, a structural check that no notification
carries anything beyond the contract's own fields, panel open/closed
gating, category-grouped rendering, the All/Unread filter, mark-as-read
(individual and all) surviving a remount, mute preferences surviving a
remount, a related link both pointing at the right destination and
closing the panel on click, and (added in the Phase 2 audit) `ErrorState`
rendering instead of the empty state when the fetch itself failed.
`__tests__/commissioner-os-adapter.test.ts` extended for the tenth
namespace, this phase's import hygiene, and (Phase 2) event-severity
normalization. `__tests__/commissioner-os-mission-control.test.tsx`
extended for the new required `notificationsSummary` prop.
