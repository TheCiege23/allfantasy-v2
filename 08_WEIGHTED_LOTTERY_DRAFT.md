# Weighted Lottery Draft Order — Full Production Cursor Prompt

## FEATURE OVERVIEW
Adds NBA-style weighted lottery as a draft order option in dynasty leagues ONLY,
available in year 2+ (never for startup/new leagues). Prevents tanking by giving
all non-playoff teams a chance at the #1 pick based on their W/L record.

---

## CURSOR PROMPT

```
Read these files completely before changing anything:
  lib/draft-lottery/WeightedDraftLotteryEngine.ts
  lib/draft-lottery/standingsForLottery.ts
  lib/draft-lottery/lotteryConfigStorage.ts
  lib/draft-lottery/types.ts
  lib/draft-lottery/index.ts
  components/app/settings/DynastySettingsPanel.tsx
  app/api/leagues/[leagueId]/dynasty-settings/route.ts
  lib/draft/resolve-draft-context.ts
  prisma/schema.prisma

══════════════════════════════════════════════════════
CONTEXT: HOW WEIGHTED LOTTERY WORKS
══════════════════════════════════════════════════════

NBA-style: worse record = more lottery balls, but NOT guaranteed #1 pick.
Prevents tanking — every team plays to win.

Ball distribution (12-team, 6 playoff teams, 6 non-playoff):
  Last place: 6 balls → ~28.6% chance at #1
  Rank 2:     5 balls → ~23.8%
  Rank 3:     4 balls → ~19.0%
  ... and so on

Non-playoff teams get lottery for top N picks.
Playoff teams draft in reverse finish order (champion picks last).

DYNASTY YEAR RULE: ONLY available in year 2+ leagues.
Never for startup drafts (no standings data to base balls on).

══════════════════════════════════════════════════════
WHAT ALREADY EXISTS — DO NOT REBUILD
══════════════════════════════════════════════════════

✅ WeightedDraftLotteryEngine — full engine
✅ standingsForLottery — standings + weight calculation
✅ lotteryConfigStorage — reads/writes config to league.settings
✅ types — DraftOrderMode, WeightedLotteryConfig, all types

WHAT IS MISSING:
  1. Dynasty year guard (year 2+ only)
  2. weighted_lottery not in rookiePickOrderMethods options
  3. No lottery config UI in DynastySettingsPanel
  4. No API routes for previewing odds and running lottery
  5. No LotteryReveal UI

══════════════════════════════════════════════════════
STEP 1 — DYNASTY YEAR GUARD
══════════════════════════════════════════════════════

Create lib/draft-lottery/dynastyYearGuard.ts

export type DynastyLotteryEligibility = {
  eligible: boolean
  reason: string
  currentSeason: number | null
  isStartupLeague: boolean
}

export async function checkDynastyLotteryEligibility(
  leagueId: string
): Promise<DynastyLotteryEligibility>

Logic:
  1. Fetch league from DB (isDynasty, season, createdAt, settings)
  2. If !isDynasty: return { eligible: false, reason: 'Dynasty leagues only' }
  3. Check startup year via settings.startup_season OR
     compare currentSeason to year league was created
  4. If startup year: return { eligible: false, isStartupLeague: true,
     reason: 'Only available in year 2+ dynasty leagues. Startup leagues must use reverse standings.' }
  5. Return { eligible: true }

══════════════════════════════════════════════════════
STEP 2 — ADD weighted_lottery TO DYNASTY SETTINGS API
══════════════════════════════════════════════════════

UPDATE app/api/leagues/[leagueId]/dynasty-settings/route.ts

READ fully. Find where rookiePickOrderMethods is built.

Add checkDynastyLotteryEligibility check:
  const lotteryEligibility = await checkDynastyLotteryEligibility(leagueId)

  const rookiePickOrderMethods = [
    { value: 'reverse_standings', label: 'Reverse standings (worst first)' },
    { value: 'reverse_max_pf', label: 'Reverse Max PF' },
    { value: 'randomize', label: 'Randomized' },
    { value: 'manual', label: 'Commissioner sets manually' },
    // ONLY show for year 2+ dynasty leagues:
    ...(lotteryEligibility.eligible ? [{
      value: 'weighted_lottery',
      label: '🎱 Weighted Lottery (NBA-style, year 2+)',
    }] : []),
  ]

Add to API response:
  lotteryEligibility: {
    eligible: boolean
    reason: string
    isStartupLeague: boolean
  }

══════════════════════════════════════════════════════
STEP 3 — LOTTERY CONFIG API ROUTES
══════════════════════════════════════════════════════

Create app/api/leagues/[leagueId]/draft-lottery/config/route.ts
GET: getDraftOrderModeAndLotteryConfig(leagueId) + lotteryEligibility
PUT (commissioner): setDraftOrderModeAndLotteryConfig() after eligibility check

Create app/api/leagues/[leagueId]/draft-lottery/preview/route.ts
POST (any member): previewLotteryOdds(leagueId, config)
  Body: { config?: Partial<WeightedLotteryConfig> }
  Returns: { eligible, playoffTeamCount, message? }

Create app/api/leagues/[leagueId]/draft-lottery/run/route.ts
POST (commissioner only):
  Body: { seed?: string; confirm: boolean }
  Guard: checkDynastyLotteryEligibility
  If confirm !== true → 400
  Generate seed: `${leagueId}-${Date.now()}-${userId}`
  Call runWeightedLottery(leagueId, config, seed)
  Save result + seed to league settings
  Update DraftSession slotOrder if active session exists
  Returns: WeightedLotteryResult

══════════════════════════════════════════════════════
STEP 4 — UPDATE DynastySettingsPanel
══════════════════════════════════════════════════════

UPDATE components/app/settings/DynastySettingsPanel.tsx

READ fully first.

When rookiePickOrderMethod === 'weighted_lottery', show a subsection:

  🎱 Weighted Lottery Settings
  
  Year guard warning (if isStartupLeague):
    ⚠️ Only for established dynasty leagues (year 2+).
  
  How it works explainer:
    "Non-playoff teams receive lottery balls based on record.
     Worst teams get more balls but aren't guaranteed #1 pick."
  
  Config controls (2×2 grid):
    - Teams in lottery: [2-12 dropdown]
    - Lottery picks (top N): [1-8 dropdown]
    - Weighting method: [inverse standings / inverse PF / inverse max PF]
    - Eligibility: [non-playoff / bottom N / all teams]
  
  [Preview lottery odds →] button
    → POST /draft-lottery/preview
  
  Odds table (after preview):
    Columns: Team | Record | Balls | Odds #1
    Worst team highlighted in cyan
  
  [🎱 Run Weighted Lottery] button (after preview)
    → window.confirm("This will set draft order. Cannot be undone.")
    → POST /draft-lottery/run
    → Show LotteryReveal component on success

══════════════════════════════════════════════════════
STEP 5 — LotteryReveal COMPONENT
══════════════════════════════════════════════════════

Create components/draft/LotteryReveal.tsx

Props: { result: WeightedLotteryResult; onClose: () => void }

Modal with two reveal modes:
  A. Sequential (default): Click cards one by one to flip reveal
     Each card: [PICK {N}] face-down → click → shows team name + odds
     CSS card-flip animation: rotateY(180deg)
  
  B. Show all: Full order table immediately

After all revealed:
  Lottery picks section (cyan highlight)
  Remaining order section (reverse standings)
  Audit line: "Lottery seed: {seed.slice(0,16)}... · Auditable"
  [✓ Done] close button

══════════════════════════════════════════════════════
STEP 6 — WIRE INTO DRAFT CONTEXT
══════════════════════════════════════════════════════

UPDATE lib/draft/resolve-draft-context.ts

READ fully. Add logic:

If league.isDynasty === true
  AND settings.rookiePickOrderMethod === 'weighted_lottery'
  AND settings.draft_lottery_last_result exists
  AND NOT startup year:
  
  Use stored slotOrder from lottery result as draft order
  instead of computing from reverse standings.

══════════════════════════════════════════════════════
STEP 7 — SET startup_season ON LEAGUE CREATION
══════════════════════════════════════════════════════

UPDATE app/api/league/create/route.ts (READ first)

When creating a dynasty league:
  if (isDynasty) {
    settings.startup_season = season ?? new Date().getFullYear()
  }

══════════════════════════════════════════════════════
FILES TO CREATE/UPDATE
══════════════════════════════════════════════════════

CREATE:
  lib/draft-lottery/dynastyYearGuard.ts
  app/api/leagues/[leagueId]/draft-lottery/config/route.ts
  app/api/leagues/[leagueId]/draft-lottery/preview/route.ts
  app/api/leagues/[leagueId]/draft-lottery/run/route.ts
  components/draft/LotteryReveal.tsx

UPDATE:
  app/api/leagues/[leagueId]/dynasty-settings/route.ts
  components/app/settings/DynastySettingsPanel.tsx
  lib/draft/resolve-draft-context.ts
  app/api/league/create/route.ts

══════════════════════════════════════════════════════
FINAL STEPS
══════════════════════════════════════════════════════

1. npx tsc --noEmit — fix ALL type errors
2. git add -A
3. git commit -m "feat(dynasty-lottery): weighted lottery draft order (year 2+ only) — dynastyYearGuard, lottery config/preview/run API routes, LotteryReveal sequential card-flip, DynastySettingsPanel odds table + run button, draft context applies stored lottery result"
4. git push origin main
5. Confirm Vercel build READY
6. Report commit hash
```
