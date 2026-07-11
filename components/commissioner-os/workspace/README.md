# Commissioner Workspace

The operational execution layer. Mission Control surfaces what needs
attention, League Health explains why, Recommendations Center owns
guidance, Manager Intelligence explains who's involved — Workspace is
where a commissioner actually does the work, and the only module that
owns a task model.

## Ownership

Workspace owns the task model, its lifecycle, Inbox presentation, and
Work Queue views. It does not compute League Health, Manager
Intelligence, or recommendation logic — a task's `relatedLinks` point
back to the module whose evidence justified it (a recommendation, a
League Health risk, a manager profile) rather than copying that module's
data into the task.

## Task model

`CommissionerTask` (`lib/commissioner-os/workspace/decision-os-client/types.ts`):
`status` is Workspace's own six-state lifecycle (`open` → `in_progress` →
`completed`, with `waiting_on_manager`/`waiting_on_league_vote` branches,
and `archived` reachable from any state). `priority` reuses the shared
`SeverityTier` vocabulary and coloring from Phase 0.1 tokens rather than
inventing a second urgency color language. Status always renders as a
neutral pill; priority always renders as the colored severity badge — the
same visual split Recommendations Center already established between
status and severity.

There is exactly one task record per task — every Work Queue is a pure
filter over one `CommissionerTask[]`, never a per-queue copy.

## Work Queues

`lib/commissioner-os/workspace/queues.ts` is the single source of truth
for all ten default queues (`WORKSPACE_QUEUES`) — both `WorkQueueStrip`
and this module's tests read the same list, so there is exactly one
definition of what "Needs Attention" or "Due Soon" means:

| Queue | Filter |
|---|---|
| All | every task |
| Needs Attention | unresolved status (`open`/`waiting_on_*`) with `critical`/`elevated` priority |
| High Priority | `critical`/`elevated` priority |
| Due Soon | has a `dueAt` within 7 days, not completed/archived |
| Waiting on Managers | `status === 'waiting_on_manager'` |
| Waiting on League Vote | `status === 'waiting_on_league_vote'` |
| In Progress | `status === 'in_progress'` |
| Automation Candidates | `automationCandidate`, not completed/archived |
| Recently Completed | `status === 'completed'`, newest first |
| Recently Archived | `status === 'archived'`, newest first |

## What's here

- `WorkspaceView.tsx` — orchestrates the queue strip, task list, and
  detail drawer; renders `ErrorState` instead (never an empty-looking
  queue) when the adapter reports an error.
- `WorkQueueStrip.tsx` — the ten-queue tablist, same interaction pattern
  as Recommendations Center's Queue/History toggle.
- `TaskListItem.tsx` — composes the shared `Card`/`Badge` primitives.
- `TaskDetailDrawer.tsx` — built on the shared `Dialog` primitive (this
  module's first use of it in Commissioner OS); shows full task detail,
  related-evidence links, and a single represented-but-unwired next-action
  button (`Mark In Progress` / `Mark Completed` / etc.) — the same
  "rendered, not wired" precedent already established by
  `RecommendationCard`'s `primaryActionLabel`. No bulk actions exist
  anywhere in this module.
- `taskStatusLabels.ts` — the shared status-label and next-action-label
  maps both list item and drawer read, so the vocabulary is defined once.

## Data

`lib/commissioner-os/workspace/decision-os-client/` — stub, demo (ten
tasks spanning every queue, several linking back to the same "Iron Horse
Dynasty" recommendations and managers used elsewhere in this program —
e.g. a task for Sam Rivera's engagement decline links both to
Recommendations Center's matching recommendation and to Sam Rivera's own
Manager Intelligence profile), and an honest live placeholder. Consumed
exclusively through `adapter.workspace` from the
[Decision OS Adapter Layer](../../../lib/commissioner-os/adapter/README.md),
which normalizes `priority` against the real severity enum.

## Loading and error states

`app/commissioner-os/workspace/loading.tsx` is Next.js's route-level
Suspense fallback — it covers the one genuine async gap (the Server
Component awaiting the adapter), rather than a fabricated client-side
spinner for an interaction (queue switching) that's actually instant,
in-memory filtering. `ErrorState` renders when the adapter's response
carries an error (today, only reachable in `live` mode).

## Deferred out of this slice

Full Playbooks, Automation Center, Reports, Settings storage, a real
Decision OS backend, and any bulk task actions — all explicitly out of
scope per this phase's instructions.
