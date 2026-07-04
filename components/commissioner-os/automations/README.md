# Automation Center

Removes repetitive commissioner work without ever replacing commissioner
judgment. Per the Commissioner OS Canon, nothing here can ever represent
a trade approval, member removal, or rule ratification — every catalog
entry is a repetitive, low-stakes task (waiver housekeeping, reminders,
digests, scheduling nudges).

## Ownership

Automation Center owns the automation catalog, enablement status,
schedules/triggers, execution history and details, and health
indicators. Mission Control consumes only `adapter.automations.getSummary()`
— a small aggregate (`totalCount`, `activeCount`, `needsAttentionCount`,
`headline`) Automation Center computes over its own catalog. Mission
Control's `StatusCard` renders `summary.headline` verbatim; it never
counts automations itself.

## Status vs. health — two different axes

`status` (`enabled`/`disabled`) is a neutral pill — is this turned on.
`health` (the shared `SeverityTier`) is the colored severity badge — how
well is it currently running. The demo catalog deliberately includes
`demo-auto-2` ("Lineup lock reminder"), which is `enabled` but
`health: 'elevated'` after a real recent failure — a running automation
having problems is the entire reason these are two separate fields, not
one.

## Enable/disable is a real, local toggle

Unlike Workspace's rendered-but-unwired next-action button, the
enable/disable `Switch` here genuinely flips local component state on
click — Demo Mode exists to look and behave convincingly for
screenshots/demos/QA, and `PreviewDataBanner` already discloses that
nothing is connected to live data, so the toggle doesn't need its own
redundant caveat. It mutates in-memory state only; no Decision OS backend
exists yet to persist it, and refreshing the page reverts to the fetched
`status`.

## Execution history vs. execution details

Two distinct, separately required concerns: the history table is the
compact, scannable list (when, result, duration, summary); clicking a row
expands it in place to reveal the fuller `detail` text. No nested dialog
— one `AutomationHistoryDialog` per automation, opened via each card's
"View History" button.

## Data flow

Per-automation execution history is fetched **server-side, for every
catalog entry, up front** in `app/commissioner-os/automations/page.tsx`
— `AutomationCenterView` is a client component and never fetches on its
own, exactly like every other module's drawer/dialog in this program
(Workspace's task detail, League Health's evidence dialog). The page
builds a `Record<automationId, AutomationExecutionEntry[]>` map and
passes the whole thing down as a prop.

`lib/commissioner-os/automations/decision-os-client/` — stub, demo (five
automations for "Iron Horse Dynasty," several linking back to the exact
recommendations/tasks/managers used elsewhere in this program: the
trade-deadline reminder this automation sends is the one Recommendations
Center flagged and Workspace has a task to confirm went out; the
duplicate-waiver-claim automation is what resolved Workspace's now-
archived task), and an honest live placeholder for all three methods
(`getCatalog`, `getExecutionHistory`, `getSummary`).

## A shape promoted to Platform Contracts

Building this module's related-links field surfaced that Workspace's
private `CommissionerTaskRelatedLink` (`{moduleId, label, href}`) was
about to be duplicated verbatim. Per the Decision Ownership Matrix's "one
owner, many consumers" rule, it was promoted to Platform Contracts as
`CommissionerRelatedLink` (`lib/commissioner-os/contracts/relatedLink.ts`);
Workspace's own type is now a same-name alias of it, so nothing that
already imports `CommissionerTaskRelatedLink` needed to change.

## Consumed exclusively through the adapter

Both `app/commissioner-os/automations/page.tsx` and Mission Control's page
call `adapter.automations.*` — neither imports
`lib/commissioner-os/automations/decision-os-client` directly. The one
type the page needs to construct its history map
(`AutomationExecutionEntry`) is imported from `@/lib/commissioner-os/adapter`,
which re-exports it, not from the per-module path — the same convention
League Health/Workspace/Recommendations' own **view components** already
follow for their own prop types, now extended to a **page** for the first
time since Automation Center is the first module whose page needs to
build a new typed structure rather than just pass fetched data through.

## Tests

`__tests__/commissioner-os-automations.test.tsx` — client parity across
stub/demo/live, live's honest-error contract for all three methods, the
demo summary's internal consistency with its own catalog, health-sorted
rendering, the enable/disable toggle's independence per card, the
history-dialog's expand-to-detail interaction, and both empty and error
states. `__tests__/commissioner-os-adapter.test.ts` extended to cover the
sixth namespace and this page's import hygiene.
