# CAREER_SHARE_TASK.md
# Drop into repo root. In Cursor: @CAREER_SHARE_TASK.md implement step by step

## What This Builds

A dedicated **Career Share** page at `/career-share` — accessible from the
dashboard Tools tab after login. Users generate AI-powered social media
captions for 5 different share types and earn reward tokens for sharing.

---

## What Already Exists (DO NOT change these)

```
app/api/legacy/share/route.ts         POST — Grok-powered caption generator
app/api/legacy/ai-report/route.ts     POST — OpenAI dynasty AI report
app/api/legacy/share-reward/route.ts  POST/GET — Token reward system
```

### API #1: POST /api/legacy/share

Full request body (ShareInput type from reading the route):
```typescript
{
  sleeper_username: string           // required — Sleeper username
  share_type?: ShareType             // 'legacy'|'trade'|'rankings'|'exposure'|'waiver'
  style?:      'clean'|'funny'|'hype'|'balanced'|'humble'|'trash_talk'
  platform?:   'x'|'tiktok'|'instagram'|'threads'

  // For share_type = 'legacy':
  ranking_preview?: {
    career?: {
      xp?: number; level?: number; tier?: number; tier_name?: string
    }
    yearly_projection?: {
      baseline_year_xp?: number
      ai_low_year_xp?: number; ai_mid_year_xp?: number; ai_high_year_xp?: number
    }
  }

  // For share_type = 'trade':
  trade_data?: {
    side_a: string[]; side_b: string[]
    grade?: string; verdict?: string; league_type?: string
  }

  // For share_type = 'rankings':
  rankings_data?: {
    league_name?: string; rank?: number; total_teams?: number
    roster_value?: string; outlook?: string
  }

  // For share_type = 'exposure':
  exposure_data?: {
    player_name?: string; ownership_pct?: number
    leagues_owned?: number; total_leagues?: number; signal?: string
  }

  // For share_type = 'waiver':
  waiver_data?: {
    player_name?: string; recommendation?: string
    faab_pct?: number; reason?: string
  }
}
```

Response:
```typescript
{
  ok:         boolean
  success:    boolean
  share_text: string          // caption + hashtags combined
  caption:    string          // primary caption
  alt_captions: string[]      // 2 alternate captions
  hashtags:   string[]
  platform:   string
  style:      string
  rate_limit: { remaining: number; retryAfterSec: number }
}
```

Rate limit: 5 per 60s per user.

### API #2: POST /api/legacy/ai-report

Request body: `{ leagueId?: string }` (optional)
Auth: requires session (getServerSession).

Generates a dynasty AI report from user's imported leagues.
Response:
```typescript
{
  success: boolean
  report: {
    overallOutlook:       string
    topDynastyAssets:     { name: string; reason: string; dynastyTier: string }[]
    biggestRisks:         { name: string; reason: string; severity: string }[]
    projected3YearRank:   string
    confidenceScore:      number   // 0-100
    contenderOrRebuilder: 'contender'|'fringe'|'rebuilder'
    keyRecommendations:   string[]
    windowStatus:         'READY_TO_COMPETE'|'REBUILDING'|'OVEREXTENDED'|'AGING_CORE'|'DIRECTION_NEEDED'
    shareText:            string   // under 280 chars
  }
}
```

### API #3: POST /api/legacy/share-reward + GET /api/legacy/share-reward

POST body: `{ leagueId?, shareType, shareContent?, platform? }`
Records a share and awards 1 token (max once per day per share type).

GET — returns reward history:
```typescript
{
  rewards:         ShareReward[]
  totalEarned:     number
  unredeemedTokens: number
  canShareToday:   boolean
}
```

---

## Step 1 — Read these files before writing anything

```
app/api/legacy/share/route.ts         (already read — use types above)
app/api/legacy/ai-report/route.ts     (already read — use types above)
app/api/legacy/share-reward/route.ts  (already read — use types above)
app/api/league/list/route.ts          (find league data for context)
app/api/user/rank/route.ts            (find career rank/XP data — check if exists)
app/dashboard/rankings/page.tsx       (find where rank data is loaded)
app/tools-hub/ToolsHubClient.tsx      (exact card pattern for tools hub)
app/waiver-ai/page.tsx               (visual style reference)
lib/auth.ts                          (getServerSession pattern)
prisma/schema.prisma                 (ShareReward model)
```

