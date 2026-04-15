---
name: Redraft Waivers Delivery
description: "Use when delivering the REDRAFT waivers subsystem in one pass: architecture spec, implementation, verification, and rollout notes."
argument-hint: "Provide sports scope, waiver mode (FAAB/rolling/reverse/FCFS), processing windows, tie-breakers, and acceptance criteria."
agent: "Redraft League Implementation Agent"
---
Run a full-pass REDRAFT delivery for the waivers subsystem.

Input:
$ARGUMENTS

Default subsystem:
- waivers

Required outcomes:
1. Waiver claim lifecycle and states
2. FAAB and priority resolution contracts
3. Scheduled processing job ownership and retries
4. FCFS transition rules after processing windows
5. Realtime waiver-result notifications
6. Typecheck plus targeted tests

Hard constraints:
- Redraft-only behavior
- Multi-sport compatibility
- No external platform references
- AI recommendations labeled Requires AF Commissioner Subscription when present
