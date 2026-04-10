---
name: Redraft AI Delivery
description: "Use when delivering REDRAFT AI features in one pass with entitlement gates: architecture spec, implementation, verification, and rollout notes."
argument-hint: "Provide sports scope, target AI modules (draft, lineup, waivers, trades, insights, CHIMMY), gating rules, and acceptance criteria."
agent: "Redraft League Implementation Agent"
---
Run a full-pass REDRAFT delivery for AI modules.

Input:
$ARGUMENTS

Default subsystem:
- ai

Required outcomes:
1. AI feature contracts by module
2. Requires AF Commissioner Subscription gate checks on every AI entry point
3. Non-subscriber fallback behavior and upsell flow
4. Reasoning and confidence output requirements
5. Realtime AI suggestion/update events where applicable
6. Typecheck plus targeted tests

Hard constraints:
- Redraft-only behavior
- Multi-sport compatibility
- No external platform references
- Keep AI modules isolated from baseline automated paths
