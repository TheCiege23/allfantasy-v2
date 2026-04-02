# TRADE_FINDER_TASK.md
# Drop into repo root. In Cursor: @TRADE_FINDER_TASK.md implement step by step

## What This Builds

1. **Full rebuild of `app/trade-finder/page.tsx`** — a league-gated AI trade
   finder with strategy controls, roster-aware targeting, PECR animation,
   trade opportunity cards, and a Partner Match tab.

2. **Tools Hub card** — adds "AI Trade Finder" to `/tools-hub` as a Featured
   tool with a new filter capability.

---

## Files to Place

| File | Destination |
|---|---|
| `TradeFinderPage.tsx` | `app/trade-finder/page.tsx` — REPLACE |

---

## Step 1 — Read these files completely before writing anything

```
app/trade-finder/page.tsx                  ← current 52-line shell to replace
app/api/trade-finder/route.ts              ← 739 lines — read the FULL Zod schema
app/api/trade-partner-match/route.ts       ← 221 lines — partner match API
lib/trade-finder/candidate-generator.ts
lib/trade-finder/score-candidate.ts
lib/trade-finder/partner-matchmaking.ts
lib/trade-finder/allowed-assets.ts
app/api/league/list/route.ts
app/api/league/roster/route.ts
app/api/league/sleeper-user-leagues/route.ts
app/waiver-ai/page.tsx                     ← league gate pattern to mirror
app/trade-evaluator/page.tsx               ← visual style reference
```

---

## Step 2 — Understand the exact API schema

The trade finder API accepts this exact Zod schema:
```typescript
{
  league_id:        string           // Sleeper league ID (required)
  user_roster_id?:  number           // locks to a specific partner's roster
  sleeper_user_id?: string           // your Sleeper user ID
  objective:        'WIN_NOW' | 'REBUILD' | 'BALANCED'
  mode:             'FAST' | 'DEEP'  // EXHAUSTIVE maps to DEEP in the API
  preset:           'NONE' | 'TARGET_POSITION' | 'ACQUIRE_PICKS' | 'CONSOLIDATE'
  target_position?: 'QB' | 'RB' | 'WR' | 'TE'   // only when preset=TARGET_POSITION
  preferredTone?:   'FRIENDLY' | 'CONFIDENT' | 'CASUAL' | 'DATA_BACKED' | 'SHORT'
}
```

The page sends `league_id` using `league.sleeperLeagueId ?? league.id`.
After reading the route, verify which field it actually uses and fix if needed.

The partner match API:
```
GET /api/trade-partner-match?leagueId={sleeperLeagueId}
```
Read the route to confirm the exact query param name.

---

## Step 3 — Place the page file

Replace `app/trade-finder/page.tsx` with `TradeFinderPage.tsx`.

**Fix these after reading the routes:**

1. `league_id` field — verify the route uses `league_id` (underscore) not `leagueId`
2. Partner match query param — read `app/api/trade-partner-match/route.ts`
   and use the exact param name it expects
3. Response shape — read what `trade-finder/route.ts` returns. The page maps:
   ```typescript
   data.opportunities ?? data.trades ?? data.results ?? []
   ```
   Update field names to match the actual response after reading the route.

4. `league.sleeperLeagueId` — read `app/api/league/list/route.ts` to find
   what field name the API uses for the Sleeper league ID. It may be:
   `platformLeagueId`, `sleeperLeagueId`, `external_league_id`, etc.
   Update the mapping in the page to match.

Run: `npx tsc --noEmit` — fix all errors before continuing.

---

## Step 4 — Fix the league gate response mapping

The league gate fetches from `/api/league/list` (or sleeper-user-leagues).
Read that route's response shape and fix this mapping in LeagueGate:
```typescript
setLeagues(Array.isArray(d.leagues ?? d.data ?? d) ? (d.leagues ?? d.data ?? d) : [])
```
The UserLeague interface maps:
```typescript
{
  id, name, platform, sport, format,
  scoring, teamCount, season, sleeperLeagueId
}
```
After reading the route, update all field names to match the actual response.

---

## Step 5 — Find and update the tools hub

Search for the tools hub page:
```bash
grep -r "Fantasy Trade Analyzer" app/ --include="*.tsx" --include="*.ts" -l
grep -r "Mock Draft Simulator" app/ --include="*.tsx" --include="*.ts" -l
```

