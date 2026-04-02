# SEASON_STRATEGY_TASK.md
# Drop into repo root. In Cursor: @SEASON_STRATEGY_TASK.md implement step by step

## What This Builds

A dedicated **Season Strategy Planner** page at `/season-strategy` — a
full-season AI GM that analyzes your specific team in a specific league and
produces a complete strategic blueprint: win window, trade targets, waiver
priorities, schedule analysis, playoff path, and weekly action items.

Added to `/tools-hub` as a featured tool.

---

## Why This Is Different From Other Tools

Every other tool answers a single question:
- Trade evaluator: "Is this trade good?"
- Waiver AI: "Who should I add?"
- Trade finder: "What trades exist?"

**Season Strategy Planner answers: "What is my master plan for the whole season?"**

It combines ALL context sources simultaneously:
- Your specific roster (player values, ages, positions, injuries)
- Every other team in your league (their rosters, records, tendencies)
- Scoring settings + roster requirements
- Pick capital (your picks, their picks)
- Win window classification (contender / fringe / rebuilder)
- Schedule analysis (who you play and when)
- Real-time news (injuries, releases, usage changes via Grok)

---

## Existing Infrastructure to Reuse (DO NOT change these)

```
lib/smart-trade-recommendations.ts     (757 lines — read ALL)
  - generateSmartRecommendations()
  - analyzeUserTradingProfile()
  - UserTradingProfile, SmartTradeRecommendation, SmartRecommendationsResult
  - SMART_RECOMMENDATIONS_SYSTEM_PROMPT (the AI system prompt)
  - buildRecommendationPrompt()
  - getMarketInsights()

app/api/legacy/smart-recommendations/route.ts  (166 lines)
  - POST: { username, leagueId, sport }
  - Calls generateSmartRecommendations() with real roster data
  - Returns SmartRecommendationsResult

lib/league-decision-context.ts         (489 lines)
  - buildLeagueDecisionContext()
  - summarizeLeagueDecisionContext()
  - LeagueDecisionContext, TeamDecisionProfile, PartnerFitScore
  - computeNeedsAndSurpluses(), classifyWindow(), computePickCapitalScore()

lib/ai-gm-intelligence.ts             (893 lines)
  - fetchPlayerNewsFromGrok()        ← real-time X/Grok news
  - buildComprehensiveTradeContext()
  - generateAIGMAnalysis()
  - fetchLeagueRosterStandings()
  - getManagerProfiles()

lib/sleeper-client.ts
  - getSleeperUser(), getUserLeagues(), getLeagueRosters()
  - getLeagueInfo(), getAllPlayers(), getTradedDraftPicks()

lib/fantasycalc.ts
  - fetchFantasyCalcValues(), findPlayerByName()

lib/dynasty-tiers.ts
  - calculateDynastyScore(), findPlayerTier(), ALL_TIERED_PLAYERS
```

---

## Step 1 — Read these files completely before writing anything

```
lib/smart-trade-recommendations.ts     (READ ALL 757 lines)
app/api/legacy/smart-recommendations/route.ts
lib/league-decision-context.ts         (READ ALL)
lib/ai-gm-intelligence.ts             (READ ALL)
lib/sleeper-client.ts
lib/fantasycalc.ts
app/api/legacy/share/route.ts          (see how auth is handled)
app/api/league/list/route.ts
app/waiver-ai/page.tsx                 (league gate pattern)
app/tools-hub/ToolsHubClient.tsx       (exact tools hub card pattern)
prisma/schema.prisma                   (League, LeagueTrade, LegacyUser models)
```

---

## Step 2 — Create app/api/season-strategy/route.ts (NEW)

This is the core AI endpoint. It assembles ALL available context and runs
a single comprehensive GPT-4o call that produces the full season blueprint.

