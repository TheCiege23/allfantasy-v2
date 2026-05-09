# AllFantasy Draft Runtime Governance Index

## Overview

- Current runtime version: v0.1-governance-baseline
- Current launch phase: Phase 1 - Integrity
- Current beta status: Not launch-ready pending Phase 1 launch gates
- Last architecture review: 2026-05-06
- Last load test date: Pending

---

## Core Governance Docs

### Architecture

- [Draft Runtime Architecture Pack](draft-runtime-architecture-pack.md)

### Implementation Tracking

- [Draft Runtime Implementation Checklist](draft-runtime-implementation-checklist.md)
- [Draft Runtime Authoritative Mutations](draft-runtime-authoritative-mutations.md) — Mutation constitution classifying every draft operation by concurrency safety requirements

### Testing and Launch Gates

- [Draft Runtime Test Matrix](draft-runtime-test-matrix.md)

### Runtime Risks

- [Draft Runtime Risk Register](draft-runtime-risk-register.md)

### Incident Operations

- [Draft Runtime Operational Playbook](draft-runtime-operational-playbook.md)

---

## Current Launch Gates

| Gate | Status | Owner | Last Verified |
|---|---|---|---|
| Pause hard-stop passes server-side tests | green | Draft Backend | 2026-05-XX |
| Manual pick vs auto-pick race test passes | in_progress | Draft Backend + QA | Pending |
| Undo vs auto-pick race test passes | pending | Draft Backend + QA | Pending |
| Trade accept vs timer expiry test passes | pending | Draft Backend + QA | Pending |
| Draft completion assigns all rosters correctly | pending | Draft Backend | Pending |
| Draft chat events appear correctly | pending | Platform + Backend | Pending |
| On-clock notification works | pending | Platform | Pending |
| AI draft tools are AF Pro gated | pending | Backend + Monetization | Pending |
| NCAA roster parity passes | pending | Multi-sport Rules | Pending |
| Soccer roster eligibility passes | pending | Multi-sport Rules + Integrations | Pending |
| p95 pick confirmation time is acceptable | pending | Platform | Pending |
| Secrets rotated and secret scanning enabled | pending | Security + Platform | Pending |

---

## Current Critical Risks

| Risk ID | Severity | Status | Mitigation |
|---|---|---|---|
| DR-002 | critical | open | Uniqueness constraints + lock + idempotency |
| DR-005 | critical | open | Atomic trade transaction and lock validation |

Reference: [Draft Runtime Risk Register](draft-runtime-risk-register.md)

---

## Current Runtime Metrics

- p95 pick confirmation latency: Pending baseline
- p99 pick confirmation latency: Pending baseline
- websocket sync latency: Pending baseline
- autopick execution latency: Pending baseline
- draft event throughput: Pending baseline
- notification delivery latency: Pending baseline
- queue update latency: Pending baseline
- draft completion reconciliation time: Pending baseline

---

## Active Draft Runtime Initiatives

### Phase 1 - Integrity

- Rotate exposed secrets
- Enforce paused pick hard-stop
- Add idempotency keys
- Add draft mutation lock
- Add DB uniqueness constraints
- Normalize AF Pro AI entitlement
- Add race-condition tests

### Phase 2 - Sleeper Parity

- Timer-after-trade behavior
- Undo pick behavior
- Queue editing while paused
- On-clock notifications
- Draft chat event reliability
- NCAA roster parity
- Soccer and Fantrax roster verification

### Phase 3 - Scale

- Add draft event stream
- Add realtime board updates
- Reduce polling to fallback
- Batch notifications
- Cache AI recommendations
- Move slow side effects off pick path

### Phase 4 - Advanced Features

- Live drafted-player trades
- AI trend-based queue recommendations
- AI roster-need analysis
- AI draft recap
- Commissioner recovery dashboard
- Full replay and debug draft timeline

---

## Incident Escalation

### Severity 1

- Corrupted draft state
- Duplicate player assignment
- Broken live draft
- Payment-affecting issue

Required action:

- Trigger global draft freeze
- Start incident command process
- Page Platform, Draft Backend, and Security

### Severity 2

- Websocket desync
- Delayed notifications
- Stuck timer
- Queue mismatch

Required action:

- Contain impacted sessions
- Execute playbook recovery flows
- Monitor integrity metrics until stable

### Severity 3

- Cosmetic board issue
- Delayed AI recommendation

Required action:

- Triage in normal incident queue
- Schedule fix in current sprint if user-facing impact persists

---

## Signoff Checklist

