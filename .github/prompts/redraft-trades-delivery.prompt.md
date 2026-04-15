---
name: Redraft Trades Delivery
description: "Use when delivering the REDRAFT trades subsystem in one pass: architecture spec, implementation, verification, and rollout notes."
argument-hint: "Provide sports scope, veto model (commissioner vote/league vote/no veto), trade deadline rules, and acceptance criteria."
agent: "Redraft League Implementation Agent"
---
Run a full-pass REDRAFT delivery for the trades subsystem.

Input:
$ARGUMENTS

Default subsystem:
- trades

Required outcomes:
1. Trade proposal lifecycle and state transitions
2. Veto/approval policy contracts
3. Deadline enforcement and failure responses
4. Roster updates on approval/reversal handling
5. Realtime trade-status notifications
6. Typecheck plus targeted tests

Hard constraints:
- Redraft-only behavior
- Multi-sport compatibility
- No external platform references
- AI recommendations labeled Requires AF Commissioner Subscription when present
