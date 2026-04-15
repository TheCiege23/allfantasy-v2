---
description: "Use when writing or updating redraft/league system specification docs. Enforce implementation-ready contracts: data model, API, realtime events, job ownership, and subscription gating."
name: "League Spec Contracts"
applyTo: "docs/**/*redraft*.md, docs/**/*league*.md, drafts/**/*redraft*.md, drafts/**/*league*.md, *REDRAFT*.md"
---

# League Spec Contracts

- Treat spec docs as build contracts, not ideation notes.
- Every feature section must include explicit behavior logic, validation rules, and edge-case handling.
- Separate feature tiers clearly:
- Standard manual/default behavior
- Automated system behavior for all users
- AI behavior gated as Requires AF Commissioner Subscription
- For every user-facing feature, include a backend contract and a UI state contract.

## Required Spec Blocks

- Data model block:
- Entities/tables affected
- Required columns and index expectations
- Relationship changes and cascade behavior

- API block:
- Endpoint/method
- Required request fields and validation
- Success response shape
- Error codes and failure handling

- Realtime block:
- Event names
- Event payload shape
- Emit conditions and subscriber targets
- Idempotency or dedupe expectations

- Automation/jobs block:
- Worker/job owner
- Trigger cadence
- Retry/backoff policy
- Dead-letter or manual recovery path

- Entitlement block (when AI is present):
- Exact AF Commissioner Subscription gate condition
- Behavior when gate fails (fallback/upsell/error)

## Quality Bar

- Include mobile-first UX states for loading, partial failure, and stale data.
- Include odd-team handling where schedules/playoffs are affected (7-team, 9-team).
- Include sport-specific overrides instead of one-size-fits-all assumptions.