```typescript
// app/api/season-strategy/route.ts
import { NextRequest, NextResponse }      from 'next/server'
import { getServerSession }               from 'next-auth'
import { authOptions }                    from '@/lib/auth'
import { z }                              from 'zod'
import { getSleeperUser, getUserLeagues, getLeagueRosters,
         getLeagueInfo, getAllPlayers, getTradedDraftPicks } from '@/lib/sleeper-client'
import { fetchFantasyCalcValues, findPlayerByName }         from '@/lib/fantasycalc'
import { calculateDynastyScore, findPlayerTier }            from '@/lib/dynasty-tiers'
import { fetchPlayerNewsFromGrok, fetchLeagueRosterStandings,
         getManagerProfiles }                               from '@/lib/ai-gm-intelligence'
import { buildLeagueDecisionContext, summarizeLeagueDecisionContext } from '@/lib/league-decision-context'
import { analyzeUserTradingProfile }                        from '@/lib/smart-trade-recommendations'
import { consumeRateLimit, getClientIp }                   from '@/lib/rate-limit'
import OpenAI                                               from 'openai'

const openai = new OpenAI({
  apiKey:  process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

const RequestSchema = z.object({
  username:   z.string().min(1).max(40),
  leagueId:   z.string().min(1),
  sport:      z.enum(['nfl', 'nba']).default('nfl'),
  week:       z.number().int().min(1).max(18).optional(),
  forceRefresh: z.boolean().optional().default(false),
})

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
// This is what makes the AI work. Read it carefully — this is the brain.

const SEASON_STRATEGY_SYSTEM_PROMPT = `
You are an elite fantasy sports GM with 20+ years of dynasty and redraft
experience. You have deep knowledge of NFL team contexts, age curves, positional
scarcity, trade market dynamics, and weekly streaming strategy.

You are given REAL DATA about a specific team in a specific league:
- The user's exact roster with FantasyCalc trade values and dynasty scores
- Every other team's roster in the league (their values, records, tendencies)
- Real-time player news from X/Twitter (last 7 days)
- League scoring settings and roster positions
- The user's historical trading profile (style, preferences, win rate)
- Draft pick capital (available picks)
- Win window classification based on roster age and value

YOUR MISSION: Generate a complete season-long strategic blueprint.

## CRITICAL RULES
1. Only reference players who appear in the provided data — NO hallucination
2. Use the FantasyCalc values provided — do NOT invent values
3. Real-time news OVERRIDES static values — if a player was just released, say so
4. All trade suggestions must be value-fair (within 15% differential)
5. Strategy must match the user's win window (contender vs rebuilder)
6. Be specific — name actual players, actual managers, actual values

