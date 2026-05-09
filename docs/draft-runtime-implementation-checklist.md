# Draft Runtime Implementation Checklist

This file is the operational source of truth for draft-runtime implementation progress.

## Status Legend

- `not_started`
- `in_progress`
- `blocked`
- `done`

## Live Implementation Board

| Phase | Task | Owner | Status | Blocker | Dependency | Test Requirement | Rollout Risk | Rollback Plan | Completed Date |
|---|---|---|---|---|---|---|---|---|---|
| Phase 1 - Integrity | Rotate exposed secrets across all providers | Security + Platform | not_started | Provider credential inventory incomplete | Security incident ticket opened | Secret scan must pass with 0 high findings | Critical auth/data compromise if delayed | Revoke all old keys, force reauth where needed |  |
| Phase 1 - Integrity | Enforce paused-pick server hard-stop | Draft Backend | done | None | Pick authority policy decision finalized | Contract + race tests for paused state rejection | Draft integrity breach if bypassed | Feature-flag off and revert policy commit | 2026-05-XX |
| Phase 1 - Integrity | Add idempotency keys for runtime mutations | Draft Backend | not_started | Key format not standardized | Request metadata standard (sessionId + action + expectedOverall) | Duplicate-submit tests pass | Duplicate picks/events | Disable idempotency enforcement flag and revert |  |
| Phase 1 - Integrity | Add authoritative mutation lock by draftSessionId | Platform + Draft Backend | not_started | Lock backend target undecided | Redis/advisory lock decision | Concurrency race suite green | Deadlocks or lock starvation | Disable lock path and revert to current transaction-only mode |  |
| Phase 1 - Integrity | Add DB uniqueness constraints for queue/pick integrity | DB + Draft Backend | not_started | Migration windows not scheduled | Migration dry run in staging | Migration + data backfill checks pass | Write failures if dirty data exists | Roll back migration and restore snapshot |  |
| Phase 1 - Integrity | Normalize AF Pro AI entitlement across draft AI routes | Backend + Monetization | not_started | Policy exceptions unresolved | Single entitlement rule document approved | Entitlement route matrix tests green | Revenue leakage or user lockout | Revert to previous entitlement resolver |  |
| Phase 1 - Integrity | Add missing race-condition tests | QA + Draft Backend | not_started | Scenario matrix incomplete | Test matrix finalized | Required race suite green | Hidden runtime corruption under concurrency | Revert risky changes and freeze release |  |
| Phase 2 - Sleeper Parity | Implement timer-after-trade parity behavior | Draft Backend | not_started | Timer policy not finalized | Trade policy ratified | Trade-accept vs timer-expiry tests green | User-visible parity mismatch | Feature flag fallback to current timer behavior |  |
| Phase 2 - Sleeper Parity | Validate undo-pick parity behavior | Draft Backend + QA | not_started | None | Lock + idempotency foundation complete | Undo vs autopick tests green | Pointer drift or stale state | Disable undo mutations temporarily |  |
| Phase 2 - Sleeper Parity | Validate queue editing while paused/on-clock boundaries | Draft Backend + Frontend | not_started | None | Pause hard-stop merged | Queue stale edit tests green | User confusion and silent overwrite | Revert queue conflict enforcement |  |
| Phase 2 - Sleeper Parity | NCAA roster parity alignment | Multi-sport Rules | not_started | Source-of-truth roster templates not locked | Rules approval by product | NCAA eligibility tests green | Invalid lineup constraints | Revert template version |  |
| Phase 2 - Sleeper Parity | Soccer/Fantrax roster verification | Multi-sport Rules + Integrations | not_started | Position alias map drift | Import adapter parity review complete | Soccer eligibility tests green | Broken eligibility and draft pool | Revert mapper and fallback to prior normalization |  |
| Phase 3 - Scale | Introduce draft event stream table and writer | Platform + DB | not_started | Event schema not approved | Event envelope contract signed off | Event write/read/replay tests green | Event drift and replay mismatch | Disable event consumers and run polling-only |  |
| Phase 3 - Scale | Add realtime board updates (websocket/realtime) | Platform + Frontend | not_started | Transport decision pending | Event stream in place | Disconnect/reconnect and desync tests green | Desync between clients | Fallback to polling-only transport |  |
| Phase 3 - Scale | Batch notifications and move slow side effects async | Platform | not_started | Worker topology undecided | Event stream and queue infra ready | Notification idempotency tests green | Lost or duplicate notifications | Disable batching and restore inline path |  |
| Phase 4 - Advanced Features | Live drafted-player trading (fully transactional) | Draft Backend + DB | not_started | Trade model incomplete | Lock + idempotency + event stream complete | Trade integrity and rollback tests green | High-risk ownership corruption | Feature flag hard-off and rollback transaction path |  |

## Weekly Governance Check

- Confirm no `blocked` item is older than 5 business days without escalation.
- Confirm all `in_progress` items have a named owner and ETA.
- Confirm every `done` item has linked test evidence.
- Confirm no Phase 2 or later tasks start without Phase 1 launch gate completion.