# MY_RANKINGS_TASK.md
# Drop into repo root. In Cursor: @MY_RANKINGS_TASK.md implement everything step by step

## What This Builds

A full "My Rankings" page at /dashboard (visible when the My Rankings tab is clicked)
with three things:

1. **The player's AllFantasy Rank** — a tier system (T1 Dynasty → T10 Practice Squad)
   they can display and level up. Badge, XP bar, AI grade, career stats.

2. **Import flow** — platform picker (Sleeper/Yahoo/MFL/Fantrax/ESPN) + username input
   that feeds the existing LegacyUserRankCache system.

3. **League access rules** — users can only *request* to join leagues within 1 tier
   of their rank. Anyone can *invite* them to any tier.

---

## Files to Place

| File | Destination |
|---|---|
| `MyRankingsPage.tsx` | `app/dashboard/rankings/page.tsx` |
| `user-rank-route.ts` | `app/api/user/rank/route.ts` |

---

## Step 1 — Read these files first

```
app/af-legacy/page.tsx
app/af-legacy/components/OverviewReportCard.tsx
app/af-legacy/components/OverviewInsights.tsx
app/af-legacy/components/OverviewLanes.tsx
app/rankings/page.tsx
app/rankings/RankingsClient.tsx
prisma/schema.prisma               ← LegacyUserRankCache model
lib/auth.ts                        ← getServerSession pattern
app/dashboard/page.tsx             ← where My Rankings tab links
```

---

## Step 2 — Place the page file

Place `MyRankingsPage.tsx` at `app/dashboard/rankings/page.tsx`.

**Fix imports:**
The file imports from `@/app/af-legacy/components/OverviewReportCard`,
`OverviewInsights`, and `OverviewLanes`. Read those files and verify:
- The component is exported as a named export (adjust import if default)
- The component accepts no required props (pass empty props if needed)
- If a component doesn't exist yet, replace it with a placeholder `<div>`

Run: `npx tsc --noEmit` — fix all errors.

---

## Step 3 — Place the API route

Place `user-rank-route.ts` at `app/api/user/rank/route.ts`.

**Fix field names:**
Read `prisma/schema.prisma` and verify these Prisma model fields exist:
- `LegacyUserRankCache.careerTier`        (Int)
- `LegacyUserRankCache.careerTierName`    (String)
- `LegacyUserRankCache.careerLevel`       (Int)
- `LegacyUserRankCache.careerXp`          (BigInt)
- `LegacyUserRankCache.lastCalculatedAt`  (DateTime)

Also check whether `LegacyAIReport` and `LegacyImportJob` exist in schema.
If they don't exist, remove those queries and return placeholder values:
```typescript
const aiGrade   = 'B'
const aiScore   = 70
const aiInsight = 'Import your leagues to generate your AI insight.'
```

Run: `npx tsc --noEmit` — fix all errors.

---

## Step 4 — Wire the My Rankings tab on the dashboard

Read `app/dashboard/page.tsx`.

Find where the "My Rankings" quick action card or link is rendered.
It currently links to `/rankings`. Change it to link to `/dashboard/rankings`.

If the dashboard has a tab system, add Rankings as a tab that renders
the new page inline (using `import` + conditional render) OR routes to
`/dashboard/rankings` — whichever pattern the dashboard already uses.

Run: `npx tsc --noEmit` — fix all errors.

---

## Step 5 — Add league access enforcement

Read any existing league join/search routes:
- `app/api/leagues/` or `app/api/league/` — find the route that handles
  join requests or league search

Add tier enforcement to the join request endpoint:
```typescript
// When a user requests to join a league:
// 1. Fetch the user's careerTier from LegacyUserRankCache
// 2. Fetch the league's required tier (if it has one)
// 3. Only allow the join request if:
//    Math.abs(userTier - leagueTier) <= 1
// 4. Always allow: if the user received an explicit invitation

// If League model doesn't have a tier field yet, skip enforcement for now
// but add a comment: // TODO: enforce tier when League.requiredTier is added
```

---

## Step 6 — Tests

Create `__tests__/rankings-tier.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

// Tier access logic — test the math inline
function canRequestJoin(userTier: number, leagueTier: number): boolean {
  return Math.abs(userTier - leagueTier) <= 1
}

describe('League tier access', () => {
  it('allows same tier',       () => expect(canRequestJoin(5, 5)).toBe(true))
  it('allows 1 tier above',    () => expect(canRequestJoin(5, 4)).toBe(true))
  it('allows 1 tier below',    () => expect(canRequestJoin(5, 6)).toBe(true))
  it('blocks 2 tiers above',   () => expect(canRequestJoin(5, 3)).toBe(false))
  it('blocks 2 tiers below',   () => expect(canRequestJoin(5, 7)).toBe(false))
  it('clamps at tier 1',       () => expect(canRequestJoin(1, 1)).toBe(true))
  it('clamps at tier 10',      () => expect(canRequestJoin(10, 10)).toBe(true))
})
```

Run: `npx vitest run __tests__/rankings-tier.test.ts`

---

## Step 7 — Final check

```bash
npx tsc --noEmit
node scripts/smoke-check.mjs
```

---

## Visual Requirements (already built into MyRankingsPage.tsx)

- Dark bg matching dashboard theme (`#07071a`, `#0d0d1f`)
- Per-tier color glow (slate → violet → blue → green → amber → red → cyan → purple)
- Animated XP progress bar with tier color glow
- AI grade pill (A+, A, A-, B+, etc.) pulled from LegacyAIReport
- Import flow: platform picker → username input → "Build My Legacy Profile" CTA
- 10-tier ladder shown on the left sidebar
- League access rules card explains what you can/can't join
- Responsive: stacks to single column on mobile

## Constraints

- Do not duplicate OverviewReportCard, OverviewInsights, OverviewLanes — import them
- Do not change any existing af-legacy routes or components
- Do not change the /rankings page (power rankings) — that is separate
- BigInt from Prisma must be serialized as string before JSON response
- All Prisma queries in the API route must be wrapped in try/catch