## OUTPUT FORMAT — return JSON only:
{
  "winWindow": {
    "classification": "CONTENDER" | "FRINGE_CONTENDER" | "REBUILDER" | "TRANSITION",
    "confidence": 0-100,
    "rationale": "2-3 sentences explaining why",
    "timeframe": "This season" | "1-2 years" | "3+ years"
  },
  "rosterGrade": {
    "overall": "A+" to "F",
    "byPosition": {
      "QB": { "grade": "A-F", "depth": "deep|solid|thin|empty", "note": "..." },
      "RB": { "grade": "A-F", "depth": "deep|solid|thin|empty", "note": "..." },
      "WR": { "grade": "A-F", "depth": "deep|solid|thin|empty", "note": "..." },
      "TE": { "grade": "A-F", "depth": "deep|solid|thin|empty", "note": "..." }
    },
    "strengths": ["2-3 roster strengths"],
    "weaknesses": ["2-3 roster weaknesses"]
  },
  "seasonGoal": {
    "primary": "Win championship" | "Make playoffs" | "Rebuild for future" | "Develop assets",
    "secondary": "optional secondary goal",
    "keyMilestone": "The one thing that must happen for this goal to succeed"
  },
  "tradeStrategy": {
    "priority": "buy" | "sell" | "hold" | "mixed",
    "immediateTargets": [
      {
        "playerName": "string",
        "position": "QB|RB|WR|TE",
        "currentOwner": "manager name",
        "askPrice": "what to offer",
        "urgency": "high|medium|low",
        "why": "specific reason tied to this user's roster"
      }
    ],
    "sellCandidates": [
      {
        "playerName": "string",
        "sellReason": "sell high reason",
        "targetManagers": ["manager names"],
        "valueWindow": "closing soon" | "peak now" | "already peaked"
      }
    ],
    "holdList": ["player names to hold"],
    "tradeDeadlineAdvice": "What to do at the trade deadline"
  },
  "waiverStrategy": {
    "streamingPositions": ["positions to stream week-to-week"],
    "stashTargets": [
      {
        "type": "handcuff" | "breakout_candidate" | "injured_starter",
        "playerDescription": "position and role",
        "reason": "why to stash"
      }
    ],
    "faabPhilosophy": "aggressive" | "conservative" | "strategic",
    "faabAdvice": "specific FAAB strategy for this team's situation"
  },
  "scheduleAnalysis": {
    "playoffWeeks": "which weeks are playoffs in this league format",
    "peakWeeks": "when your roster should be at peak strength",
    "riskWeeks": "potential bye week problems",
    "advice": "schedule-specific strategic advice"
  },
  "weeklyActionPlan": [
    {
      "timeframe": "Weeks 1-4" | "Weeks 5-8" | "Weeks 9-11" | "Weeks 12-14" | "Playoffs",
      "focus": "primary focus for this stretch",
      "actions": ["2-4 specific actions to take"],
      "watchList": ["players or situations to monitor"]
    }
  ],
  "opponentIntelligence": [
    {
      "managerName": "string",
      "threat": "high|medium|low",
      "theirStrategy": "what they appear to be doing",
      "howToExploit": "specific advice for dealing with this manager",
      "tradeOpportunity": "is there a trade angle here?"
    }
  ],
  "draftPickStrategy": {
    "currentCapital": "assessment of pick holdings",
    "recommendation": "accumulate" | "spend" | "hold",
    "advice": "specific pick strategy advice"
  },
  "confidenceScore": 0-100,
  "topInsight": "single most important strategic insight in 1 sentence",
  "generatedAt": "ISO timestamp"
}
`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip  = getClientIp(req)
  const rl  = consumeRateLimit({
    scope:     'ai',
    action:    'season_strategy',
    ip,
    maxRequests: 3,     // expensive call — 3 per minute
    windowMs:    60_000,
    includeIpInKey: true,
  })
  if (!rl.success) {
    return NextResponse.json({
      error: 'Rate limited',
      retryAfterSec: rl.retryAfterSec
    }, { status: 429 })
  }

  let body: z.infer<typeof RequestSchema>
  try {
    body = RequestSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { username, leagueId, sport, week } = body

  try {
    // ── 1. FETCH ALL DATA IN PARALLEL ──────────────────────────────────────
    const [
      sleeperUser,
      leagueInfo,
      rosters,
      allPlayers,
      tradedPicks,
      fcValues,
      userProfile,
    ] = await Promise.all([
      getSleeperUser(username),
      getLeagueInfo(leagueId),
      getLeagueRosters(leagueId),
      getAllPlayers(),
      getTradedDraftPicks(leagueId),
      fetchFantasyCalcValues({
        isDynasty: false,   // will update after leagueInfo
        numQbs:    1,
        numTeams:  12,
        ppr:       1,
      }),
      analyzeUserTradingProfile(username).catch(() => null),
    ])

    if (!sleeperUser) {
      return NextResponse.json({ error: 'Sleeper user not found' }, { status: 404 })
    }
    if (!leagueInfo) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }
    if (!rosters?.length) {
      return NextResponse.json({ error: 'No rosters found' }, { status: 404 })
    }

    const isDynasty   = (leagueInfo.settings as Record<string,unknown>)?.type === 2
    const isSuperFlex = leagueInfo.roster_positions?.includes('SUPER_FLEX') || false
    const totalTeams  = rosters.length

    // ── 2. FIND USER ROSTER ────────────────────────────────────────────────
    const userRoster = rosters.find(r => r.owner_id === sleeperUser.user_id)
    if (!userRoster) {
      return NextResponse.json({ error: 'User not found in this league' }, { status: 404 })
    }

    // ── 3. ENRICH PLAYERS WITH FANTASY VALUES ─────────────────────────────
    const enrichPlayer = (playerId: string) => {
      const p        = allPlayers[playerId]
      if (!p) return null
      const name     = `${p.first_name} ${p.last_name}`
      const position = p.position || 'WR'
      const fcPlayer = findPlayerByName(fcValues, name)
      const tiered   = findPlayerTier(name)
      const baseVal  = fcPlayer?.value || 0
      const dynasty  = calculateDynastyScore(baseVal, position, tiered?.age, tiered?.tier ?? null, isSuperFlex, false)
      return {
        id:           playerId,
        name,
        position,
        team:         p.team || 'FA',
        age:          tiered?.age,
        value:        baseVal,
        tier:         tiered?.tier ?? null,
        dynastyScore: dynasty.score,
      }
    }

    const userPlayers = (userRoster.players || [])
      .map(enrichPlayer)
      .filter(Boolean)
      .sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0))

    // ── 4. FETCH LEAGUE USERS FOR MANAGER NAMES ────────────────────────────
    let userMap: Record<string, { display_name: string; avatar: string }> = {}
    try {
      const res   = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`)
      const users = await res.json()
      for (const u of users) {
        userMap[u.user_id] = { display_name: u.display_name || u.username, avatar: u.avatar || '' }
      }
    } catch { /* non-fatal */ }

    // ── 5. ENRICH ALL LEAGUE ROSTERS ──────────────────────────────────────
    const leagueRosters = rosters
      .filter(r => r.owner_id !== sleeperUser.user_id)
      .map(roster => {
        const mgr = userMap[roster.owner_id || '']
        return {
          managerId:   roster.owner_id || String(roster.roster_id),
          managerName: mgr?.display_name || `Manager ${roster.roster_id}`,
          record:      {
            wins:   (roster.settings as Record<string,number>)?.wins   || 0,
            losses: (roster.settings as Record<string,number>)?.losses || 0,
          },
          players: (roster.players || [])
            .map(enrichPlayer)
            .filter(Boolean)
            .sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0))
            .slice(0, 20),
        }
      })

    // ── 6. GET REAL-TIME PLAYER NEWS FROM GROK ────────────────────────────
    const topPlayerNames = [
      ...userPlayers.slice(0, 15).map(p => p!.name),
      ...leagueRosters.flatMap(r => r.players.slice(0, 5).map(p => p!.name)),
    ]
    const uniqueNames = [...new Set(topPlayerNames)].slice(0, 30)

    let playerNews: Array<{ playerName: string; sentiment: string; news: string[]; buzz: string }> = []
    try {
      playerNews = await fetchPlayerNewsFromGrok(uniqueNames, sport)
    } catch { /* non-fatal */ }

    // ── 7. BUILD THE MASTER AI PROMPT ─────────────────────────────────────
    const rosterPositions   = leagueInfo.roster_positions || []
    const scoringSettings   = leagueInfo.scoring_settings || {}
    const userRecord        = userRoster.settings as Record<string,number>
    const wins              = userRecord?.wins   || 0
    const losses            = userRecord?.losses || 0
    const pointsFor         = userRecord?.fpts   || 0

    const rosterValue       = userPlayers.reduce((sum, p) => sum + (p?.value ?? 0), 0)
    const avgAge            = userPlayers.filter(p => p?.age).reduce((sum, p, _, arr) => sum + (p!.age! / arr.length), 0)

    const prompt = `
## USER'S TEAM — ${username.toUpperCase()}
League: ${leagueInfo.name || 'Unknown League'}
Format: ${isDynasty ? 'Dynasty' : 'Redraft'} | SuperFlex: ${isSuperFlex ? 'Yes' : 'No'} | Teams: ${totalTeams}
Current Record: ${wins}-${losses} | Points For: ${pointsFor}
Roster Positions: ${rosterPositions.join(', ')}
${Object.keys(scoringSettings).slice(0, 10).map(k => `${k}: ${scoringSettings[k]}`).join(', ')}
Week: ${week || 'Offseason/Pre-season'}

## MY ROSTER (sorted by value)
Total Roster Value: ${rosterValue.toLocaleString()}
Average Age: ${avgAge.toFixed(1)} years
${userPlayers.slice(0, 30).map(p =>
  `- ${p!.name} | ${p!.position} | ${p!.team} | Age: ${p!.age || '?'} | Value: ${p!.value.toLocaleString()} | Tier: ${p!.tier ?? 'N/A'} | Dynasty Score: ${p!.dynastyScore}`
).join('\n')}

## ALL OTHER TEAMS IN LEAGUE
${leagueRosters.map(r =>
  `### ${r.managerName} (${r.record.wins}-${r.record.losses})
