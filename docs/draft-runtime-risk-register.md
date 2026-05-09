# Draft Runtime Risk Register

This register tracks runtime risks, mitigation plans, and current operational status.

## Severity and Likelihood Scale

- Severity: `critical`, `high`, `medium`, `low`
- Likelihood: `high`, `medium`, `low`
- Status: `open`, `mitigating`, `accepted`, `closed`

## Risk Register

| Risk ID | Risk | Severity | Likelihood | Impact | Detection Method | Mitigation | Rollback Plan | Owner | Current Status |
|---|---|---|---|---|---|---|---|---|---|
| DR-001 | Paused pick bypass allows commits while paused | critical | low | Draft integrity breach and user trust loss | Server-side contract tests, runtime audit logs | Enforce hard-stop in pick authority layer (PickValidation.ts line 37-44) | Revert policy change and disable live picks for affected sessions | Draft Backend | closed |
| DR-002 | Duplicate player assignment across concurrent commits | critical | medium | Corrupted rosters and invalid standings | DB uniqueness checks, integrity reconciliation job | Add uniqueness constraints + lock + idempotency | Disable affected draft session and run repair script | DB + Draft Backend | open |
| DR-003 | Stale session version mutation accepted | high | medium | Pointer drift, incorrect on-clock state | Version mismatch metrics, conflict logs | Require expected version for all runtime mutations | Roll back compare-and-swap change and re-enable strict stale rejection | Draft Backend | open |
| DR-004 | Notification duplication during retries | medium | high | Alert spam and poor UX | Notification dedupe metrics, support tickets | Idempotency keys on notification events | Disable batched notifier and use direct deduped path | Platform | open |
| DR-005 | Trade ownership corruption during on-clock accept | critical | medium | Rights ownership divergence and invalid picks | Transaction integrity tests + event audit | Atomic trade transaction with lock and version validation | Disable trade-accept endpoint by feature flag | Draft Backend | open |
| DR-006 | Websocket desync across clients | high | medium | Different boards across users and disputes | Client checksum mismatch, reconnect telemetry | Event cursor replay and polling fallback | Force polling-only mode and disable realtime channel | Platform + Frontend | open |
| DR-007 | AI recommendation timeout on pick path | medium | medium | Delayed UX and missed pick windows | API latency monitoring and timeout counters | Move AI calls off critical path, cache recommendations | Disable AI enrichment on-clock and use static fallback | AI Platform | open |
| DR-008 | Event replay mismatch from malformed event payloads | high | low | Recovery failure and audit inconsistency | Replay validation suite and schema checks | Versioned event schema with strict validation | Stop replay worker, patch transformer, replay from checkpoint | Platform | open |
| DR-009 | Orphaned roster entries after completion repair | high | medium | Post-draft roster inconsistencies | Completion reconciliation report | Idempotent finalization + orphan sweep | Re-run finalization in maintenance mode | Draft Backend | open |
| DR-010 | Lock starvation/deadlock under heavy contention | high | low | Mutation throughput collapse | Lock wait metrics and timeout alerts | Bounded lock TTL and retry/backoff policy | Disable lock feature flag and fallback to transaction guards | Platform | open |
| DR-011 | Stale queue edits overwrite valid queue state | medium | medium | Poor autopick behavior and user confusion | Queue revision mismatch logs | Queue revision/If-Match policy for writes | Revert optimistic concurrency and keep last-write-win temporarily | Draft Backend + Frontend | open |
| DR-012 | Draft completion emits duplicate terminal events | medium | low | Downstream worker duplication | Event stream duplicate detector | Idempotency key on completion event | Suppress duplicate completion processing and replay once | Platform | open |

## Review Cadence

- Review weekly during active implementation.
- Review daily during beta launch week.
- Escalate all `critical` risks with `open` status older than 48 hours.

## Exit Criteria for Beta

- No `critical` risks in `open` status.
- All `high` risks are either `mitigating` with verified controls or `closed`.
- Recovery runbooks exist for every risk with `high` or `critical` severity.