Read the found file completely. Understand the exact structure:
- Is it an array of tool objects? Or hardcoded JSX?
- What fields does each card have? (name, description, href, category, etc.)

Add "AI Trade Finder" using the EXACT same pattern as existing tools:
```typescript
{
  name:        "AI Trade Finder",
  description: "AI scans your entire league to find the best available trades based on your strategy, roster needs, players on the block, and pick availability.",
  href:        "/trade-finder",
  category:    ["Trade"],      // match the exact category format
  badge:       "AI-Powered",   // if badges exist in the data structure
  featured:    true,
  related:     ["Fantasy Trade Analyzer", "Waiver Wire Advisor"],
}
```

Place it in:
- Featured tools section (top 4 tools)
- All tools list under the "Trade" filter tab

If the tools hub uses a hardcoded array, append the entry to the array.
If it uses JSX components, add a matching JSX card.
Do NOT restructure the existing tools — only add the new one.

---

## Step 6 — Verify all interactions work

Start dev server: `npm run dev`
Navigate to: `http://localhost:3000/trade-finder`

Check:
- [ ] League gate renders with league cards
- [ ] Selecting a league loads the finder UI
- [ ] "Find Trades" and "Partner Match" tabs switch correctly
- [ ] Win Now / Rebuild / Balanced pills single-select
- [ ] Focus preset chips work (Any deselects others)
- [ ] Target Position shows QB/RB/WR/TE sub-chips when selected
- [ ] Position Needs checkboxes multi-select
- [ ] Players I'd Trade checkboxes toggle
- [ ] AI Depth Quick/Deep/Full buttons single-select
- [ ] Advanced Options toggle expands/collapses
- [ ] Min fairness slider moves 0-80
- [ ] Tone dropdown changes value
- [ ] "⚡ Find Trades" button calls API with correct body
- [ ] PECR animation phases progress while loading
- [ ] Trade cards render with give/get sides, verdict badge, AI summary
- [ ] "Send to Analyzer" navigates to /trade-evaluator with query params
- [ ] "🔖 Save" button saves to savedOpps state
- [ ] "Change League" resets to league gate
- [ ] Partner Match tab loads partners from API
- [ ] Compatibility rings render per partner
- [ ] "Find Trades with [Name]" locks to that partner and runs finder

Navigate to `http://localhost:3000/tools-hub`
- [ ] "AI Trade Finder" card appears in Featured section
- [ ] Card appears in the "All" tab and "Trade" filter tab

---

## Step 7 — Final checks

```bash
npx tsc --noEmit
node scripts/smoke-check.mjs
```

Commit only:
```
app/trade-finder/page.tsx
app/tools-hub/page.tsx  (or wherever tools hub lives)
```

```
git add app/trade-finder/page.tsx
git add <tools-hub-file>
git commit -m "feat: rebuild AI trade finder with league gate, strategy controls, partner match, and PECR animation"
```

---

## Visual Design (already implemented in TradeFinderPage.tsx)

**Strategy pills:**
- Win Now = red `#ef4444`
- Rebuild = blue `#60a5fa`
- Balanced = cyan `#06b6d4`

**Verdict badges on trade cards:**
- SMASH  = green `#10b981`, 5 dots
- ACCEPT = green `#34d399`, 4 dots
- LEAN   = yellow `#fbbf24`, 3 dots
- FAIR   = yellow `#fbbf24`, 3 dots
- DECLINE = red `#ef4444`, 1 dot

**Trade card layout:**
- Red-tinted left panel: "You Give" assets
- Green-tinted right panel: "You Get" assets
- Partner name + record + objective chip below
- Italic AI summary with colored left border
- Value delta + fairness score
- "Send to Analyzer →" and "🔖" save buttons

**Partner match cards:**
- SVG circular compatibility ring (green ≥7, yellow ≥5, red <5)
- Manager name + record + objective pill
- "Why they'd trade" italic text
- Shared needs as violet chips
- "Find Trades with [Name] →" button

---

## Constraints

- Do NOT change app/api/trade-finder/route.ts
- Do NOT change app/api/trade-partner-match/route.ts
- Do NOT change lib/trade-finder/ files
- The API accepts 'FAST' or 'DEEP' only — 'EXHAUSTIVE' maps to 'DEEP' in the page
- Use `league.sleeperLeagueId ?? league.id` for `league_id` in the API body
  (update if the actual field name differs after reading the route)
- No `any` or `@ts-ignore`
- No new npm dependencies