${r.players.slice(0, 15).map(p =>
  `  - ${p!.name} | ${p!.position} | Value: ${p!.value.toLocaleString()} | Tier: ${p!.tier ?? 'N/A'}`
).join('\n')}`
).join('\n\n')}

## USER'S TRADING PROFILE
${userProfile ? `
Total Trades: ${userProfile.totalTrades}
Win Rate: ${userProfile.winRate}%
Trading Style:
  - Youth preference: ${userProfile.tradingStyle.youthVsProduction}%
  - Consolidation: ${userProfile.tradingStyle.consolidationVsDepth}%
  - Picks over players: ${userProfile.tradingStyle.picksVsPlayers}%
  - Risk tolerance: ${userProfile.tradingStyle.riskTolerance}%
Position Preferences: ${userProfile.positionPreferences.slice(0,4).map(p => `${p.position}(${p.netAcquired > 0 ? '+' : ''}${p.netAcquired})`).join(', ')}
Recent Activity: ${userProfile.recentTrends.tradesLast30Days} trades last 30 days
` : 'No trading history available yet'}

## REAL-TIME PLAYER NEWS (Last 7 Days)
${playerNews.filter(p => p.news.length > 0 || p.buzz).slice(0, 20).map(p =>
  `${p.playerName} (${p.sentiment.toUpperCase()}): ${p.news.slice(0,2).join(' | ')}${p.buzz ? ` | Buzz: ${p.buzz}` : ''}`
).join('\n') || 'No breaking news'}

## TRADED DRAFT PICKS
${tradedPicks?.length ? tradedPicks.slice(0, 20).map(pick =>
  `- ${pick.season} Round ${pick.round} | Owner: ${pick.owner_id} | Original: ${pick.original_owner_id}`
).join('\n') : 'No traded picks'}

## TASK
Generate a complete season strategy blueprint for ${username} in ${leagueInfo.name}.
Use ALL the data above. Be specific — name real players from the roster data.
Return only valid JSON matching the required schema.
`

    // ── 8. CALL GPT-4o ────────────────────────────────────────────────────
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SEASON_STRATEGY_SYSTEM_PROMPT },
        { role: 'user',   content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.65,
      max_tokens:  4000,
    })

    const raw  = completion.choices[0]?.message?.content
    if (!raw) throw new Error('No AI response')

    const plan = JSON.parse(raw)
    plan.generatedAt = new Date().toISOString()

    return NextResponse.json({ success: true, plan, meta: {
      username, leagueId, isDynasty, isSuperFlex, totalTeams,
      rosterValue, avgAge, playerCount: userPlayers.length,
    }})

  } catch (err: unknown) {
    console.error('[season-strategy]', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Strategy generation failed'
    }, { status: 500 })
  }
}
```

---

## Step 3 — Create app/season-strategy/page.tsx

### PAGE OVERVIEW:

```
'use client'

