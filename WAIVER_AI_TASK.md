# WAIVER_AI_TASK.md
# Drop into repo root. In Cursor: @WAIVER_AI_TASK.md implement step by step

## What This Builds

A fully rebuilt /waiver-ai page that:
1. Forces league selection before analysis (league gate)
2. Auto-loads roster and waiver wire for the selected league
3. Three-column layout: My Roster | Waiver Wire | AI Analysis Panel
4. All buttons work: filter tabs, queue/remove, drop target, analyze, refresh, change league
5. PECR phase animation during analysis
6. Visual style matches /trade-evaluator exactly

---

## File to Place

| File | Destination |
|---|---|
| `WaiverAIPage.tsx` | `app/waiver-ai/page.tsx` — REPLACE the existing file |

---

## Step 1 — Read these files first

```
app/waiver-ai/page.tsx                          ← current page to replace
app/api/waiver-ai/route.ts                      ← main analysis API (653 lines)
app/api/waiver-ai-suggest/route.ts              ← quick suggestions (109 lines)
app/api/league/list/route.ts                    ← user league list
app/api/league/sleeper-user-leagues/route.ts    ← Sleeper-specific leagues
app/api/league/roster/route.ts                  ← roster for a league
lib/waiver-engine/waiver-types.ts               ← WaiverSide, WaiverSuggestion types
lib/waiver-engine/waiver-scoring.ts             ← WaiverCandidate, ScoredWaiverTarget
lib/waiver-engine/index.ts                      ← exports
prisma/schema.prisma                            ← League, SleeperLeague models
lib/auth.ts
```

---

## Step 2 — Align API request body

Read app/api/waiver-ai/route.ts completely.
Find its Zod schema or manual request parsing.
The page sends:
```typescript
{
  format, sport, waiverType, currentWeek,
  totalFaab, myFaabRemaining, leagueId,
  myTeam: { starters: [...], bench: [...] },
  waiverPool: [{ name, position, team, ownership, projected, dropPlayer }]
}
```
Update field names in WaiverAIPage.tsx to exactly match what the API expects.

---

## Step 3 — Align league list response

Read app/api/league/list/route.ts and sleeper-user-leagues/route.ts.
The page tries both: `data.leagues ?? data.data ?? data`.
Verify which field name the actual API returns and update the mapper.

The page maps league fields:
```typescript
{
  id, name, platform, sport, format, scoring,
  teamCount, season, waiverType, totalFaab, myFaab, week
}
```
After reading the route, update these field names to match the actual response.

---

## Step 4 — Align roster response

Read app/api/league/roster/route.ts.
The page maps:
```typescript
{
  id, name, position, team, projectedPts,
  injuryStatus, isStarter
}
```
Update field names to match the actual roster API response.

---

## Step 5 — Align wire suggestions response

Read app/api/waiver-ai-suggest/route.ts.
The page maps:
```typescript
{
  id, name, position, team, ownership,
  projectedPts, aiScore, reason, faabLow, faabHigh
}
```
Update field names to match the actual suggestions response.

---

## Step 6 — Place the file

Replace app/waiver-ai/page.tsx with WaiverAIPage.tsx.

Run: npx tsc --noEmit
Fix all TypeScript errors:
- If useSession import path differs, update it
- If any Position type doesn't match waiver-types.ts, align it
- If WaiverCandidate from waiver-scoring.ts has different fields, don't
  import it — the page uses its own local types to avoid coupling

---

## Step 7 — Verify all buttons work

Start dev server: npm run dev
Navigate to: http://localhost:3000/waiver-ai

Test:
- [ ] League cards appear and are clickable
- [ ] Selecting a league loads roster in left panel
- [ ] Selecting a league loads wire players in center
- [ ] Position filter tabs filter center panel (client-side, no API call)
- [ ] "+ Queue" adds player to right panel claim queue
- [ ] Queued player shows "✓ Queued" (disabled)
- [ ] "✕" removes player from queue
- [ ] Drop target dropdown shows bench players from roster
- [ ] "⚡ Analyze My Waivers" calls /api/waiver-ai
- [ ] PECR phase animation shows while loading
- [ ] Results appear in right panel after analysis
- [ ] "⟳ Refresh Wire" re-fetches suggestions
- [ ] "Change League" resets to league gate
- [ ] Week dropdown updates week number
- [ ] FAAB input is editable

---

## Step 8 — Final checks

```bash
npx tsc --noEmit
node scripts/smoke-check.mjs
```

---

## Visual Reference

Dark theme matching /trade-evaluator:
- bg: #07071a / cards: #0c0c1e
- Green accent #10b981 for add/queue/analyze
- Red accent #ef4444 for drop/remove
- Yellow #fbbf24 for moderate AI scores
- Borders: border-white/8, rounded-2xl
- Sticky header with backdrop-blur

AI Score rings:
- 8-10 = green ring (#10b981)
- 5-7  = yellow ring (#fbbf24)
- 1-4  = red ring (#ef4444)

Position badges:
- QB = red tint
- RB = green tint
- WR = blue tint
- TE = orange tint
- K/DEF = gray/purple

Injury badges:
- OUT = solid red
- Q   = solid yellow
- D   = solid orange
- IR  = solid gray

---

## Constraints

- Do NOT change any API routes or waiver engine files
- Do NOT use any or @ts-ignore — fix actual types
- Do NOT add new npm dependencies — uses only React hooks and fetch
- Keep the URL /waiver-ai (do not change routing)
- useSession from next-auth/react for auth (read lib/auth.ts to confirm)
- If league list returns no data, show the empty state with import link
