# AI Wiring Verification Matrix

Date: 2026-03-19

Scope:
- Trade analysis, waivers, league storyline/intelligence, draft + mock draft, Chimmy chat,
  rankings + league rankings + post-draft style outputs, bracket AI, tools hub surfaces.
- Validation type: static wiring verification (frontend route references to backend handlers),
  plus targeted precision checks for mock/sample fallbacks and contract mismatches.

Runtime note:
- This matrix validates wiring and backend presence by code inspection.
- Authenticated, live API execution was not run in this pass.

## Summary

| Family | Frontend Wiring | Backend Route Presence | Precision Risk | Status |
|---|---|---|---|---|
| Trade Evaluator | Yes | Yes | Low | PASS |
| App Trade Builder | Yes | Yes | Medium (asset-balance metric is heuristic) | PASS* |
| Waiver AI | Yes | Yes | Low | PASS |
| Chimmy / AI Chat | Yes | Yes | Low | PASS |
| Rankings / League Rankings | Yes | Yes | Low (after mock removal) | PASS |
| Draft / Mock Draft AI | Yes | Yes | Low | PASS |
| League Storyline / Intelligence | Yes | Yes | Medium (depends on upstream data quality) | PASS* |
| Bracket AI | Yes | Yes | Low (no silent mock fallback now) | PASS |
| Tools Hub (screenshotted tools) | Yes | Yes | Low | PASS |

## Family Checks

### 1) Trade analysis
- Frontend: `app/trade-evaluator/page.tsx` -> `/api/trade-evaluator`
- Backend: `app/api/trade-evaluator/route.ts`
- Legacy trade surfaces: `app/af-legacy/page.tsx` -> `/api/legacy/trade/*`
- Backend present: `app/api/legacy/trade/**/route.ts`
- Status: PASS

### 2) App Trade Builder (rewired)
- Frontend:
  - `components/app/trade/TradeBuilder.tsx` now loads live managers via
    `/api/legacy/trade/league-managers?league_id=...`
  - Reads current roster via `/api/league/roster?leagueId=...`
  - Submits proposals via `/api/trade/propose`
- Backend:
  - `app/api/legacy/trade/league-managers/route.ts`
  - `app/api/league/roster/route.ts`
  - `app/api/trade/propose/route.ts`
- Status: PASS*
- Remaining caveat: in-app "Asset balance" score is intentionally lightweight (count-based),
  not the full analyzer fairness model.

### 3) Waiver AI
- Frontend: `app/waiver-ai/page.tsx` -> `/api/waiver-ai`
- Backend: `app/api/waiver-ai/route.ts`
- Additional waiver paths in legacy/app routes were validated to existing handlers.
- Status: PASS

### 4) Chimmy / AI Chat
- Frontend:
  - `app/chimmy/page.tsx`
  - Legacy/app links to chat tab and chat routes
- Backend:
  - `app/api/ai/chimmy/route.ts`
  - `app/api/chat/chimmy/route.ts`
  - `app/api/legacy/chat/route.ts`
- Status: PASS

### 5) Rankings / league rankings / outlook
- Frontend: `app/rankings/RankingsClient.tsx` -> `/api/rankings`, `/api/dynasty-outlook`
- Backend:
  - `app/api/rankings/route.ts`
  - `app/api/dynasty-outlook/route.ts`
- Precision fix applied: removed sample/mock league fallback from rankings client.
- Status: PASS

### 6) Draft + mock draft AI
- Frontend references to `/api/mock-draft/*` and related draft endpoints validated.
- Backend examples:
  - `app/api/mock-draft/ai-pick/route.ts`
  - `app/api/mock-draft/predict-board/route.ts`
  - `app/api/draft/recommend/route.ts`
  - `app/api/leagues/[leagueId]/draft/ai-pick/route.ts`
- Status: PASS

### 7) League storyline/intelligence
- Frontend references and components in league-intelligence surfaces mapped to existing routes.
- Backend examples:
  - `app/api/intelligence/global/route.ts`
  - `app/api/leagues/[leagueId]/graph-insight/route.ts`
  - `app/api/leagues/[leagueId]/relationship-map/route.ts`
- Status: PASS*
- Caveat: quality depends on freshness/completeness of league data sources.

### 8) Bracket AI
- Frontend: bracket AI coach/intel components map to `/api/bracket/*` routes.
- Backend examples:
  - `app/api/bracket/ai-assist/route.ts`
  - `app/api/bracket/intelligence/story/route.ts`
  - `app/api/bracket/intelligence/win-probability/route.ts`
- Precision fix applied: provider selector no longer silently falls back to mock when no
  providers are configured.
- Status: PASS

### 9) Tools Hub (from screenshots)
- Frontend:
  - `app/tools-hub/page.tsx`
  - `app/tools/[tool]/page.tsx`
  - `app/tools-hub/ToolsHubClient.tsx`
- Source config:
  - `lib/seo-landing/config.ts`
  - `lib/tool-hub/*`
- All shown tool open links resolve to existing pages/routes in current workspace.
- Status: PASS

## Fixes Applied In This Audit

1. Removed mock/sample rankings content:
   - `app/rankings/RankingsClient.tsx`

2. Removed silent bracket mock fallback in provider selection:
   - `lib/brackets/providers/index.ts`

3. Fixed trade submit API mismatch + payload contract:
   - `components/app/trade/useTradeBuilder.ts`

4. Prevented stale analyzer UI sections on fallback responses:
   - `components/DynastyTradeForm.tsx`

5. Rewired app trade builder to real manager/roster/pick data:
   - `components/app/trade/TradeBuilder.tsx`
