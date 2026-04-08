---
name: Redraft League Spec Generator
description: "Generate a complete implementation-focused REDRAFT LEAGUE system spec with strict tiering (standard vs automated vs AF Commissioner Subscription AI) for multi-sport leagues."
argument-hint: "Provide target sports, team size, lineup cadence, scoring mode, waiver/trade preferences, playoff size/rules, and any hard constraints."
agent: "Redraft League System Architect Agent"
---
Create a complete REDRAFT LEAGUE system specification for the provided scope.

Input:
$ARGUMENTS

Hard requirements:
1. Treat this as redraft-only (seasonal reset, no keepers, no dynasty carryover).
2. Support NFL, NBA, MLB, NHL, College Basketball, College Football, and Soccer unless input explicitly narrows scope.
3. Keep strict feature separation:
- Section 2 = Standard manual/default
- Section 3 = Automated for all users
- Section 4 = AI only with label "Requires AF Commissioner Subscription"
4. Do not reference external fantasy platforms.
5. Be implementation-focused: include behavior logic, validation, state transitions, events, failure modes, and recovery paths.
6. Assume mobile-first, real-time UX.

Output structure (required):
1. Section 1: Core Redraft League Rules
2. Section 2: Standard (Non-Automated) Features
3. Section 3: Automated System Features (All Users)
4. Section 4: AI Features (Requires AF Commissioner Subscription)
5. Section 5: Multi-Sport Compatibility Requirements
6. Section 6: UX + Real-Time Behavior
7. Engineering Appendix

Engineering Appendix must include:
- Data entities/tables and key relationships
- API contracts (request/response + validation + errors)
- Realtime event contracts (event name + payload + trigger)
- Queue/job ownership and retry policy
- Entitlement gates for AF Commissioner Subscription
- Observability checklist (logs, metrics, alerts)

Policy defaults to apply unless overridden by input:
- Lineup lock model: per-player lock at game start
- Trade processing default: commissioner veto
- Waiver default: FAAB with configurable processing windows
- Odd-team playoffs: configurable byes + optional play-in mode
- AI outputs must include reasoning and confidence indicator
