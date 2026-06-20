# Step 3D — War Room Waiver Intelligence (deterministic)

Deepens the War Room waiver recommendations for NFL + NCAAF redraft using **deterministic football
logic** over data already in the platform. NOT Chimmy, NOT an LLM, NOT AF ADP, NOT new projections,
NOT provider expansion. Builds on the existing `lib/redraft-war-room/` engine layer.

## Architecture

```
redraftWarRoomContext  ──►  redraftTeamNeedsEngine (needs / bye stacks / injuries / playoff)
        │                           │
        ▼                           ▼
redraftWaiverEngine.buildWaiverRecommendations(context, rosterId)
        │   uses ──►  redraftWaiverScoring.ts (pure scoring module, Step 3D)
        ▼
WaiverResult { recommendedAdds[], recommendedDrops[], targetPositions, riskFlags, ... }
        │
        ▼
/api/leagues/[leagueId]/redraft-war-room/waivers  ──►  RedraftWarRoomPanel (recommendation cards)
```

- **New pure module `lib/redraft-war-room/redraftWaiverScoring.ts`** — all scoring/tier/band/priority
  math, no I/O, fully unit-tested.
- **`redraftWaiverEngine.ts`** — enriched: each `WaiverAdd` now carries `recommendationScore`,
  `confidence`, `confidenceLevel`, `tier`, `explanation[]`, `faabBand`, `priorityGuidance` (existing
  fields kept for back-compat). Drop reasons unchanged. Output is empty/limited (never fabricated)
  when the free-agent pool isn't available.
- **`RedraftWarRoomPanel.tsx`** — recommendation cards: tier badge, score + confidence, FAAB band,
  priority guidance, and explanation bullets; degrades to the existing provider-limited message.

## Recommendation scoring methodology

All values bounded 0–100.

1. **valueScore** — the player's existing value signal normalized:
   - projection / ROS projection / season average → `points / positionCap × 100`
     (caps: QB 28, RB/WR/FLEX 22, TE 14, K/DST 12, default 18).
   - ADP-only → `100 × (1 − min(adp,300)/350)` (lower ADP = higher).
   - no signal → 0.
2. **recommendationScore** = `0.55·valueScore + needBoost + scarcityBoost + injuryBoost + byeBoost`,
   clamped 0–100, where:
   - needBoost: critical +25, high +15, moderate +9, else depth-weakness +6.
   - scarcityBoost: RB +8, TE +6, QB +4, WR +3.
   - injuryReplacement +8 (a starter at the position is non-healthy); byeCoverage +5 (position has a
     2+ starter bye stack).
3. **confidence** — from data quality: projection conf level (high 85 / med 68 / low 48 / none 60),
   season-avg 58, ADP 52, no-signal 22; **−20 for limited data (NCAAF / missing projections), −10
   for injury**; level = high ≥70 / medium ≥45 / low.
4. **tier** — Must Add ≥80, Strong Add ≥65, Worth Considering ≥45, Watch List ≥25, else Low Priority.
   **Capped at "Worth Considering" when confidence is low** (never a Must/Strong Add on weak data).
5. **FAAB band** — Must Add 15%+, Strong Add 10–15%, Worth Considering 5–10%, Watch List 3–5%, Low
   Priority 1–3%; bumped one band for a critical need at a scarce position. Numeric bid =
   band-midpoint × budget (legacy/compat field).
6. **priority guidance** (rolling/reverse-priority leagues) — use-now (Must Add or critical need),
   medium (Strong Add), else hold.
7. **explanation bullets** — deterministic, grounded in roster + the existing value signal (need,
   projection/ADP value, "projects above your weakest rostered X", injury replacement, bye coverage,
   scarcity, and a "limited data" note when applicable).

## NCAAF handling

Works when projections / rankings / stats are missing: recommendations still rank off ADP / season
average where present, confidence is reduced (−20) and capped to medium, a "Limited data for this
league — confidence reduced" bullet is added, and copy is sport-neutral (no NFL-only wording).

## Explicit exclusions

No Chimmy, no LLM calls, no AF ADP system, no provider syncs, no new ingestion, no projection
engines, no injury prediction, no trade recommendations. Pure deterministic football logic only.

## Files changed
- `lib/redraft-war-room/redraftWaiverScoring.ts` (new), `lib/redraft-war-room/redraftWaiverEngine.ts`
- `app/league/[leagueId]/tabs/redraft/RedraftWarRoomPanel.tsx`
- `__tests__/redraft/waiver-scoring.test.ts` (new), `__tests__/redraft-war-room.test.ts` (extended)
- `e2e/redraft-war-room-runtime.spec.ts` (extended), this doc

## Tests / validation
- Unit: `waiver-scoring` (14) + engine 3D assertions in `redraft-war-room` (tier/confidence/band/
  explanation, NCAAF confidence reduction). war-room + redraft suites **463 passed**.
- `@db` Playwright: `redraft-war-room-runtime.spec.ts` asserts the waivers tool returns adds with
  tier/score/confidence/explanation, and the War Room UI card renders them.
- eslint + tsc clean on touched files; `git diff --check` clean.
- Clean `C:\tmp` worktree build (local F: hits the known Windows-junction EISDIR).

## Safety
No production data writes, no provider syncs, no env changes. No migration (pure engine + UI).
