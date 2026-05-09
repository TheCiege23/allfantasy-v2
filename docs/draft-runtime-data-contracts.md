# Draft Runtime Data Contracts

This document defines authoritative runtime contracts for state shared across backend, frontend, realtime, notifications, AI, and operational tooling.

## Contract Governance

- Contract versioning model: Semantic contract versioning per entity
- Compatibility rule: Backward-compatible changes allowed in minor versions only
- Breaking change policy: Requires architecture review and migration plan
- Source of truth: This file plus persisted schema definitions

---

## 1. DraftSession

Purpose:

- Canonical runtime state for session status, pointer, timer, and version.

Required fields:

- id
- leagueId
- status
- version
- currentOverall
- timerEndAt
- pausedRemainingSeconds
- createdAt
- updatedAt

Invariants:

- status must be one of created, scheduled, in_progress, paused, completed, cancelled
- currentOverall increments only after committed pick transaction
- version increments on each runtime mutation

---

## 2. DraftPick

Purpose:

- Immutable committed pick record for board and roster reconciliation.

Required fields:

- id
- draftSessionId
- overall
- round
- pickInRound
- rosterId
- playerId
- playerName
- createdAt

Invariants:

- unique per draftSessionId and overall
- one canonical winner for each overall slot

---

## 3. DraftEvent

Purpose:

- Append-only event stream for realtime sync, replay, and audit.

Required fields:

- id
- draftSessionId
- leagueId
- eventType
- payload
- idempotencyKey
- createdAt

Optional fields:

- actorUserId
- teamId
- overallPick
- round

Invariants:

- append-only writes
- idempotencyKey uniqueness by draftSessionId and action scope

---

## 4. DraftQueue

Purpose:

- User-specific draft priority queue for autopick and recommendations.

Required fields:

- id
- draftSessionId
- userId
- createdAt
- updatedAt

Invariants:

- unique per draftSessionId and userId

---

## 5. RosterAssignment

Purpose:

- Authoritative assignment of drafted player rights to roster.

Required fields:

- id
- draftSessionId
- rosterId
- playerId
- sourcePickId
- createdAt

Invariants:

- exactly one active assignment per player per draft session
- each committed pick resolves to one roster assignment

---

## 6. TradeProposal

Purpose:

- Lifecycle of draft trade proposals and accepted ownership transitions.

Required fields:

- id
- draftSessionId
- proposedByUserId
- status
- proposedAt
- payload

Invariants:

- status transitions must be valid and auditable
- accepted proposal mutations are atomic with ownership updates

---

## 7. NotificationEvent

Purpose:

- Runtime event envelope for user alerts and on-clock signals.

Required fields:

- id
- userId
- eventType
- payload
- dedupeKey
- createdAt

Invariants:

- dedupeKey prevents duplicate user-visible notifications for same event

---

## 8. AIRecommendation

Purpose:

- Cached recommendation artifacts used by draft assistants and queue workflows.

Required fields:

- id
- draftSessionId
- userId
- contextVersion
- recommendationPayload
- createdAt
- expiresAt

Invariants:

- recommendation must include contextVersion tied to draftSession version
- expired recommendations cannot be served as fresh results

---

## 9. CommissionerAction

Purpose:

- Auditable operational actions such as pause, resume, undo, force pick, and overrides.

Required fields:

- id
- draftSessionId
- actionType
- actorUserId
- reason
- payload
- createdAt

Invariants:

- all privileged runtime mutations produce a commissioner action audit record

---

## Contract Drift Controls

- Every schema mutation must update this document in the same pull request.
- Runtime contract tests must validate required fields and invariants.
- Any drift found in production must be logged as a risk register entry.
