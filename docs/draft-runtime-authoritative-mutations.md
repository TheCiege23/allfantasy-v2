# Draft Runtime Authoritative Mutations

**Status**: Constitution document (v1.0 — May 6, 2026)  
**Purpose**: Classify every draft mutation path by concurrency safety requirements  
**Authority**: Governs all Phase 1–4 implementation decisions

---

## Mutation Constitution

Every mutation against authoritative draft state must satisfy these questions:

1. **Does it mutate authoritative state?** (DraftSession, DraftPick, DraftQueue, DraftPickTradeProposal, RosterAssignment)
2. **Does it require locking?** (draft mutation lock on all writes)
3. **Does it require idempotency?** (request deduplication + transaction retry)
4. **Does it require replayability?** (event sourcing + audit trail)
5. **Does it introduce new events?** (event catalog entry required)
6. **Does it require new observability?** (runtime metric addition)
7. **Does it affect launch gates?** (test matrix update)
8. **Does it change SLO behavior?** (SLA document update)
9. **Does it create a new recovery scenario?** (operational playbook section)
10. **Does it need a new incident simulation?** (governance review requirement)

---

## Tier 1: Authoritative Mutations (Full Protection Required)

These mutations are transactional, must be replayed, locked, versioned, and idempotent.

### Pick Submission (Manual)

**Operation**: User selects player during their turn  
**Service**: `PickSubmissionService.submitPick()`  
**Route**: `POST /api/leagues/[leagueId]/draft/pick`

**Requirements**:
- ✓ Full draft mutation lock (prevents concurrent picks on same session)
- ✓ Version check (expectedOverall stale detection)
- ✓ Idempotency key (same request retried = same result)
- ✓ Transaction boundary (all-or-nothing commit)
- ✓ Audit trail (DraftPick record + event emit)
- ✓ Replayable (can reconstruct state from event log)
- ✓ Recovery procedure (orphaned pick repair in operational playbook)

**Rationale**: Core draft action; race conditions cause duplicate player assignment (data corruption). Must be serialized.

**Phase 1 Gate**: "Manual pick vs auto-pick race test passes"

---

### Autopick Execution (Expired Timer)

**Operation**: Timer expires; system auto-picks from queue  
**Service**: `ExpiredPickService.processExpiredDraftPicks()`  
**Trigger**: Cron job + explicit pick endpoint poll

**Requirements**:
- ✓ Full draft mutation lock
- ✓ Freshness check (draft not paused, timer really expired)
- ✓ Idempotency (same expired pick processed once)
- ✓ Transaction boundary
- ✓ Audit trail (DraftPick + event)
- ✓ Replayable
- ✓ Recovery procedure (expired pick replay/repair)

**Rationale**: Server-driven action during user absence. Race with manual pick or undo is common.

**Phase 1 Gate**: "Autopick execution latency acceptable"

---

### Autopick Execution (Slow Draft Queue)

**Operation**: Slow draft tick; auto-pick from queue if eligible  
**Service**: `SlowDraftRuntimeService.tryQueueAutoPick()`  
**Trigger**: Timer interval per league

**Requirements**:
- ✓ Full draft mutation lock
- ✓ Freshness check (queue entry not already processed)
- ✓ Idempotency (idempotency key per queue entry)
- ✓ Transaction boundary
- ✓ Audit trail (DraftPick + event)
- ✓ Replayable
- ✓ Recovery procedure (queue autopick replay)

**Rationale**: Background automation. Must not duplicate picks or skip queue entries.

**Phase 1 Gate**: "Queue autopick race test passes"

---

### Undo Pick

**Operation**: Commissioner or user undoes their last pick  
**Service**: `DraftSessionService.undoPick()`  
**Route**: `POST /api/leagues/[leagueId]/draft/controls` (commissioner only)

**Requirements**:
- ✓ Full draft mutation lock
- ✓ Version check (draft not completed, undo allowed by rules)
- ✓ Idempotency (same undo request = same state)
- ✓ Transaction boundary (delete DraftPick + revert session state)
- ✓ Audit trail (UndoEvent + previous pick recovery log)
- ✓ Replayable (can reconstruct from event log)
- ✓ Recovery procedure (undo rollback if race detected)

