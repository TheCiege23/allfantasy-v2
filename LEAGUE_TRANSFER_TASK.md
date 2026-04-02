# LEAGUE_TRANSFER_TASK.md
# Drop into repo root. In Cursor: @LEAGUE_TRANSFER_TASK.md implement step by step

## What This Builds

1. **`/league-transfer`** — A 5-step commissioner tool to transfer an entire
   league from Sleeper/Yahoo/MFL/ESPN/Fleaflicker/Fantrax to AllFantasy.
   Copies league name, manager names, scoring settings, rosters, draft history,
   playoff brackets, and trade history — all 1-for-1 exact.

2. **`/api/league/transfer`** — SSE streaming API that does the actual transfer.
   GET endpoint for preview (no DB write). POST endpoint for full transfer.

3. **Tools Hub update** — Adds "League Transfer" card to `/tools-hub` under
   Featured tools with a new "Transfer" filter tab.

---

## Files to Place

| File | Destination |
|---|---|
| `LeagueTransferPage.tsx` | `app/league-transfer/page.tsx` (NEW) |
| `league-transfer-route.ts` | `app/api/league/transfer/route.ts` (NEW) |

---

## Step 1 — Read these files before touching anything

```
app/api/league/create/route.ts          ← understand how AF leagues are created
app/api/import-sleeper/route.ts         ← existing Sleeper import — don't duplicate
app/api/league/sleeper-user-leagues/route.ts
prisma/schema.prisma                    ← League, SleeperLeague, LeagueTeam, Roster
lib/auth.ts                             ← getServerSession pattern
app/tools-hub/page.tsx                  ← find this file first
```

---

## Step 2 — Place the API route

Place `league-transfer-route.ts` at `app/api/league/transfer/route.ts`.

**Critical: read prisma/schema.prisma and verify these models/fields exist:**
- `League.platform` (String)
- `League.platformLeagueId` (String)
- `League.name` (String?)
- `League.sport` (LeagueSport enum — NFL/NBA/MLB)
- `League.isDynasty` (Boolean)
- `League.starters` (Json?)
- `League.settings` (Json?)
- `LeagueTeam.leagueId`, `.externalId`, `.ownerName`, `.teamName`, `.wins`, `.losses`
- `Roster.leagueId`, `.platformUserId`, `.playerData`, `.faabRemaining`
- `MockDraft.leagueId`, `.userId`, `.rounds`, `.results`

If any field name differs from what the route uses, fix it.
If `MockDraft` doesn't exist in the schema, replace that section with a
plain JSON storage in `League.settings.draftHistory`.

Run: `npx tsc --noEmit` — fix all errors before continuing.

---

## Step 3 — Place the page

Place `LeagueTransferPage.tsx` at `app/league-transfer/page.tsx`.

The page is a 5-step wizard:
1. Platform selector (6 cards — only Sleeper available, rest "Coming Soon")
2. League ID entry + transfer options checklist
3. Preview — fetches GET /api/league/transfer?platform=sleeper&leagueId=X
4. Progress — streams POST /api/league/transfer response
5. Success — shows "View My League" button to /app/league/{id}

**Fix imports:**
- `useSession` from `next-auth/react` (verify against lib/auth.ts)
- `Link` from `next/link` ✅
- No other external dependencies

Run: `npx tsc --noEmit` — fix all errors.

---

## Step 4 — Find and update the Tools Hub

Find the tools hub page. It could be at:
  - `app/tools-hub/page.tsx`
  - `app/tools-hub/ToolsHub.tsx`
  - Or another path — search with: grep -r "Fantasy Trade Analyzer" app/

Once found, read the file to understand the exact structure:
- Is it a data array of tool objects? Or hardcoded JSX cards?
- What fields does each tool card have?
- How are filter tabs implemented?

Then make these changes using the EXACT same pattern as existing tools:

**Add tool entry (match exact field names from existing tools):**
```
Name:        "League Transfer"
Description: "Move your entire league from Sleeper, Yahoo, MFL, ESPN,
              Fleaflicker, or Fantrax to AllFantasy — rosters, draft
              history, playoffs, and manager names copied exactly."
Route:       /league-transfer
Category:    ["Legacy & Dynasty"]   ← use same categories as existing
Badge:       "Commissioner"
Icon/Emoji:  🔄
Status:      "open"
Related:     ["Power Rankings", "Legacy & Dynasty"]
```

**Add to Featured tools section** — this is a flagship commissioner feature.

**Add "Transfer" filter tab** alongside existing tabs:
  All | Trade | Waiver & Lineup | Draft | Simulate | Bracket |
  Rankings | Legacy & Dynasty | AI & Assistant | **Transfer** ← new

---

## Step 5 — Run type check and smoke check

```bash
npx tsc --noEmit
node scripts/smoke-check.mjs
```

---

## How the Transfer Works (for reference)

Sleeper API calls made during transfer:
```
GET https://api.sleeper.app/v1/league/{leagueId}           ← settings
GET https://api.sleeper.app/v1/league/{leagueId}/rosters   ← all rosters
GET https://api.sleeper.app/v1/league/{leagueId}/users     ← manager names
GET https://api.sleeper.app/v1/league/{leagueId}/drafts    ← draft list
GET https://api.sleeper.app/v1/draft/{draftId}/picks       ← draft picks
GET https://api.sleeper.app/v1/league/{leagueId}/winners_bracket
GET https://api.sleeper.app/v1/league/{leagueId}/losers_bracket
GET https://api.sleeper.app/v1/league/{leagueId}/transactions/{week}
```

Data copied 1-for-1 (exact):
- `leagueData.name` → `League.name` (exact string, no modification)
- `user.display_name` → `LeagueTeam.ownerName` (exact string, no modification)
- `leagueData.scoring_settings` → stored in `League.settings.scoringSettings`
- `leagueData.roster_positions` → `League.starters`
- Draft picks → stored in `MockDraft.results.picks`
- Bracket → stored in `League.settings.playoffBracket`
- Trades → stored in `League.settings.tradeHistory`

---

## Constraints

- Do not change app/api/import-sleeper/route.ts
- Do not change any waiver or trade engine files
- Do not use `any` or `@ts-ignore`
- The transfer route uses SSE streaming (text/event-stream)
- BigInt values must be serialized before JSON
- All Sleeper API calls in the route are server-side (no CORS issues)
- Unauthenticated requests return 401
- Duplicate league transfers return the existing league ID (no re-import)
```
