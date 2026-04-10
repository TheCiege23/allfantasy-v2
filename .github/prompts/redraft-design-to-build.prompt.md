---
name: Redraft Design To Build
description: "Run a complete REDRAFT LEAGUE delivery pass for one subsystem: architecture spec, implementation, tests, and rollout notes in one command."
argument-hint: "Provide subsystem, target sports, constraints, acceptance criteria, and preferred scope (design-only, implement-only, or full pass)."
agent: "Redraft League Implementation Agent"
---
Run a full REDRAFT LEAGUE design-to-build workflow for the selected subsystem.

Input:
$ARGUMENTS

Execution mode:
- If input does not specify mode, default to full pass.
- Supported modes:
1. design-only
2. implement-only
3. full-pass

Required sequence for full-pass:
1. Architecture/spec phase
- Produce implementation-ready subsystem spec with:
- data model changes
- API contracts
- realtime events
- job/worker ownership
- subscription gates
- mobile UX state behavior
- Enforce strict tiering:
- Standard manual/default
- Automated all users
- AI features explicitly labeled: Requires AF Commissioner Subscription

2. Build phase
- Implement approved behavior in minimal vertical slices.
- Follow DB-first boundaries for external data integrations.
- Keep sport-specific overrides explicit (NFL, NBA, MLB, NHL, College Basketball, College Football, Soccer).
- Ensure redraft-only behavior (season reset, no keeper/dynasty carryover).

3. Verification phase
- Run typecheck and targeted tests for touched paths.
- Validate realtime events and gate checks where applicable.
- Summarize residual risk and rollback guidance.

Global constraints:
- Do not reference external fantasy platforms.
- Do not ship AI-only logic to non-subscribed leagues.
- Do not leave partial workflow updates undocumented.

Output format:
1. Scope
- Subsystem
- Sports
- Mode
- Acceptance criteria

2. Architecture/spec
- Contracts and behavior rules
- Edge cases and failure paths

3. Implementation
- Files changed
- Behavior delivered
- Gate enforcement

4. Verification
- Commands run
- Test/typecheck results
- Remaining risks

5. Rollout notes
- Migration/backfill steps
- Monitoring/alerts to watch