**Rationale**: Alters pick history. Race with autopick or another undo must be serialized.

**Phase 1 Gate**: "Undo vs auto-pick race test passes"

---

### Pause/Resume Session

**Operation**: Commissioner pauses draft; later resumes  
**Service**: `DraftSessionService.pause()` / `DraftSessionService.resume()`  
**Route**: `POST /api/leagues/[leagueId]/draft/controls`

**Requirements**:
- ✓ Full draft mutation lock (prevents resume while pick in flight)
- ✓ Version check (draft status transitioning correctly)
- ✓ Idempotency (idempotent pause/resume)
- ✓ Transaction boundary (update DraftSession)
- ✓ Audit trail (PauseEvent / ResumeEvent)
- ✓ Replayable (timestamp frozen; autopick respects state)
- ✓ Recovery procedure (pause during mutation repair)

**Rationale**: Changes draft state machine. Paused drafts must hard-reject all pick submissions.

**Phase 1 Gate**: "Pause hard-stop verified (server-side rejects picks while paused)"

---

### Trade Acceptance

**Operation**: User accepts waiver/trade proposal  
**Service**: `TradeProposalService.acceptTrade()` (to be implemented Phase 3)  
**Route**: `POST /api/leagues/[leagueId]/draft/trades/[tradeId]/accept`

**Requirements**:
- ✓ Full draft mutation lock (atomic swap)
- ✓ Version check (trade not expired, trade state valid)
- ✓ Idempotency (accept same trade twice = single acceptance)
- ✓ Transaction boundary (swap rosters + mark finalized)
- ✓ Audit trail (TradeAcceptanceEvent)
- ✓ Replayable (can replay trade from event)
- ✓ Recovery procedure (trade rollback if both sides corrupted)

**Rationale**: Modifies roster state. Timer expiry race is common (user clicks accept 100ms before timer expires).

**Phase 2 Gate**: "Trade accept vs timer expiry test passes"

---

### Draft Completion & Roster Assignment

**Operation**: Commissioner finalizes draft; rosters assigned  
**Service**: `DraftCompletionService.completeDraft()`  
**Route**: `POST /api/leagues/[leagueId]/draft/complete`

**Requirements**:
- ✓ Full draft mutation lock (atomic finalization)
- ✓ Version check (all picks made, no orphaned entries)
- ✓ Idempotency (complete same draft twice = safe)
- ✓ Transaction boundary (finalize all rosters in one commit)
- ✓ Audit trail (DraftCompletionEvent + RosterAssignmentEvents)
- ✓ Replayable (can reconstruct roster from pick + trade history)
- ✓ Recovery procedure (completion repair + reconciliation)

**Rationale**: Final state transition. Corruption here cascades to entire league. Requires full reconciliation.

**Phase 1 Gate**: "Draft completion assigns all rosters correctly"

---

### Roster Reconciliation (Failed Completion)

**Operation**: Rebuild rosters if completion detected orphaned entries  
**Service**: `DraftReconciliationService.reconcileRosters()`  
**Trigger**: Completion failed; manual admin repair; nightly verification

**Requirements**:
- ✓ Full draft mutation lock
- ✓ Version check (detect corruption: duplicate picks, orphaned entries)
- ✓ Idempotency (reconcile same draft twice = same result)
- ✓ Transaction boundary (rebuild full roster state)
- ✓ Audit trail (ReconciliationEvent + before/after roster snapshots)
- ✓ Replayable (can trace back to which mutation caused corruption)
- ✓ Recovery procedure (rollback to checkpoint if reconciliation fails)

**Rationale**: Recovery flow for data corruption. Must be perfectly reproducible.

**Phase 3 Gate**: "Reconciliation recovery validated (orphaned sessions cleaned up)"

---

## Tier 2: Semi-Authoritative Mutations (Version Check Required)

These mutations modify shared state but do not race with critical paths. Require version checks but may use lighter locking.