| Function | Signoff Owner | Status | Notes |
|---|---|---|---|
| Engineering | TBD | pending |  |
| QA | TBD | pending |  |
| Product | TBD | pending |  |
| Operations | TBD | pending |  |
| Security | TBD | pending |  |
| Commissioner Beta Group | TBD | pending |  |

---

## Governance Review Workflow

### Weekly Runtime Governance Review

**Recommended cadence:**

- **Weekly** during active implementation (Phases 1–2)
- **Twice weekly** during beta (Phase 3 launch gates)
- **Daily** during launch week (Phase 4 go/no-go)

**Suggested attendees:**

- Engineering (Draft Backend + Platform)
- QA (Test Lead)
- Product (Draft PM)
- Security (Incident Lead)
- Operations (Infrastructure + On-call)
- Commissioner beta testers (as needed for feedback on parity checklist)

**Agenda:**

1. Launch gates: green/yellow/red status per gate
2. Risk register: Severity 1 or 2 updates
3. Test results: race suite, load test, integration test passes
4. Metrics: p95/p99 latency, availability, error rate
5. Incidents: any production issues or race condition discoveries
6. Evidence: documentation of resolved gates and new evidence artifacts

---

## Required Evidence Before Phase Advancement

### Phase 1 → Phase 2 (Integrity → Sleeper Parity)

**Required status before phase transition:**

- ✓ Pause hard-stop verified (server-side rejects picks while paused)
- ✓ Race-condition suite green (all 7 race tests passing)
- ✓ Secrets rotated (all .env credentials updated, scanning enabled)
- ✓ Idempotency keys verified (duplicate requests handled safely)
- ✓ Lock strategy implemented (draft mutation lock on all writes)
- ✓ Duplicate player prevention verified (uniqueness constraints enforced)
- ✓ Rollback procedures tested (DR playbook exercises all recovery flows)

**Required evidence artifacts:**

- Linked PRs (commit SHAs with code changes)
- Linked test runs (full race suite results, no flakes)
- Linked load test screenshots (p95/p99 latency baselines)
- Linked incident simulation results (pause/undo/redo scenarios validated)

**Signoff gate:** All evidence artifacts reviewed by Engineering Lead and QA Lead. If any gate is yellow or red, provide remediation ETA before phase advance.

---

### Phase 2 → Phase 3 (Parity → Scale)

**Required status before phase transition:**

- ✓ Sleeper parity checklist green (timer-after-trade, undo, queue editing verified)
- ✓ NCAA roster parity green (roster rule alignment with NFL/NBA)
- ✓ Soccer/Fantrax parity green (import and draft flow tested)
- ✓ WebSocket architecture validated (realtime transport strategy approved)
- ✓ Realtime sync tests passing (client/server state reconciliation verified)
- ✓ Notification consistency verified (all events appear on client in correct order)
- ✓ Draft chat under concurrency verified (concurrent message delivery tested)

**Required evidence artifacts:**

- Parity audit document (linked to fixture/feature cross-checks)
- WebSocket architecture review doc (peer-reviewed design)
- Realtime sync test results (state machine validation)
- Concurrent chat test results (load scenario: 10+ concurrent messages)

**Signoff gate:** Product PM confirms parity checklist; Engineering Lead approves WebSocket design; QA signs off on concurrent tests. No phase advance without all three.

---

### Phase 3 → Phase 4 (Scale → Advanced Features)

**Required status before phase transition:**

- ✓ p95/p99 SLOs passing (pick confirmation latency within bounds)
- ✓ Concurrent draft load test passing (50+ concurrent drafts stable)
- ✓ WebSocket reconnection validated (client handles disconnect gracefully)
- ✓ Event replay validated (resume after failure restores state correctly)
- ✓ Reconciliation recovery validated (orphaned sessions cleaned up)
- ✓ Operational playbook tested (all incident scenarios executed and timed)

**Required evidence artifacts:**

- Load test results (duration, peak QPS, error rate under load)
- WebSocket failure simulation results (disconnect/reconnect cycles)
- Event replay audit (before/after state comparison)
- Reconciliation recovery runbook execution log

**Signoff gate:** Platform Lead confirms SLOs; QA Lead confirms load test reproducibility; Operations Lead confirms playbook is actionable. Go/no-go decision by Product Lead after all three confirm.

---

## Runtime Governance Signoff Table

**Track ownership and evidence for all critical draft runtime areas:**

