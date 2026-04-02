# TRADE_HUB_TASK.md
# Drop into repo root. In Cursor: @TRADE_HUB_TASK.md implement step by step

## What This Builds

A fully modernized AI Trade Analyzer at /trade-evaluator that:
- Replaces the existing basic UI with a visual, dark, premium interface
- Keeps the SAME backend API (app/api/trade-evaluator/route.ts unchanged)
- Adds PECR phase visualization during analysis (Planning → Pricing → Engine → AI → Check)
- Shows verdict badge, fairness score, value delta, grades, trade drivers,
  counter-offer, and negotiation playbook
- Works for all formats: Dynasty / Keeper / Redraft, all sports, all scoring

---

## Files to Place

| File | Destination |
|---|---|
| `TradeHubPage.tsx` | `app/trade-evaluator/page.tsx` — REPLACE the existing file |

---

## Step 1 — Read these files first

```
app/trade-evaluator/page.tsx            ← current page to replace
app/api/trade-evaluator/route.ts        ← backend API — DO NOT CHANGE
lib/trade-engine/gpt-input-contract.ts  ← understand verdict/driver types
lib/trade-engine/index.ts               ← understand exports
lib/hybrid-valuation.ts                 ← understand PricedAsset
lib/trade-evaluator-prompt.ts           ← understand StructuredTradeEvalResponseSchema
```

---

## Step 2 — Place the page

Replace `app/trade-evaluator/page.tsx` with `TradeHubPage.tsx`.

**Critical: align the response mapping to the actual API response shape.**

Read `app/api/trade-evaluator/route.ts` and find what fields it returns.
The response mapper in `TradeHubPage.tsx` at the bottom of `evaluate()` maps:
```typescript
const mapped: TradeResult = {
  verdict:       data.verdict ?? data.overallFairness ?? 'FAIR',
  fairnessScore: data.fairnessScore ?? data.score ?? 70,
  senderGrade:   data.senderGrade ?? data.grades?.sender ?? 'B',
  receiverGrade: data.receiverGrade ?? data.grades?.receiver ?? 'B',
  valueDelta:    data.valueDelta ?? 0,
  recommendation: data.recommendation ?? data.answer ?? data.analysis ?? '',
  ...
}
```

After reading the actual API response shape, update the field names in
the mapper to match exactly. Do not guess — read the route first.

---

## Step 3 — Verify the request body shape

The existing API route at `app/api/trade-evaluator/route.ts` expects a
specific request body. Read it and find the Zod schema or manual parsing.

The page sends this body:
```typescript
{
  sender: {
    teamName, record, isProMember,
    players: [{ name, position, team, age }],
    picks:   [{ year, round, team }],
    faab,
  },
  receiver: { ... same shape ... },
  leagueSettings: { format, qbFormat, sport, scoring, asOfDate },
}
```

If the API uses different field names (e.g. `givingPlayers` instead of
`players`, `format` as `leagueFormat`, etc.) — update the request body
in the page to match. Do not change the API.

---

## Step 4 — Handle authentication

The existing trade evaluator checks tokens/subscription via `withApiUsage`.
The new page does not need to change this. If the API returns 401 or 403,
the error state will display it correctly.

If the existing page had auth guards (e.g. redirect to login), keep them.
Read the current page.tsx to see if it has `getServerSession` or similar
and add the same pattern to the new page if needed.

---

## Step 5 — Type check

```bash
npx tsc --noEmit
```

Common errors to fix:
1. `as LeagueFormat` casts — verify the string unions match
2. `data.drivers.map(...)` — the `d` parameter needs explicit typing
3. If `useSession` is needed for auth, import from `next-auth/react`

---

## Step 6 — Visual verification

Start dev server: `npm run dev`
Navigate to: http://localhost:3000/trade-evaluator

Verify:
- [ ] Two side panels render (Sender / Receiver)
- [ ] Add Player button adds a new row
- [ ] Add Pick button adds a pick row
- [ ] League settings dropdowns work
- [ ] Evaluate Trade button is disabled when panels are empty
- [ ] Button enables when at least one player/pick/FAAB on each side
- [ ] Clicking Evaluate Trade calls the API
- [ ] Loading state shows phase progression animation
- [ ] Result shows verdict badge, scores, AI analysis
- [ ] Swap sides button swaps sender/receiver content
- [ ] Reset button clears everything

---

## Step 7 — Smoke check

```bash
node scripts/smoke-check.mjs
```

---

## What the UI shows after analysis

**Verdict badge** — SMASH ACCEPT / ACCEPT / LEAN ACCEPT / FAIR / LEAN DECLINE / DECLINE / SMASH DECLINE
Each with its own color and glow (green spectrum → yellow → red spectrum)

**Score cards** — Fairness Score (0-100), Value Delta (+ for sender, - for receiver), Confidence %

**Sender/Receiver grades** — A+, A, A-, B+, B, B-, C+, C, F

**AI Analysis** — full recommendation text from the multi-model pipeline

**Trade Drivers** — each reason the AI reached its verdict, with direction (positive/negative/neutral)
and strength (strong/moderate/weak)

**Counter-Offer** — if the verdict is DECLINE or SMASH DECLINE, shows what to counter with

**Negotiation Playbook** — step-by-step negotiation strategy

**PECR iteration count** — shown in the AI Analysis card header if > 1 iteration was needed

---

## PECR Integration Note

The existing `app/api/trade-evaluator/route.ts` is already wrapped with
PECR (if PECR_TASK.md was implemented). If it is, the response will include
`x-pecr-iterations` and `x-pecr-passed` headers. Read those headers and
display the iteration count in the UI:

```typescript
const iterations = res.headers.get('x-pecr-iterations')
if (iterations) mapped.pECRIterations = Number(iterations)
```

If PECR is not yet integrated into the trade evaluator, that's fine —
the field is optional and won't show if not present.

---

## Constraints

- Do NOT change app/api/trade-evaluator/route.ts
- Do NOT add new dependencies — uses only React hooks and fetch
- All Tailwind classes used are from the standard Tailwind base stylesheet
- No localStorage — all state lives in React component state
- The page is a client component ('use client') — no server-side data fetching
- Keep the existing URL: /trade-evaluator (do not change routing)