---

## Step 2 — Create app/career-share/page.tsx

### PAGE OVERVIEW:

```
'use client'

Sticky header: [🚀 Career Share]

FIVE SHARE TYPE TABS (horizontal scrollable):
  [🏆 My Ranking]  [⚔️ Trade]  [📊 League Rank]
  [📈 Player Stock]  [💧 Waiver Pick]

LEFT PANEL (320px) — CONFIGURATION:
  Share type-specific inputs
  Style selector
  Platform selector
  [✨ Generate Caption] button

RIGHT PANEL (flex-1) — OUTPUT:
  AI Report Card (collapsible, loads separately)
  Generated captions
  Share buttons
  Token reward tracker
```

---

## Step 3 — STATE + TYPES

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

type ShareType   = 'legacy' | 'trade' | 'rankings' | 'exposure' | 'waiver'
type ShareStyle  = 'clean' | 'funny' | 'hype' | 'balanced' | 'humble' | 'trash_talk'
type SharePlatform = 'x' | 'tiktok' | 'instagram' | 'threads'

interface ShareResult {
  ok:          boolean
  share_text:  string
  caption:     string
  alt_captions: string[]
  hashtags:    string[]
  platform:    SharePlatform
  style:       ShareStyle
  rate_limit:  { remaining: number; retryAfterSec: number }
}

interface DynastyReport {
  overallOutlook:       string
  topDynastyAssets:     { name: string; reason: string; dynastyTier: string }[]
  biggestRisks:         { name: string; reason: string; severity: string }[]
  projected3YearRank:   string
  confidenceScore:      number
  contenderOrRebuilder: string
  keyRecommendations:   string[]
  windowStatus:         string
  shareText:            string
}

interface RewardStatus {
  totalEarned:      number
  unredeemedTokens: number
  canShareToday:    boolean
}

// Component state
const [activeType,     setActiveType]     = useState<ShareType>('legacy')
const [style,          setStyle]          = useState<ShareStyle>('balanced')
const [platform,       setPlatform]       = useState<SharePlatform>('x')
const [username,       setUsername]       = useState('')
const [loading,        setLoading]        = useState(false)
const [result,         setResult]         = useState<ShareResult | null>(null)
const [activeCaption,  setActiveCaption]  = useState<string>('')
const [report,         setReport]         = useState<DynastyReport | null>(null)
const [reportLoading,  setReportLoading]  = useState(false)
const [rewards,        setRewards]        = useState<RewardStatus | null>(null)
const [copied,         setCopied]         = useState(false)
const [error,          setError]          = useState<string | null>(null)
const [rateLimitSecs,  setRateLimitSecs]  = useState(0)

// Trade inputs
const [tradeGiveList,  setTradeGiveList]  = useState<string[]>(['', ''])
const [tradeGetList,   setTradeGetList]   = useState<string[]>(['', ''])
const [tradeGrade,     setTradeGrade]     = useState('')
const [tradeVerdict,   setTradeVerdict]   = useState('')
const [tradeFormat,    setTradeFormat]    = useState('Dynasty')

// Rankings inputs
const [leagueName,     setLeagueName]     = useState('')
const [myRank,         setMyRank]         = useState<number>(1)
const [totalTeams,     setTotalTeams]     = useState<number>(12)
const [rosterValue,    setRosterValue]    = useState('')
const [outlook,        setOutlook]        = useState('')

// Exposure inputs
const [playerName,     setPlayerName]     = useState('')
const [ownershipPct,   setOwnershipPct]   = useState<number>(0)
const [leaguesOwned,   setLeaguesOwned]   = useState<number>(0)
const [totalLeagues,   setTotalLeagues]   = useState<number>(0)
const [signal,         setSignal]         = useState('Hold')