| Area | Owner | Status | Evidence | Signoff Date |
|---|---|---|---|---|
| Draft Integrity (pause, complete) | Draft Backend Lead | pending | Pause hard-stop PR + test results | - |
| Race Safety (pick/autopick/undo/trade) | Draft Backend Lead | pending | Race suite results + replay logs | - |
| AI Entitlement (AF Pro gating) | Monetization Lead | pending | AI route audit + entitlement tests | - |
| Realtime Sync (state reconciliation) | Platform Lead | pending | Realtime sync test results | - |
| Notifications (on-clock, events) | Platform Lead | pending | Notification audit + e2e tests | - |
| Draft Chat (concurrency, ordering) | Chat Systems Lead | pending | Concurrent chat test results | - |
| Roster Assignment (roster creation) | Multi-sport Rules Lead | pending | Roster assignment tests + audit | - |
| NCAA Parity (roster rules) | Multi-sport Rules Lead | pending | NCAA parity checklist + tests | - |
| Soccer Parity (Fantrax import) | Integrations Lead | pending | Soccer parity audit + import tests | - |
| Incident Recovery (playbook, tooling) | Operations Lead | pending | Playbook execution log + timings | - |

---

## Incident Simulation Requirement

**Before beta launch, you must execute and validate these scenarios:**

1. **Timer expiration during pause**
   - Action: Pause draft; wait for timer expiry; unpause
   - Validation: Current timer value preserved, autopick triggers correctly

2. **WebSocket disconnect during pick**
   - Action: Pick submission in progress; disconnect client mid-request
   - Validation: Pick confirmed on server; client reconnects to consistent state

3. **Duplicate pick attempts**
   - Action: Submit same pick twice (network retry or double-click)
   - Validation: Second pick rejected; no duplicate player assignment

4. **Stale client submissions**
   - Action: Submit pick from 5-second-old client state (other picks happened)
   - Validation: Server detects stale overall; client refreshes state

5. **Undo during autopick**
   - Action: Undo pick while autopick loop is in flight
   - Validation: Undo succeeds; autopick respects new state; no race condition

6. **Trade acceptance during timer expiry**
   - Action: Accept trade 100ms before Sleeper clock expires
   - Validation: Trade commits; post-trade timer behavior matches Sleeper

7. **Delayed notification fan-out**
   - Action: Simulate 5-second event publish delay
   - Validation: All subscribers eventually receive event in correct order; no dups

8. **Failed roster assignment**
   - Action: Corrupt roster assignment query mid-flight
   - Validation: Draft completion aborts; transaction rolls back; league remains unfinalized

9. **Failed draft completion reconciliation**
   - Action: Complete draft; simulate reconciliation query failure
   - Validation: Reconciliation retry succeeds; no orphaned sessions; league is finalized

**Expected outcome:** All scenarios execute without data corruption, state inconsistency, or undefined behavior. Document any discovered edge cases and add regression tests.

---

## Launch Freeze Criteria

**No new runtime features may merge if any of the following conditions are true:**

```
- Severity 1 bug is open (data corruption, pick loss, etc.)
- Race-condition suite is failing (any test flaking or red)
- Draft integrity incident unresolved (pause bypass, duplicate picks, etc.)
- Reconciliation failures exceed threshold (>5 in last 24h)
- p99 pick latency exceeds SLA (>5s unauthorized, >2s authorized)
- Notification delivery falls below SLA (<99.5% in-order delivery)
- WebSocket reconnection rate exceeds threshold (>10% disconnect/reconnect in load test)
```

**Rationale:** Realtime fantasy drafts are low-latency, high-concurrency systems. Feature churn near launch introduces race conditions and cascade failures that are difficult to debug under load. Lock this period strictly after Phase 2 signoff.

**Override authority:** Product Lead + Engineering Lead + Operations Lead (all three required to waive).

---

## Platform Subsystem Evolution

**Long-term recommendation:**

Eventually your draft runtime should become a dedicated platform subsystem, similar to:

- Multiplayer gaming servers
- Real-time trading platforms
- Live auction systems

**What this means:**

- **Dedicated runtime services** (not embedded in Next.js serverless)
- **Dedicated event stream** (not poll-only; Kafka or similar)
- **Dedicated observability** (dedicated dashboards, alerts, trace sampling)
- **Dedicated incident tooling** (draft state debugger, timeline replay, pause/resume controls)
- **Dedicated QA harness** (synthetic load generation, chaos testing, state validation)

**Timeline:** Post-Phase 4. Once you launch and stabilize, migrate the draft engine to its own subsystem. This will:

- Reduce latency (dedicated resources, no serverless cold starts)
- Improve reliability (isolated blast radius)
- Enable advanced features (event replay, time-travel debugging, multi-region replication)
- Support scaling (horizontal scaling of draft services)

---

## Related Future Governance Docs

- [Draft Runtime Data Contracts](draft-runtime-data-contracts.md)
- [Draft Runtime SLO and SLA](draft-runtime-slo-sla.md)
