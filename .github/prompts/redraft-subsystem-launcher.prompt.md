---
name: Redraft Subsystem Launcher
description: "Use when you want one entry prompt to launch REDRAFT delivery for draft, waivers, trades, standings, playoffs, or AI."
argument-hint: "Start with subsystem name (draft|waivers|trades|standings|playoffs|ai), then provide sports, constraints, and acceptance criteria."
agent: "Redraft League Implementation Agent"
---
Route this request to the selected REDRAFT subsystem workflow.

Input:
$ARGUMENTS

Selection rule:
- Read the first token from input as subsystem selector.
- Valid selectors:
1. draft
2. waivers
3. trades
4. standings
5. playoffs
6. ai

Behavior rule:
- If selector is provided, execute a full-pass design-to-build workflow for that subsystem using the same standards as the matching preset prompt.
- If selector is missing or invalid, return a short correction message plus usage examples.

Global requirements for all selectors:
- Redraft-only lifecycle (seasonal reset, no keepers/dynasty carryover)
- Multi-sport compatibility across NFL, NBA, MLB, NHL, College Basketball, College Football, Soccer
- No external platform references
- Strict feature-tier separation: standard/manual vs automated/all-users vs AI/subscription-gated
- Mark all AI-only behavior as Requires AF Commissioner Subscription

Output format:
1. Selected subsystem
2. Scope and acceptance criteria
3. Architecture/spec contracts
4. Implementation changes
5. Verification results
6. Rollout notes and residual risks

Usage examples:
- draft nfl,nba snake 60-second timer autopick from team rankings acceptance: no skipped picks
- waivers all-sports faab daily-processing 3am-utc tie-break=lower-standings acceptance: deterministic winners
- ai nfl,nba modules=lineup,waivers,trades gate=commissioner-subscription acceptance: gated endpoints and fallback upsell