### Queue Entry Addition/Removal

**Operation**: User adds/removes player from autopick queue  
**Service**: `DraftQueueService.addQueueEntry()` / `removeQueueEntry()`  
**Route**: `POST /api/leagues/[leagueId]/draft/queue`

**Requirements**:
- ✓ Version check (queue state valid, no duplicate entries)
- ✗ Full draft mutation lock (queue edits do not block picks)
- ✓ Idempotency (add same player twice = once)
- ✓ Transaction boundary (single queue entry commit)
- ✓ Audit trail (QueueEntryAddedEvent / RemovedEvent)
- ✗ Replayable (queue is ephemeral; can rebuild from current state)
- ✓ Recovery procedure (queue entry orphan cleanup)

**Rationale**: Queue is advisory; does not affect pick history. Safe to edit concurrently with picks.

**Phase 2 Gate**: "Queue editing while paused verified"

---

### Draft Chat Message

**Operation**: User posts message in draft chat  
**Service**: `DraftChatService.publishMessage()`  
**Route**: `POST /api/leagues/[leagueId]/draft/chat`

**Requirements**:
- ✗ Full draft mutation lock (chat is independent)
- ✓ Version check (draft not completed)
- ✓ Idempotency (same message idempotency key = once)
- ✓ Transaction boundary (single message insert)
- ✓ Audit trail (DraftChatMessage record + event)
- ✓ Replayable (can rebuild chat from event log)
- ✗ Recovery procedure (chat corruption is non-critical; can prune old messages)

**Rationale**: Chat is observational, not transactional. Idempotency prevents duplicates but full lock not required.

**Phase 1 Gate**: "Draft chat events appear correctly"

---

### Notification Delivery

**Operation**: Push on-clock or pick notification to user  
**Service**: `NotificationService.publishNotification()`  
**Trigger**: Pick committed, trade accepted, timer expiring, chat message

**Requirements**:
- ✗ Full draft mutation lock (notifications are side effects)
- ✓ Version check (notification event valid)
- ✓ Idempotency (same notification once per subscriber)
- ✓ Transaction boundary (notification record + delivery job)
- ✓ Audit trail (NotificationPublishedEvent)
- ✓ Replayable (can resend from event log)
- ✓ Recovery procedure (notification replay + delivery retry)

**Rationale**: Notifications are side effects, not authoritative. Async delivery acceptable. Must be idempotent.

**Phase 1 Gate**: "On-clock notification works"

---

## Tier 3: Read-Only / Non-Authoritative (No Lock Required)

These are reads or advisory actions. Safe without locks.

### AI Draft Recommendations

**Operation**: Get AI pick suggestions, stack consensus, ADP, etc.  
**Service**: `AIRecommendationService.getRecommendations()`  
**Route**: `GET /api/leagues/[leagueId]/draft/ai/recommendations`

**Requirements**:
- ✗ Full draft mutation lock (read-only)
- ✗ Version check (recommendations based on current state; stale is acceptable)
- ✗ Idempotency (same request may return different results)
- ✗ Transaction boundary (no mutations)
- ✗ Audit trail (optional; logging only)
- ✗ Replayable (not a mutation)
- ✗ Recovery procedure (not needed)

**Rationale**: Advisory only. Data freshness SLA is higher latency acceptable. No correctness impact.

**Phase 1 Gate**: "AI draft tools are AF Pro gated"

**Entitlement Check**: Gated behind AF Pro subscription.

---

### Draft State Poll

**Operation**: Client polls current session state, picks, queue, chat  
**Service**: `DraftEventsService.getDraftState()` / `getEvents()`  
**Route**: `GET /api/leagues/[leagueId]/draft/events`

**Requirements**:
- ✗ Full draft mutation lock (read-only)
- ✗ Version check (stale reads acceptable; client soft-reconciles)
- ✗ Idempotency (reads are naturally idempotent)
- ✗ Transaction boundary (no mutations)
- ✓ Audit trail (optional; for debugging client sync issues)
- ✗ Replayable (not a mutation)
- ✓ Recovery procedure (client-side timeout + re-poll on desync)

