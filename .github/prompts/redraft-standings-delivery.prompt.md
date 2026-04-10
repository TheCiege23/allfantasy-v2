---
name: Redraft Standings Delivery
description: "Use when delivering the REDRAFT standings subsystem in one pass: architecture spec, implementation, verification, and rollout notes."
argument-hint: "Provide sports scope, matchup format, tie-breaker chain, update cadence, and acceptance criteria."
agent: "Redraft League Implementation Agent"
---
Run a full-pass REDRAFT delivery for the standings subsystem.

Input:
$ARGUMENTS

Default subsystem:
- standings

Required outcomes:
1. Standings calculation contracts per matchup mode
2. Tie-breaker ordering and deterministic resolution
3. Retroactive stat-correction reconciliation behavior
4. Realtime standings refresh events
5. Mobile-first standings UX states
6. Typecheck plus targeted tests

Hard constraints:
- Redraft-only behavior
- Multi-sport compatibility
- No external platform references
- AI recommendations labeled Requires AF Commissioner Subscription when present
