# Draft Runtime Test Matrix

This document maps launch gates to exact test coverage, expected result, load scenario, and failure recovery behavior.

## Status Legend

- `existing`: test currently exists in repository.
- `to_add`: test must be added before launch.

## Launch Gate Coverage Matrix

| Launch Gate | Exact Test File | Status | Expected Result | Load Scenario | Failure Recovery Behavior |
|---|---|---|---|---|---|
| Pause hard-stop passes server-side tests | __tests__/draft/pause-hard-stop.test.ts | existing | Pick request rejected when draft status is paused | Single request + stale client retry | Return deterministic error code and keep session pointer unchanged |
| Manual pick vs auto-pick race test passes | __tests__/live-draft-engine/expired-autopick.transaction.test.ts | existing | One winner commit, other attempt rejected as stale/race | Simulated concurrent manual + auto pick on same overall | Retryable conflict response, no duplicate pick row |
| Undo vs auto-pick race test passes | __tests__/live-draft-engine/undo-vs-autopick-race.test.ts | to_add | Undo validates expected latest pick and rejects stale autopick | Concurrent undo and timer-expiry autopick | Keep canonical pointer and reject stale mutation |
| Trade accept vs timer expiry test passes | __tests__/live-draft-engine/trade-accept-timer-expiry-race.test.ts | to_add | Trade accept applies timer policy atomically with ownership changes | On-clock trade accept exactly at expiry boundary | Reject stale branch, preserve single source of truth |
| Draft completion assigns all rosters correctly | __tests__/live-draft-engine/draft-completion-reconciliation.test.ts | to_add | All picks reconciled to final rosters with no orphan entries | Full 12-team completion simulation | Run repair path idempotently and recheck assignments |
| Draft chat events appear correctly | __tests__/live-draft-engine/draft-chat-event-ordering.test.ts | to_add | Ordered chat events with no duplicate pick announcements | Burst pick activity (high message throughput) | Deduplicate by idempotency key and keep ordering stable |
| On-clock notification works | __tests__/live-draft-engine/on-clock-notification-idempotency.test.ts | to_add | Exactly one on-clock notification per transition | Rapid pick chain + retry storms | Suppress duplicates, enqueue retry-safe notification |
| AI draft tools are AF Pro gated | __tests__/draft-ai-entitlement-policy-uniformity.test.ts | to_add | All draft AI routes enforce same entitlement policy | Mixed AF Pro / non-Pro users | Standardized 403 policy response for non-entitled paths |
| NCAA roster parity passes | __tests__/draft/ncaa-roster-eligibility-parity.test.ts | to_add | NCAA eligibility and slot behavior match approved parity contract | NCAAF + NCAAB roster generation and pick validation | Reject invalid eligibility without mutating session |
| Soccer roster eligibility passes | __tests__/draft/soccer-roster-eligibility-parity.test.ts | to_add | Soccer positions and aliases map to valid eligibility rules | Soccer draft with alias positions (GK/GKP/DEF/MID/FWD) | Normalize aliases and reject invalid mappings safely |
| 12-team live draft simulation remains stable | e2e/draft-12-team-live-simulation.spec.ts | to_add | Draft reaches completion with no integrity errors | 12 teams, mixed manual/autopick, pause/resume cycles | Automatic replay-safe reconciliation and alerting |
| Simultaneous pick attempts remain safe | e2e/draft-simultaneous-pick-contention.spec.ts | to_add | At-most-one successful commit per overall | Multiple clients submit same pick window | Return conflicts quickly and keep UI synchronized |
| Pause during timer expiration remains safe | e2e/draft-pause-during-expiration.spec.ts | to_add | Pause wins and autopick does not commit while paused | Pause command issued near timer deadline | Timer worker aborts commit and marks stale |
| Websocket disconnect/reconnect syncs correctly | e2e/draft-realtime-reconnect-sync.spec.ts | to_add | Reconnected client catches up from event stream without drift | Drop/reconnect during active picks | Replay from last event cursor; polling fallback if needed |
| Stale queue edits do not corrupt queue | __tests__/draft/queue-stale-edit-conflict.test.ts | to_add | Stale edit rejected or merged by policy, no duplicate entries | Concurrent queue edits + on-clock autopick | Deterministic conflict response with preserved queue consistency |
| Draft completion reconciliation produces zero orphans | __tests__/draft/draft-completion-orphan-repair.test.ts | to_add | No orphaned rights/picks/assignments after completion | Forced transient failure mid-finalize then retry | Idempotent repair pass and stable terminal state |
| Roster assignment verification passes | __tests__/draft/roster-assignment-integrity.test.ts | to_add | Every committed pick has exactly one roster assignment | High-volume pick sequence with retries | Retry assignment worker and emit repair event |
| AF Pro entitlement enforced under load | e2e/draft-ai-entitlement-load.spec.ts | to_add | Entitlement decisions are consistent at concurrency | Concurrent AI route requests from mixed plans | Central entitlement resolver remains authoritative |

## Test Execution Order (Pre-Beta)

1. Run all `existing` tests for baseline confidence.
2. Implement and pass all `to_add` tests for Phase 1 and Phase 2 gates.
3. Run 12-team simulation and contention E2E suite.
4. Execute reconnect/desync E2E for realtime transport.
5. Block release if any launch-gate test fails.

## Required Reporting Per Test Run

- Commit SHA
- Environment (local/staging/preprod)
- Test suite duration
- Pass/fail summary
- Failing gate IDs
- Incident ticket IDs opened for failures