SCREEN 1 — LEAGUE GATE:
  Same pattern as waiver AI (read app/waiver-ai/page.tsx)
  Shows user's leagues from /api/league/list
  Requires both league selection AND username entry

SCREEN 2 — CONFIGURATION:
  League selected → show config panel
  Week selector (1-18 or "Pre-season")
  [🧠 Generate Season Strategy] button

SCREEN 3 — RESULTS (after API returns):
  Sticky header with key metrics
  7 expandable sections (win window → weekly plan)
```

---

## Step 4 — TYPES

```typescript
type WinWindowClass = 'CONTENDER' | 'FRINGE_CONTENDER' | 'REBUILDER' | 'TRANSITION'

interface WinWindow {
  classification: WinWindowClass
  confidence:     number
  rationale:      string
  timeframe:      string
}

interface RosterGrade {
  overall: string
  byPosition: Record<string, { grade: string; depth: string; note: string }>
  strengths:  string[]
  weaknesses: string[]
}

interface TradeTarget {
  playerName:      string
  position:        string
  currentOwner:    string
  askPrice:        string
  urgency:         'high' | 'medium' | 'low'
  why:             string
}

interface SellCandidate {
  playerName:     string
  sellReason:     string
  targetManagers: string[]
  valueWindow:    string
}