// Waiver inputs
const [waiverPlayer,   setWaiverPlayer]   = useState('')
const [recommendation, setRecommendation] = useState('Add')
const [faabPct,        setFaabPct]        = useState<number>(0)
const [waiverReason,   setWaiverReason]   = useState('')
```

---

## Step 4 — GENERATE FUNCTION

```typescript
const generate = useCallback(async () => {
  if (!username.trim() || loading) return
  setLoading(true)
  setError(null)
  setResult(null)

  const body: Record<string, unknown> = {
    sleeper_username: username.trim(),
    share_type:  activeType,
    style,
    platform,
  }

  // Add type-specific data
  if (activeType === 'trade') {
    body.trade_data = {
      side_a:      tradeGiveList.filter(Boolean),
      side_b:      tradeGetList.filter(Boolean),
      grade:       tradeGrade || undefined,
      verdict:     tradeVerdict || undefined,
      league_type: tradeFormat,
    }
  }
  if (activeType === 'rankings') {
    body.rankings_data = {
      league_name:  leagueName || undefined,
      rank:         myRank,
      total_teams:  totalTeams,
      roster_value: rosterValue || undefined,
      outlook:      outlook || undefined,
    }
  }
  if (activeType === 'exposure') {
    body.exposure_data = {
      player_name:   playerName,
      ownership_pct: ownershipPct,
      leagues_owned: leaguesOwned,
      total_leagues: totalLeagues,
      signal,
    }
  }
  if (activeType === 'waiver') {
    body.waiver_data = {
      player_name:    waiverPlayer,
      recommendation,
      faab_pct:       faabPct,
      reason:         waiverReason || undefined,
    }
  }

  try {
    const res  = await fetch('/api/legacy/share', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()

    if (res.status === 429) {
      const secs = data.rate_limit?.retryAfterSec ?? 60
      setRateLimitSecs(secs)
      // countdown
      const interval = setInterval(() => {
        setRateLimitSecs(s => {
          if (s <= 1) { clearInterval(interval); return 0 }
          return s - 1
        })
      }, 1000)
      throw new Error(`Rate limited. Try again in ${secs}s.`)
    }

    if (!res.ok || !data.ok) throw new Error(data.error ?? 'Generation failed')

    setResult(data as ShareResult)
    setActiveCaption(data.caption)
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Generation failed')
  } finally {
    setLoading(false)
  }
}, [username, activeType, style, platform, loading,
    tradeGiveList, tradeGetList, tradeGrade, tradeVerdict, tradeFormat,
    leagueName, myRank, totalTeams, rosterValue, outlook,
    playerName, ownershipPct, leaguesOwned, totalLeagues, signal,
    waiverPlayer, recommendation, faabPct, waiverReason])
```

---

## Step 5 — REPORT + REWARD FUNCTIONS

```typescript
const loadDynastyReport = useCallback(async () => {
  setReportLoading(true)
  try {
    const res  = await fetch('/api/legacy/ai-report', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    const data = await res.json()
    if (data.success) setReport(data.report)
    else throw new Error(data.error ?? 'Report failed')
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Report failed')
  } finally {
    setReportLoading(false)
  }
}, [])

const claimReward = useCallback(async () => {
  if (!result) return
  try {
    await fetch('/api/legacy/share-reward', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        shareType:    activeType,
        shareContent: activeCaption,
        platform,
      }),
    })
    loadRewards()
  } catch { /* non-fatal */ }
}, [result, activeType, activeCaption, platform])

const loadRewards = useCallback(async () => {
  try {
    const res  = await fetch('/api/legacy/share-reward')
    const data = await res.json()
    if (data.totalEarned !== undefined) {
      setRewards({
        totalEarned:      data.totalEarned,
        unredeemedTokens: data.unredeemedTokens,
        canShareToday:    data.canShareToday,
      })
    }
  } catch { /* ignore */ }
}, [])

const copyCaption = useCallback(() => {
  const text = [activeCaption, ...(result?.hashtags?.map(h => h.startsWith('#') ? h : `#${h}`) ?? [])].join('\n')
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    claimReward()
  })
}, [activeCaption, result, claimReward])

// Load rewards on mount
useEffect(() => { loadRewards() }, [loadRewards])
```

---

## Step 6 — FULL UI

### STICKY HEADER:
```tsx
<div className="border-b border-white/6 bg-[#07071a]/90 backdrop-blur-xl sticky top-0 z-20">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
    <div>
      <div className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-0.5">
        🚀 AI-Powered
      </div>
      <h1 className="text-xl font-black text-white">Career Share</h1>
      <p className="text-xs text-white/40 mt-0.5">
        Generate AI captions for any fantasy moment. Earn tokens for sharing.
      </p>
    </div>

    {/* Reward token display */}
    {rewards && (
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-center">
          <div className="text-lg font-black text-yellow-400">{rewards.unredeemedTokens}</div>
          <div className="text-[10px] text-yellow-400/60 uppercase tracking-wide">Tokens</div>
        </div>
        {!rewards.canShareToday && (
          <div className="text-[11px] text-white/30">
            ✓ Token earned today
          </div>
        )}
      </div>
    )}
  </div>
