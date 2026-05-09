# Draft Runtime Operational Playbook

This playbook is the production incident handbook for draft runtime operations.

## 1. Global Safety Controls

### 1.1 Pause All Drafts Globally

Goal: Stop all active pick mutations quickly during incidents.

Checklist:

1. Enable global runtime freeze flag (platform config).
2. Verify pick, autopick, and timer workers reject new mutations.
3. Post operator notice to commissioner/admin channels.
4. Record incident start time and affected session IDs.

Success criteria:

- No new pick commits after freeze timestamp.
- All active sessions reflect paused/frozen state.

### 1.2 Resume Drafts After Incident

Checklist:

1. Confirm root cause is mitigated.
2. Run integrity checks for affected sessions.
3. Resume drafts in controlled batches.
4. Monitor conflict/error rate for 15 minutes.

Success criteria:

- Error rate returns to baseline.
- No integrity regressions detected.

## 2. Session Repair and Recovery

### 2.1 Repair Corrupted Session Pointer

Symptoms:

- On-clock team does not match latest committed overall.

Checklist:

1. Acquire session lock.
2. Recompute expected pointer from canonical picks.
3. Update session pointer/version atomically.
4. Emit repair event and audit entry.
5. Release lock.

Validation:

- Next on-clock resolution matches recomputed pointer.

### 2.2 Replay Draft Events

Use when realtime consumers desync or side effects fail.

Checklist:

1. Identify replay window (from event cursor/time).
2. Validate event schema for window.
3. Replay idempotently into downstream consumers.
4. Verify board/chat/notifications converge.

Validation:

- Client snapshots and event cursor checksums match.

### 2.3 Restore Missing Picks

Symptoms:

- Session pointer advanced but one pick record absent.

Checklist:

1. Freeze affected session.
2. Compare event stream vs draft_picks records.
3. Reconstruct missing pick from canonical event payload.
4. Re-run roster assignment and queue cleanup.
5. Unfreeze after validation.

Validation:

- One pick per overall, no duplicates, roster assignment complete.

## 3. Trade and Roster Recovery

### 3.1 Roll Back Trade Accept

Use when ownership integrity fails after trade acceptance.

Checklist:

1. Freeze session and lock mutations.
2. Identify trade transaction boundary/event IDs.
3. Reverse ownership mutations atomically.
4. Emit trade rollback event and audit record.
5. Validate timer and on-clock consistency.

Validation:

- Ownership state matches pre-trade snapshot.

### 3.2 Reconcile Roster Mismatches

Checklist:

1. Run roster reconciliation job for session.
2. Detect orphaned assignments and duplicate owners.
3. Repair with idempotent upsert/delete operations.
4. Emit reconciliation report to incident channel.

Validation:

- Every committed pick has exactly one valid roster assignment.

## 4. Realtime and Timer Incident Handling

### 4.1 Recover Websocket Failures

Symptoms:

- Clients show stale board or miss events.

Checklist:

1. Confirm channel health and auth validity.
2. Force reconnect from latest cursor.
3. Replay missing events from last acknowledged cursor.
4. Fallback to polling mode if channel unstable.

Validation:

- Client checksums match authoritative board state.

### 4.2 Recover Stuck Timers

Symptoms:

- Timer not advancing or not expiring.

Checklist:

1. Verify timer worker heartbeat and lock state.
2. Recompute timer from session status and pausedRemainingSeconds.
3. Reset timer end timestamp if required.
4. Trigger one automation tick under lock.

Validation:

- Timer decrements correctly and expires as expected.

### 4.3 Invalidate Stale Draft Locks

Checklist:

1. Confirm lock owner heartbeat is stale.
2. Check lock TTL expiration policy.
3. Force-release stale lock with audit record.
4. Retry blocked mutation with backoff.

Validation:

- New mutation acquires lock successfully.

## 5. Emergency Commissioner Override Flows

### 5.1 Force Pick (Controlled)

Checklist:

1. Validate commissioner authorization.
2. Acquire lock and verify expected overall/version.
3. Commit force pick transaction with audit reason.
4. Emit board/chat/notification events.

Guardrails:

- Must not bypass paused state unless emergency override mode is explicitly enabled and audited.

### 5.2 Undo Pick (Controlled)

Checklist:

1. Acquire lock.
2. Verify targeted latest pick matches expected snapshot.
3. Undo pick atomically and restore state.
4. Emit undo event and notify participants.

Guardrails:

- Reject if latest pick changed since request.

## 6. Incident Command Template

Use this template for every severity incident.

- Incident ID:
- Severity:
- Start Time (UTC):
- Commander:
- Affected Draft Sessions:
- User Impact:
- Immediate Mitigation:
- Root Cause:
- Recovery Actions:
- Validation Performed:
- End Time (UTC):
- Follow-up Tasks:

## 7. Post-Incident Exit Criteria

- Integrity checks pass for all affected sessions.
- Realtime clients match server state.
- No unresolved lock contention.
- Notifications and chat pipelines are healthy.
- Action items entered into implementation checklist and risk register.