**Rationale**: Read-only. Client handles eventual consistency via re-polling.

**Phase 1 Gate**: "p95 pick confirmation time is acceptable"

---

### On-Clock Indicator

**Operation**: Get current timer, whose turn, time remaining  
**Service**: `DraftTimerService.getClockState()`  
**Route**: `GET /api/leagues/[leagueId]/draft/clock`

**Requirements**:
- ✗ Full draft mutation lock (read-only)
- ✗ Version check (stale acceptable; timer recalculated client-side)
- ✗ Idempotency (read-only)
- ✗ Transaction boundary (no mutations)
- ✗ Audit trail (not needed)
- ✗ Replayable (not a mutation)
- ✗ Recovery procedure (not needed)

**Rationale**: Stateless computation. Client caches and re-polls on uncertainty.

---

## Mutation Classification Decision Tree

```
Start: Is this a draft state mutation?

├─ NO → Tier 3 (Read-Only)
│
└─ YES → Does it change DraftSession, DraftPick, RosterAssignment, or TradeProposal?
    │
    ├─ NO → Tier 2 (Semi-Authoritative)
    │        └─ Examples: queue edits, chat, notifications
    │
    └─ YES → Tier 1 (Authoritative)
             ├─ Examples: pick, undo, pause, complete, roster assign
             ├─ Requirement: Full draft mutation lock
             ├─ Requirement: Version check
             ├─ Requirement: Idempotency
             ├─ Requirement: Replayability
             └─ Requirement: Recovery procedure
```

---

## Implementation Enforcement

### Code Review Checklist

Every PR touching draft runtime must include:

**For Tier 1 mutations:**
```
- [ ] Lock strategy documented (pessimistic, optimistic, CAS)
- [ ] Version check implemented (stale detection)
- [ ] Idempotency key generated and stored
- [ ] Transaction boundary verified (atomic commit)
- [ ] Event emitted to audit log
- [ ] Replayability tested (can reconstruct from event log)
- [ ] Recovery procedure added to operational playbook
- [ ] New incident simulation added (if new failure mode)
- [ ] Load test updated (if performance SLA changed)
- [ ] Observability metric added (if new latency source)
```

**For Tier 2 mutations:**
```
- [ ] Version check implemented
- [ ] Idempotency key generated
- [ ] Event emitted (if audit trail needed)
- [ ] Recovery procedure documented (if applicable)
```

**For Tier 3 reads:**
```
- [ ] SLA compliance verified (timeout, cache TTL)
- [ ] Error handling documented (fallback if unavailable)
```

---

## Evolution Rules

### Cannot Demote Tiers

A mutation cannot move from Tier 1 → Tier 2 without:
- Impact analysis on all dependent systems
- Load test showing no race conditions
- Incident review confirming no past failures
- Governance approval (Product + Engineering + QA)

### Cannot Skip Tier Requirements

A Tier 1 mutation that skips any requirement:
- Cannot merge
- Must be escalated to Platform Lead
- Requires written exception + risk mitigation

### New Mutations Default to Tier 1

Any new mutation touching draft state defaults to Tier 1 requirements until proven safe.

---

## Related Governance Docs

- [Draft Runtime Governance Index](draft-runtime-governance-index.md)
- [Draft Runtime Implementation Checklist](draft-runtime-implementation-checklist.md)
- [Draft Runtime Operational Playbook](draft-runtime-operational-playbook.md)
- [Draft Runtime Test Matrix](draft-runtime-test-matrix.md)
- [Draft Runtime Risk Register](draft-runtime-risk-register.md)
- [Draft Runtime Data Contracts](draft-runtime-data-contracts.md)

---

## Status

**Document Status**: Constitutional (locked for Phase 1 implementation)  
**Last Reviewed**: 2026-05-06  
**Next Review**: Phase 2 kickoff (after Phase 1 launch gates pass)  
**Owner**: Platform Lead  
**Approvers**: Engineering Lead, QA Lead, Security Lead