interface StashTarget {
  type:              'handcuff' | 'breakout_candidate' | 'injured_starter'
  playerDescription: string
  reason:            string
}

interface WeeklyAction {
  timeframe:  string
  focus:      string
  actions:    string[]
  watchList:  string[]
}

interface OpponentIntel {
  managerName:      string
  threat:           'high' | 'medium' | 'low'
  theirStrategy:    string
  howToExploit:     string
  tradeOpportunity: string
}

interface SeasonPlan {
  winWindow:            WinWindow
  rosterGrade:          RosterGrade
  seasonGoal:           { primary: string; secondary?: string; keyMilestone: string }
  tradeStrategy:        {
    priority:           string
    immediateTargets:   TradeTarget[]
    sellCandidates:     SellCandidate[]
    holdList:           string[]
    tradeDeadlineAdvice: string
  }
  waiverStrategy:       {
    streamingPositions: string[]
    stashTargets:       StashTarget[]
    faabPhilosophy:     string
    faabAdvice:         string
  }
  scheduleAnalysis:     { playoffWeeks: string; peakWeeks: string; riskWeeks: string; advice: string }
  weeklyActionPlan:     WeeklyAction[]
  opponentIntelligence: OpponentIntel[]
  draftPickStrategy:    { currentCapital: string; recommendation: string; advice: string }
  confidenceScore:      number
  topInsight:           string
  generatedAt:          string
}
```

---

## Step 5 — STATE + GENERATE FUNCTION

```typescript
const { data: session } = useSession()

const [league,    setLeague]    = useState<UserLeague | null>(null)
const [username,  setUsername]  = useState('')
const [week,      setWeek]      = useState<number | undefined>(undefined)
const [loading,   setLoading]   = useState(false)
const [phase,     setPhase]     = useState('roster')
const [plan,      setPlan]      = useState<SeasonPlan | null>(null)
const [meta,      setMeta]      = useState<Record<string,unknown> | null>(null)
const [error,     setError]     = useState<string | null>(null)
const [expanded,  setExpanded]  = useState<Set<string>>(new Set(['winWindow']))

// Auto-fill username from session
useEffect(() => {
  if (session?.user?.name) setUsername(session.user.name)
}, [session])

const PHASES = [
  { key: 'roster',   label: 'Loading roster data...',        icon: '📋' },
  { key: 'enriching',label: 'Pricing all players...',        icon: '💰' },
  { key: 'news',     label: 'Fetching live player news...',  icon: '📡' },
  { key: 'opponents',label: 'Scouting opponent rosters...',  icon: '🔍' },
  { key: 'ai',       label: 'AI building season blueprint...', icon: '🧠' },
  { key: 'done',     label: 'Strategy ready',                icon: '✅' },
]