</div>
```

### SHARE TYPE TABS:
```tsx
<div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
  <div className="flex gap-2 overflow-x-auto pb-2">
    {([
      { type: 'legacy',   icon: '🏆', label: 'My Ranking'   },
      { type: 'trade',    icon: '⚔️',  label: 'Trade'        },
      { type: 'rankings', icon: '📊', label: 'League Rank'  },
      { type: 'exposure', icon: '📈', label: 'Player Stock' },
      { type: 'waiver',   icon: '💧', label: 'Waiver Pick'  },
    ] as { type: ShareType; icon: string; label: string }[]).map(t => (
      <button
        key={t.type}
        onClick={() => { setActiveType(t.type); setResult(null); setError(null) }}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
          activeType === t.type
            ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg'
            : 'bg-white/6 text-white/50 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span>{t.icon}</span>
        <span>{t.label}</span>
      </button>
    ))}
  </div>
</div>
```

### MAIN TWO-COLUMN LAYOUT:
```tsx
<div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
  <div className="grid lg:grid-cols-[320px_1fr] gap-6">
    {/* LEFT: Config panel */}
    {/* RIGHT: Output panel */}
  </div>
</div>
```

### LEFT PANEL — Config:
```tsx
<div className="space-y-4">

  {/* Username (always shown) */}
  <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5">
    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">
      Sleeper Username
    </label>
    <input
      value={username}
      onChange={e => setUsername(e.target.value)}
      placeholder="your_username"
      className="w-full bg-transparent text-white text-sm placeholder:text-white/20 focus:outline-none border-b border-white/10 pb-1"
    />
  </div>

  {/* Type-specific inputs */}
  {activeType === 'legacy' && (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5 space-y-3">
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
        Career Data (optional)
      </p>
      <p className="text-[11px] text-white/30 leading-relaxed">
        Connect your rank data to generate a personalized career caption.
        Leave blank for a general career share.
      </p>
      {/* Load from dashboard rankings automatically if user has rank data */}
      <button
        onClick={loadDynastyReport}
        disabled={reportLoading}
        className="w-full rounded-xl py-2 text-xs font-bold border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-all disabled:opacity-40"
      >
        {reportLoading ? '⏳ Loading dynasty report...' : '⚡ Load My Dynasty Report'}
      </button>
      {report && (
        <div className="rounded-xl bg-white/3 p-3 text-[11px] text-white/60">
          <div className="font-bold text-white/80 mb-1">{report.windowStatus?.replace(/_/g,' ')}</div>
          <div>{report.overallOutlook?.slice(0, 120)}...</div>
        </div>
      )}
    </div>
  )}

  {activeType === 'trade' && (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5 space-y-4">
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Trade Details</p>

      <div>
        <label className="text-[10px] text-white/40 mb-1.5 block">You Give</label>
        {tradeGiveList.map((v, i) => (
          <input key={i} value={v}
            onChange={e => { const n=[...tradeGiveList]; n[i]=e.target.value; setTradeGiveList(n) }}
            placeholder={`Player ${i+1}`}
            className="w-full mb-1.5 bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
          />
        ))}
        <button onClick={() => setTradeGiveList([...tradeGiveList, ''])}
          className="text-[10px] text-white/30 hover:text-white/60">+ Add player</button>
      </div>

      <div>
        <label className="text-[10px] text-white/40 mb-1.5 block">You Get</label>
        {tradeGetList.map((v, i) => (
          <input key={i} value={v}
            onChange={e => { const n=[...tradeGetList]; n[i]=e.target.value; setTradeGetList(n) }}
            placeholder={`Player ${i+1}`}
            className="w-full mb-1.5 bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50"
          />
        ))}
        <button onClick={() => setTradeGetList([...tradeGetList, ''])}
          className="text-[10px] text-white/30 hover:text-white/60">+ Add player</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">AI Grade</label>
          <input value={tradeGrade} onChange={e=>setTradeGrade(e.target.value)} placeholder="A, B+, etc"
            className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"/>
        </div>
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">Format</label>
          <select value={tradeFormat} onChange={e=>setTradeFormat(e.target.value)}
            className="w-full bg-[#0c0c1e] rounded-xl border border-white/8 px-3 py-2 text-xs text-white focus:outline-none">
            {['Dynasty','Redraft','Keeper'].map(f=><option key={f}>{f}</option>)}
          </select>
        </div>
      </div>
    </div>
  )}

  {activeType === 'rankings' && (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5 space-y-3">
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">League Standing</p>
      <input value={leagueName} onChange={e=>setLeagueName(e.target.value)} placeholder="League name"
        className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"/>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">My Rank</label>
          <input type="number" min={1} value={myRank} onChange={e=>setMyRank(Number(e.target.value))}
            className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white focus:outline-none"/>
        </div>
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">Total Teams</label>
          <input type="number" min={2} value={totalTeams} onChange={e=>setTotalTeams(Number(e.target.value))}
            className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white focus:outline-none"/>
        </div>
      </div>
      <input value={rosterValue} onChange={e=>setRosterValue(e.target.value)} placeholder="Roster value (e.g. 52,400)"
        className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"/>
      <input value={outlook} onChange={e=>setOutlook(e.target.value)} placeholder="AI outlook (e.g. Contender)"
        className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"/>
    </div>
  )}

  {activeType === 'exposure' && (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5 space-y-3">
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Player Stock</p>
      <input value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="Player name"
        className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"/>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">Owned %</label>
          <input type="number" min={0} max={100} value={ownershipPct} onChange={e=>setOwnershipPct(Number(e.target.value))}
            className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white focus:outline-none"/>
        </div>
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">Owned in</label>
          <input type="number" min={0} value={leaguesOwned} onChange={e=>setLeaguesOwned(Number(e.target.value))}
            className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white focus:outline-none"/>
        </div>
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">of</label>
          <input type="number" min={1} value={totalLeagues} onChange={e=>setTotalLeagues(Number(e.target.value))}
            className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white focus:outline-none"/>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-white/40 mb-1.5 block">Signal</label>
        <div className="flex gap-2 flex-wrap">
          {['Buy','Hold','Sell','Buy Low','Sell High'].map(s=>(
            <button key={s} onClick={()=>setSignal(s)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                signal===s ? 'bg-cyan-500 text-black' : 'bg-white/6 text-white/50 hover:bg-white/10'
              }`}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  )}

  {activeType === 'waiver' && (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5 space-y-3">
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Waiver Pick</p>
      <input value={waiverPlayer} onChange={e=>setWaiverPlayer(e.target.value)} placeholder="Player name"
        className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"/>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">Action</label>
          <select value={recommendation} onChange={e=>setRecommendation(e.target.value)}
            className="w-full bg-[#0c0c1e] rounded-xl border border-white/8 px-3 py-2 text-xs text-white focus:outline-none">
            {['Add','Drop','Stream','Stash','Start','Sit'].map(a=><option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">FAAB %</label>
          <input type="number" min={0} max={100} value={faabPct} onChange={e=>setFaabPct(Number(e.target.value))}
            className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white focus:outline-none"/>
        </div>
      </div>
      <textarea value={waiverReason} onChange={e=>setWaiverReason(e.target.value)} rows={2}
        placeholder="Why pick up this player?"
        className="w-full bg-white/4 rounded-xl border border-white/8 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none resize-none"/>
    </div>
  )}

  {/* Style selector */}
  <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5">
    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Caption Style</p>
    <div className="grid grid-cols-2 gap-2">
      {([
        { v: 'balanced',   label: '⚖️ Balanced'    },
        { v: 'hype',       label: '🔥 Hype'         },
        { v: 'funny',      label: '😂 Funny'        },
        { v: 'humble',     label: '🙏 Humble'       },
        { v: 'trash_talk', label: '💬 Trash Talk'   },
        { v: 'clean',      label: '✨ Clean'         },
      ] as { v: ShareStyle; label: string }[]).map(s => (
        <button key={s.v} onClick={()=>setStyle(s.v)}
          className={`text-xs font-bold py-2 rounded-xl transition-all ${
            style===s.v ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'bg-white/4 text-white/50 hover:bg-white/8'
          }`}>
          {s.label}
        </button>
      ))}
    </div>
  </div>

  {/* Platform selector */}
  <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5">
    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Platform</p>
    <div className="grid grid-cols-2 gap-2">
      {([
        { v: 'x',         label: '𝕏 X / Twitter', limit: '280 chars'  },
        { v: 'instagram', label: '📸 Instagram',   limit: '2200 chars' },
        { v: 'tiktok',    label: '🎵 TikTok',       limit: '150 chars'  },
        { v: 'threads',   label: '🧵 Threads',      limit: '500 chars'  },
      ] as { v: SharePlatform; label: string; limit: string }[]).map(p => (
        <button key={p.v} onClick={()=>setPlatform(p.v)}
          className={`text-left rounded-xl px-3 py-2.5 transition-all border ${
            platform===p.v ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-white/8 bg-white/3 text-white/50 hover:text-white hover:border-white/20'
          }`}>
          <div className="text-xs font-bold">{p.label}</div>
          <div className="text-[9px] opacity-50 mt-0.5">{p.limit}</div>
        </button>
      ))}
    </div>
  </div>

  {/* Error display */}
  {error && (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300 flex items-center gap-2">
      ⚠️ {error}
      <button onClick={()=>setError(null)} className="ml-auto text-red-400 hover:text-red-300">✕</button>
    </div>
  )}

  {/* Rate limit countdown */}
  {rateLimitSecs > 0 && (
    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs text-yellow-300 text-center">
      ⏱ Rate limited — try again in {rateLimitSecs}s
    </div>
  )}

  {/* Generate button */}
  <button
    onClick={generate}
    disabled={!username.trim() || loading || rateLimitSecs > 0}
    className="w-full rounded-2xl py-4 text-sm font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
    style={{
      background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
      boxShadow: !username.trim() || loading ? 'none' : '0 8px 32px rgba(124,58,237,0.35)',
    }}
  >
    {loading
      ? <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10"/>
          </svg>
          Generating with Grok...
        </span>
      : '✨ Generate Caption'
    }
  </button>
</div>
```

### RIGHT PANEL — Output:
```tsx
<div className="space-y-5">

  {/* Empty state */}
  {!result && !loading && (
    <div className="rounded-3xl border border-dashed border-white/15 bg-transparent p-12 text-center">
      <div className="text-5xl mb-4">🚀</div>
      <h3 className="text-lg font-bold text-white mb-2">Share Your Fantasy Story</h3>
      <p className="text-sm text-white/40 max-w-sm mx-auto">
        Choose a share type, fill in your details, and let Grok AI write
        the perfect caption for any platform.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs mx-auto text-xs text-white/30">
        <div className="flex items-center gap-2"><span>🏆</span> Career rank captions</div>
        <div className="flex items-center gap-2"><span>⚔️</span> Trade debate posts</div>
        <div className="flex items-center gap-2"><span>📊</span> League standing flex</div>
        <div className="flex items-center gap-2"><span>📈</span> Player stock takes</div>
      </div>
    </div>
  )}

  {/* Loading state */}
  {loading && (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-8 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-6">
        {[0,1,2].map(i=>(
          <div key={i} className="w-2 h-2 rounded-full animate-bounce bg-violet-500"
            style={{ animationDelay: `${i*150}ms` }}/>
        ))}
      </div>
      <p className="text-sm text-white/60">Grok is writing your caption...</p>
    </div>
  )}

  {/* Results */}
  {result && (
    <>
      {/* Primary caption card */}
      <div className="rounded-3xl border border-violet-500/30 bg-[#0c0c1e] overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 via-cyan-500 to-violet-500"/>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
              Generated Caption
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30">
                {activeCaption.length} chars
              </span>
              {result.rate_limit.remaining > 0 && (
                <span className="text-[10px] text-white/25">
                  {result.rate_limit.remaining} left
                </span>
              )}
            </div>
          </div>

          {/* Editable caption */}
          <textarea
            value={activeCaption}
            onChange={e => setActiveCaption(e.target.value)}
            rows={4}
            className="w-full bg-white/4 rounded-xl border border-white/8 px-4 py-3 text-sm text-white leading-relaxed resize-none focus:outline-none focus:border-violet-500/40 mb-4"
          />

          {/* Hashtags */}
          {result.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {result.hashtags.map((h, i) => (
                <span key={i}
                  className="text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-1">
                  {h.startsWith('#') ? h : `#${h}`}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={copyCaption}
              className="flex-1 rounded-xl py-3 text-sm font-bold transition-all"
              style={{
                background: copied ? '#10b981' : 'linear-gradient(135deg, #7c3aed, #0891b2)',
                color: 'white',
              }}
            >
              {copied ? '✓ Copied! Token earned 🎉' : '📋 Copy Caption'}
            </button>

            {/* Platform share buttons */}
            {platform === 'x' && (
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(result.share_text)}`}
                target="_blank" rel="noopener noreferrer"
                onClick={claimReward}
                className="rounded-xl px-4 py-3 text-sm font-bold bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-all"
              >
                Post to 𝕏
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Alternate captions */}
      {result.alt_captions.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">
            Alternate Captions
          </p>
          <div className="space-y-3">
            {result.alt_captions.map((cap, i) => (
              <button
                key={i}
                onClick={() => setActiveCaption(cap)}
                className={`w-full text-left rounded-xl border px-4 py-3 text-xs leading-relaxed transition-all ${
                  activeCaption === cap
                    ? 'border-violet-500/40 bg-violet-500/10 text-white'
                    : 'border-white/8 bg-white/2 text-white/60 hover:border-white/20 hover:text-white'
                }`}
              >
                {cap}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/25 mt-2">
            Click any caption to switch to it
          </p>
        </div>
      )}

      {/* Dynasty AI report (if loaded) */}
      {report && (
        <div className="rounded-2xl border border-cyan-500/20 bg-[#0c0c1e] p-5">
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3">
            🤖 Dynasty AI Report
          </p>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            {report.overallOutlook}
          </p>

          {/* Window status badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${
              report.windowStatus === 'READY_TO_COMPETE'
                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                : report.windowStatus === 'REBUILDING'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
            }`}>
              {report.windowStatus?.replace(/_/g,' ')}
            </span>
            <span className="text-xs text-white/40">
              Confidence: {report.confidenceScore}/100
            </span>
          </div>

          {/* Top assets */}
          {report.topDynastyAssets?.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
                Top Dynasty Assets
              </p>
              <div className="space-y-1.5">
                {report.topDynastyAssets.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-white/3 px-3 py-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                      a.dynastyTier === 'elite' ? 'bg-yellow-500/20 text-yellow-300' :
                      a.dynastyTier === 'strong' ? 'bg-green-500/20 text-green-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {a.dynastyTier?.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-white/80">{a.name}</span>
                    <span className="text-[10px] text-white/40 ml-auto">{a.reason?.slice(0,40)}...</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key recommendations */}
          {report.keyRecommendations?.length > 0 && (
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
                Key Moves
              </p>
              <div className="space-y-1">
                {report.keyRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <span className="text-cyan-400 shrink-0">→</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Token reward tracker */}
      {rewards && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-0.5">
                🎁 Share Tokens
              </p>
              <p className="text-xs text-white/40">
                Copy or share your caption to earn 1 free AI token per day
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-yellow-400">{rewards.unredeemedTokens}</div>
              <div className="text-[10px] text-yellow-400/60">available</div>
            </div>
          </div>
          {!rewards.canShareToday && (
            <p className="text-[11px] text-green-400 mt-3 flex items-center gap-1">
              ✓ You already earned your token for today — come back tomorrow!
            </p>
          )}
        </div>
      )}
    </>
  )}
</div>
```

---

## Step 7 — Add to Dashboard Tools Tab

Find the dashboard Tools tab or Tools Hub.
Add "Career Share" card with the exact same pattern as other tools:

```typescript
{
  name:        "Career Share",
  description: "Generate AI-powered social captions for your fantasy career stats, trades, league standings, and waiver picks. Earn tokens for sharing.",
  href:        "/career-share",
  category:    ["AI & Assistant"],
  badge:       "Grok AI",
  featured:    true,
  icon:        "🚀",
  related:     ["Social Pulse", "Manager Comparison"],
}
```

---

## Final Checks

```bash
npx tsc --noEmit
```

Commit:
```bash
git add app/career-share/page.tsx
git add app/tools-hub/ToolsHubClient.tsx
git commit -m "feat: add Career Share page with Grok captions, dynasty report, and token rewards"
```

---

## Constraints

- DO NOT change any of the three API routes
- No new npm dependencies
- No any / no @ts-ignore
- All 5 share types must work with the correct request body shape
- Rate limit countdown uses setInterval that clears on unmount
- Caption is editable before copying
- Copying the caption auto-claims the daily reward token
- The X/Twitter post button opens the native tweet intent URL
- Dynasty report is loaded separately on demand — not blocking the main flow
