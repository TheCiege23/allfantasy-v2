---
name: Redraft Draft Delivery
description: "Use when delivering the REDRAFT draft subsystem in one pass: architecture spec, implementation, verification, and rollout notes."
argument-hint: "Provide sports scope, draft type rules, timer rules, auto-pick policy, and acceptance criteria."
agent: "Redraft League Implementation Agent"
---
Run a full-pass REDRAFT delivery for the draft subsystem.

Input:
$ARGUMENTS

Default subsystem:
- draft

Required outcomes:
1. Draft room lifecycle contracts
2. Pick timer and timeout behavior
3. Auto-pick ranking fallback logic
4. Realtime draft board updates
5. Mobile-first draft UX states
6. Typecheck plus targeted tests

Hard constraints:
- Redraft-only behavior
- Multi-sport compatibility
- No external platform references
- AI recommendations labeled Requires AF Commissioner Subscription when present