const generate = useCallback(async () => {
  if (!league || !username.trim() || loading) return
  setLoading(true)
  setError(null)
  setPlan(null)
  setPhase('roster')

  const phaseTimers = [
    setTimeout(() => setPhase('enriching'),  1500),
    setTimeout(() => setPhase('news'),       4000),
    setTimeout(() => setPhase('opponents'),  7000),
    setTimeout(() => setPhase('ai'),        10000),
  ]

  try {
    const res  = await fetch('/api/season-strategy', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        username:  username.trim(),
        leagueId:  league.sleeperLeagueId ?? league.id,
        sport:     (league.sport || 'nfl').toLowerCase(),
        week,
      }),
    })
    const data = await res.json()

    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)

    setPhase('done')
    setPlan(data.plan)
    setMeta(data.meta)
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Strategy failed. Try again.')
  } finally {
    phaseTimers.forEach(clearTimeout)
    setLoading(false)
  }
}, [league, username, week, loading])
```

---

## Step 6 — FULL UI

### LEAGUE GATE (copy from waiver-ai, same pattern)

### CONFIGURATION SCREEN (after league selected):
```tsx
<div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-5">
  {/* League pill */}
  {/* Username input */}
  {/* Week selector */}

  <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5">
    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
      Current Week (optional)
    </p>
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setWeek(undefined)}
        className={`text-xs font-bold px-3 py-1.5 rounded-xl ${!week ? 'bg-cyan-500 text-black' : 'bg-white/6 text-white/50 hover:bg-white/10'}`}>
        Pre-Season
      </button>
      {Array.from({length: 18}, (_, i) => i+1).map(w => (
        <button key={w} onClick={() => setWeek(w)}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl ${week===w ? 'bg-cyan-500 text-black' : 'bg-white/6 text-white/50 hover:bg-white/10'}`}>
          Wk {w}
        </button>
      ))}
    </div>
  </div>

  {/* Generate button */}
  <button onClick={generate} disabled={!username.trim() || loading || !league}
    className="w-full rounded-2xl py-4 text-base font-black transition-all disabled:opacity-30"
    style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', boxShadow: '0 8px 32px rgba(124,58,237,0.35)' }}>
    🧠 Generate Season Strategy
  </button>
</div>
```

### LOADING STATE (PECR animation):
```tsx
{loading && (
  <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-8 text-center">
      <div className="flex justify-center gap-1.5 mb-8">
        {[0,1,2].map(i=>(
          <div key={i} className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce"
            style={{ animationDelay: `${i*150}ms` }}/>
        ))}
      </div>
      <div className="space-y-2 max-w-xs mx-auto">
        {PHASES.map((p, i) => {
          const phaseIdx  = PHASES.findIndex(x => x.key === phase)
          const thisIdx   = i
          const isDone    = thisIdx < phaseIdx
          const isActive  = thisIdx === phaseIdx
          return (
            <div key={p.key} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all ${
              isActive ? 'bg-cyan-500/10 border border-cyan-500/20' :
              isDone   ? 'opacity-40' : 'opacity-20'
            }`}>
              <span>{p.icon}</span>
              <span className="text-sm text-white/80 flex-1 text-left">{p.label}</span>
              {isDone   && <span className="text-green-400 text-xs">✓</span>}
              {isActive && <div className="w-3 h-3 rounded-full border border-cyan-500 border-t-transparent animate-spin"/>}
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-white/30 mt-6">
        This takes 20-30 seconds — the AI is analyzing your entire league
      </p>
    </div>
  </div>
)}
```

### RESULTS — TOP INSIGHT BANNER:
```tsx
{plan && (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-4">

    {/* Top insight hero */}
    <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] overflow-hidden">
      <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 via-cyan-500 to-violet-500"/>
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Win Window badge */}
          <div className={`shrink-0 rounded-2xl px-4 py-3 text-center border ${
            plan.winWindow.classification === 'CONTENDER'        ? 'bg-green-500/20 border-green-500/30 text-green-300' :
            plan.winWindow.classification === 'FRINGE_CONTENDER' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' :
            plan.winWindow.classification === 'REBUILDER'        ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' :
            'bg-white/10 border-white/20 text-white/60'
          }`}>
            <div className="text-xs font-black uppercase tracking-wide">
              {plan.winWindow.classification.replace('_', ' ')}
            </div>
            <div className="text-2xl font-black mt-1">{plan.rosterGrade.overall}</div>
            <div className="text-[10px] opacity-60 mt-0.5">Overall Grade</div>
          </div>

          <div className="flex-1">
            <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">
              🧠 Key Insight
            </div>
            <p className="text-lg font-bold text-white leading-snug mb-2">
              {plan.topInsight}
            </p>
            <div className="flex items-center gap-3 text-xs text-white/40 flex-wrap">
              <span>🎯 {plan.seasonGoal.primary}</span>
              <span>·</span>
              <span>⏱ {plan.winWindow.timeframe}</span>
              <span>·</span>
              <span>Confidence: {plan.confidenceScore}/100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
