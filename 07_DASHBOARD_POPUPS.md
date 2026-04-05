# Dashboard Waivers + Lineups + Trades Popups — Full Production Cursor Prompt

## FEATURE OVERVIEW
Makes all three chips on the TodayStrip interactive with lazy-loading popups:
- **Waivers**: AI waiver recommendations (league name, player to add, player to drop)
- **Lineups**: Lineup issues (empty spots, injured/out/questionable starters, illegal lineups)
- **Trades**: Pending trade offers with AI verdict (accept/decline/negotiate)

Free to view. Clicking league link to navigate is PRO gated. Auto-refreshes every 30s while open.

---

## CURSOR PROMPT

```
Read these files completely before changing anything:
  app/dashboard/components/TodayStrip.tsx
  app/dashboard/components/LineupIssuesModal.tsx
  app/dashboard/components/DashboardOverview.tsx
  app/api/lineup-check/route.ts
  app/dashboard/types.ts
  components/subscription/SubscriptionGateModal.tsx
  hooks/useSubscriptionGate.ts
  hooks/useEntitlements.ts
  lib/subscription/featureGating.ts

══════════════════════════════════════════════════════
STEP 1 — WAIVER RECOMMENDATIONS API
══════════════════════════════════════════════════════

Create app/api/dashboard/waivers/route.ts

export const dynamic = 'force-dynamic'

GET — authenticated

Logic:
  1. Get userId + sleeperUserId from session/profile
  2. Fetch user's Sleeper leagues
  3. For each league:
     - GET Sleeper trending adds
     - GET user's current roster
     - Identify top available players not on user's roster
     - Call Claude (same Anthropic SDK pattern as lineup-check):
       "League: {name}. Top waiver adds: {players}.
        In 1-2 sentences, name the best pickup and who to drop."
  4. Return: { totalLeagues, recommendations: WaiverLeagueRec[] }

export type WaiverPickup = {
  playerId: string
  playerName: string
  position: string
  team: string
  addReason: string
}
export type WaiverDrop = {
  playerName: string
  position: string
  team: string
}
export type WaiverLeagueRec = {
  leagueId: string
  leagueName: string
  leagueAvatar: string | null
  sport: string
  platform: string
  pickups: WaiverPickup[]
  drops: WaiverDrop[]
  chimmyAdvice: string
  waiverDeadline: string | null
}

Graceful fallback: empty recommendations if Sleeper API fails.

══════════════════════════════════════════════════════
STEP 2 — PENDING TRADES API
══════════════════════════════════════════════════════

Create app/api/dashboard/trades/route.ts

export const dynamic = 'force-dynamic'

GET — authenticated

Logic:
  1. Get userId + sleeperUserId
  2. Fetch Sleeper leagues
  3. For each league:
     GET https://api.sleeper.app/v1/league/{id}/transactions/{week}
     Filter: type='trade', status='proposed', one roster_id belongs to user
  4. For each trade: call Claude for verdict:
     system: 'You are Chimmy. Respond ONLY with JSON: {"verdict":"accept"|"decline"|"negotiate","reason":"1 sentence"}'
     Parse JSON, fallback to 'negotiate' + generic reason
  5. Return: { totalPending, trades: PendingTradeLeague[] }

export type TradeAsset = {
  playerId: string | null
  playerName: string
  position: string
  team: string
  isPick?: boolean
  pickRound?: string
}
export type PendingTrade = {
  transactionId: string
  proposedBy: string
  proposedAt: string | null
  assetsGiven: TradeAsset[]
  assetsReceived: TradeAsset[]
  chimmyVerdict: 'accept' | 'decline' | 'negotiate'
  chimmyReason: string
}
export type PendingTradeLeague = {
  leagueId: string
  leagueName: string
  leagueAvatar: string | null
  sport: string
  trades: PendingTrade[]
}

══════════════════════════════════════════════════════
STEP 3 — UPDATE lineup-check (add questionable/doubtful)
══════════════════════════════════════════════════════

UPDATE app/api/lineup-check/route.ts

READ fully. Currently only flags OUT/IR. Add:

  if (st === 'QUESTIONABLE') {
    issues.push({
      type: 'questionable_starter',
      message: `${p?.name} is Questionable — monitor injury report`,
      severity: 'warning',
    })
  }
  if (st === 'DOUBTFUL') {
    issues.push({
      type: 'doubtful_starter',
      message: `${p?.name} is Doubtful — strongly consider replacement`,
      severity: 'warning',
    })
  }

══════════════════════════════════════════════════════
STEP 4 — ProLeagueLink COMPONENT (PRO gated navigation)
══════════════════════════════════════════════════════

Create components/dashboard/ProLeagueLink.tsx

Props: { leagueId: string; leagueName: string; label?: string; hasProAccess: boolean }

If hasProAccess: render <Link href="/league/{leagueId}">{label}</Link>
If !hasProAccess: render button that opens SubscriptionGateModal
  Shows PRO badge: amber rounded border, "PRO" text
  On click: gate('pro_start_sit') or relevant pro featureId

══════════════════════════════════════════════════════
STEP 5 — WaiverRecommendationsModal
══════════════════════════════════════════════════════

Create app/dashboard/components/WaiverRecommendationsModal.tsx

EXACT same shell as LineupIssuesModal.
Props: { isOpen, onClose, data, loading, hasProAccess }

Per league card:
  [Avatar] [League Name + sport/platform]
  
  PICKUPS section:
    + {playerName} — {position} · {team}
    {addReason text}
  
  DROP section (if drops.length > 0):
    − {playerName} — {position} · {team}
  
  Chimmy advice bubble (cyan chip — same as LineupIssuesModal)
  
  Footer row:
    [ProLeagueLink leagueId hasProAccess]
    [→ Ask Chimmy for full waiver analysis] — dispatches af-chimmy-shortcut event

Empty: "✅ No waiver recommendations right now."
Loading: 3 skeleton rows

══════════════════════════════════════════════════════
STEP 6 — PendingTradesModal
══════════════════════════════════════════════════════

Create app/dashboard/components/PendingTradesModal.tsx

Same modal shell. Props: { isOpen, onClose, data, loading, hasProAccess }

Per trade card:
  Header: "Trade from {proposedBy}" + AI verdict badge
    accept → green, decline → red, negotiate → amber
  
  Two-column grid:
    YOU GIVE | YOU GET
    Player/pick rows with position labels
    Draft picks show year/round
  
  Chimmy reason bubble
  
  Footer: [Ask Chimmy for full analysis →] + [ProLeagueLink]

formatRelativeDate helper: "2h ago", "1d ago", "just now"
Empty: "✅ No pending trades right now."

══════════════════════════════════════════════════════
STEP 7 — UPDATE TodayStrip
══════════════════════════════════════════════════════

UPDATE app/dashboard/components/TodayStrip.tsx

READ fully. Add new props:
  waiverCount: number
  onWaiverClick: () => void
  pendingTradeCount: number
  onTradesClick: () => void

Replace static spans with interactive buttons:

Waivers chip:
  If waiverCount > 0: cyan button "📋 {N} waiver rec(s)"
  Else: muted button "📋 Check waivers"
  → both call onWaiverClick

Trades chip:
  If pendingTradeCount > 0: amber button "🔄 {N} pending trade(s)"
  Else: muted button "🔄 Check trades"
  → both call onTradesClick

══════════════════════════════════════════════════════
STEP 8 — UPDATE DashboardOverview
══════════════════════════════════════════════════════

UPDATE app/dashboard/components/DashboardOverview.tsx

READ fully. It already has lineup lazy-fetch pattern — replicate for waivers + trades.

Add:
  const { hasPro } = useEntitlements()
  
  // Waivers state + lazy fetch handler (same pattern as lineup check)
  const [waiverModalOpen, setWaiverModalOpen] = useState(false)
  const [waiverData, setWaiverData] = useState(null)
  const [waiverLoading, setWaiverLoading] = useState(false)
  const handleWaiverClick = useCallback(() => {
    setWaiverModalOpen(true)
    if (waiverData !== null) return
    // fetch /api/dashboard/waivers
  }, [waiverData])
  
  // Trades state + lazy fetch handler
  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [tradeData, setTradeData] = useState(null)
  const [tradeLoading, setTradeLoading] = useState(false)
  const handleTradeClick = useCallback(() => { ... }, [tradeData])
  
  // Auto-refresh every 30s while modal is open
  useEffect(() => {
    if (!waiverModalOpen && !tradeModalOpen) return
    const interval = setInterval(() => {
      if (waiverModalOpen) fetch('/api/dashboard/waivers')...
      if (tradeModalOpen) fetch('/api/dashboard/trades')...
    }, 30_000)
    return () => clearInterval(interval)
  }, [waiverModalOpen, tradeModalOpen])

Update TodayStrip props: pass waiverCount, onWaiverClick, pendingTradeCount, onTradesClick
Add WaiverRecommendationsModal + PendingTradesModal to return
Update LineupIssuesModal: add hasProAccess={hasPro}

══════════════════════════════════════════════════════
FILES TO CREATE/UPDATE
══════════════════════════════════════════════════════

CREATE:
  app/api/dashboard/waivers/route.ts
  app/api/dashboard/trades/route.ts
  app/dashboard/components/WaiverRecommendationsModal.tsx
  app/dashboard/components/PendingTradesModal.tsx
  components/dashboard/ProLeagueLink.tsx

UPDATE:
  app/dashboard/components/TodayStrip.tsx
  app/dashboard/components/DashboardOverview.tsx
  app/dashboard/components/LineupIssuesModal.tsx
  app/api/lineup-check/route.ts

══════════════════════════════════════════════════════
FINAL STEPS
══════════════════════════════════════════════════════

1. npx tsc --noEmit — fix ALL type errors
2. git add -A
3. git commit -m "feat(dashboard): waiver recommendations popup, pending trades popup, enhanced lineup popup — lazy-fetch modals on TodayStrip, auto-refresh 30s, ProLeagueLink PRO-gated league nav, Chimmy shortcuts, QUESTIONABLE/DOUBTFUL lineup detection"
4. git push origin main
5. Confirm Vercel build READY
6. Report commit hash
```
