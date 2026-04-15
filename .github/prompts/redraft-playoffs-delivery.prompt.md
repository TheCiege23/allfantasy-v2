---
name: Redraft Playoffs Delivery
description: "Use when delivering the REDRAFT playoffs subsystem in one pass: architecture spec, implementation, verification, and rollout notes."
argument-hint: "Provide sports scope, playoff size, seeding logic, odd-team policy (7/9), bracket rules, and acceptance criteria."
agent: "Redraft League Implementation Agent"
---
Run a full-pass REDRAFT delivery for the playoffs subsystem.

Input:
$ARGUMENTS

Default subsystem:
- playoffs

Required outcomes:
1. Playoff qualification and seeding contracts
2. Bracket generation and round advancement logic
3. Odd-team handling for 7-team and 9-team formats
4. Tie/forfeit edge-case handling
5. Realtime bracket update events
6. Typecheck plus targeted tests

Hard constraints:
- Redraft-only behavior
- Multi-sport compatibility
- No external platform references
- AI recommendations labeled Requires AF Commissioner Subscription when present