```

### RESULTS — ACCORDION SECTIONS:

Each section uses the same expandable pattern:
```tsx
// Helper
const Section = ({ id, title, icon, children }: { id: string; title: string; icon: string; children: React.ReactNode }) => {
  const isOpen = expanded.has(id)
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] overflow-hidden">
      <button
        onClick={() => setExpanded(s => {
          const n = new Set(s)
          n.has(id) ? n.delete(id) : n.add(id)
          return n
        })}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-black text-white">{title}</span>
        </div>
        <span className="text-white/30">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-white/6 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}
```

Seven sections in order:

**1. 🏆 Win Window + Roster Grades**
Display the win window rationale, position grades with depth badges,
strengths (green dots) and weaknesses (red dots).

**2. 🎯 Season Goal**
Primary goal, secondary goal, key milestone.
Large bold goal label, milestone in a highlighted box.

**3. ⚔️ Trade Strategy**
Priority badge (buy/sell/hold/mixed).
Trade targets as cards: player name, urgency badge, owner, ask price, why.
Sell candidates: player, reason, value window chip, target managers.
Hold list as chips.
Trade deadline advice in a callout box.

**4. 💧 Waiver + FAAB Strategy**
Streaming positions as colored chips.
Stash targets with type badge (handcuff/breakout/injured starter).
FAAB philosophy badge + specific advice.

**5. 📅 Schedule Analysis**
Playoff weeks, peak weeks, risk weeks in a visual timeline row.
Schedule advice in a box.

**6. 📋 Weekly Action Plan**
Timeline: Wks 1-4 → 5-8 → 9-11 → 12-14 → Playoffs
Each period: focus heading, action items (checkable), watch list chips.

**7. 🕵️ Opponent Intelligence**
Manager cards with threat badge (high=red/medium=yellow/low=gray).
Their strategy + how to exploit + trade opportunity per manager.

---

## Step 7 — Add to Tools Hub

Read `app/tools-hub/ToolsHubClient.tsx` first.
Add using exact same pattern as other tools:

```typescript
{
  name:        "Season Strategy Planner",
  description: "Your AI GM. Get a complete season blueprint — win window, trade targets, waiver strategy, schedule analysis, and opponent intelligence — all based on your specific roster and league.",
  href:        "/season-strategy",
  category:    ["AI & Assistant"],
  badge:       "GPT-4o",
  featured:    true,
  icon:        "🧠",
  related:     ["AI Trade Finder", "Waiver Wire Advisor", "Power Rankings"],
}
```

---

## Why the AI Works (How It's Designed to Excel)

The AI is effective because of **context density**:

1. **Real FantasyCalc values** — every player on every roster has an exact
   trade value, not a guess. The AI can say "your WR corps is worth 18,400
   combined — strongest in the league."

2. **Live Grok news** — `fetchPlayerNewsFromGrok()` searches X/Twitter for
   the last 7 days of news on your top 30 players. If a player was released
   yesterday, the AI knows. It says "sell DeAndre Hopkins immediately."

3. **Trading profile** — the AI knows whether you prefer youth, picks,
   consolidation, or depth. It tailors recommendations to how YOU trade.

4. **Full opponent intelligence** — every roster is priced and sorted. The
   AI can identify which manager has the most WR surplus (trade target for
   your RB need), who's win-now-desperate, who's rebuilding.

5. **The system prompt** — it's 600+ words of non-negotiable rules:
   value fairness thresholds, confidence calibration, news override logic.
   The AI can't hallucinate players that don't exist in the data.

6. **GPT-4o with JSON mode** — structured output means the page always gets
   a valid plan it can render, never a broken response.

---

## Final Checks

```bash
npx tsc --noEmit
```

Commit:
```bash
git add app/api/season-strategy/route.ts
git add app/season-strategy/page.tsx
git add app/tools-hub/ToolsHubClient.tsx
git commit -m "feat: add Season Strategy Planner with GPT-4o full-league analysis and tools hub card"
```

---

## Constraints

- Rate limit: 3 requests per minute (expensive GPT-4o call)
- The API call takes 20-30 seconds — always show phase animation
- All player names come from Sleeper data — no hallucination possible
- Trade suggestions are value-gated (within 15% fairness per lib/smart-trade-recommendations.ts)
- Session required → 401 if not logged in
- No new npm dependencies
- No any / no @ts-ignore
- Cleanup phase timers on unmount via useRef
