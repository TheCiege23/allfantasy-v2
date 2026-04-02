# POWER_RANKINGS_TASK.md
# Drop into repo root. In Cursor: @POWER_RANKINGS_TASK.md implement step by step

## What This Builds

1. **`lib/workers/power-rankings-worker.ts`** — dedicated BullMQ worker for
   background ranking computation (refresh, psychology, dynasty roadmap)

2. **`app/api/power-rankings/worker/route.ts`** — API to enqueue jobs and
   poll status/results

3. **`app/power-rankings/page.tsx`** — full league power rankings page at
   /power-rankings with league gate, table, expanded manager rows, manager
   psychology, dynasty roadmap, and forward odds simulations

---

## Step 1 — Read these files completely before writing anything

```
app/rankings/RankingsClient.tsx          ← 712 lines — read ALL of it
app/rankings/page.tsx
app/api/rankings/route.ts                ← 102 lines
app/api/rankings/league-v2/route.ts     ← 215 lines
app/api/rankings/manager-psychology/route.ts  ← 496 lines — read ALL
app/api/rankings/dynasty-roadmap/route.ts     ← 238 lines
app/api/rankings/adaptive/route.ts            ← 61 lines
app/api/rankings/weight-evolution/route.ts
lib/workers/simulation-worker.ts         ← worker pattern to mirror exactly
lib/queues/bullmq.ts                     ← redis + redisConnection exports
lib/engine/archetypes.ts
lib/engine/scoring.ts
lib/engine/context-builder.ts
app/api/league/list/route.ts
app/api/league/roster/route.ts
prisma/schema.prisma                     ← League, LeagueTeam models
lib/auth.ts
app/waiver-ai/page.tsx                   ← league gate pattern to copy
app/trade-evaluator/page.tsx             ← visual style reference
```

DO NOT change any existing rankings API routes.
DO NOT change RankingsClient.tsx.
DO NOT change simulation-worker.ts.

---

## Step 2 — Create lib/workers/power-rankings-worker.ts

Mirror simulation-worker.ts exactly. Use queue name "power-rankings".

Imports (exact same pattern as simulation-worker.ts):
```typescript
import { Worker, Job } from "bullmq"
import { redisConnection } from "@/lib/queues/bullmq"
import { prisma } from "@/lib/prisma"
```

Job data interface:
```typescript
type PowerRankingsJobData = {
  jobType:      'refresh-rankings' | 'psychology' | 'dynasty-roadmap'
  leagueId:     string
  rosterId?:    number
  managerName?: string
  baseUrl?:     string   // so internal fetches know the host
}
```

Worker processes three job types:

### 'refresh-rankings':
```
1. job.updateProgress(10)
2. Fetch from Sleeper:
   GET https://api.sleeper.app/v1/league/{leagueId}
   GET https://api.sleeper.app/v1/league/{leagueId}/rosters
   GET https://api.sleeper.app/v1/league/{leagueId}/users
3. job.updateProgress(40)
4. Fetch rankings from internal API:
   GET {baseUrl}/api/rankings?leagueId={leagueId}&mode=composite
5. job.updateProgress(70)
6. Fetch league-v2 data:
   GET {baseUrl}/api/rankings/league-v2?leagueId={leagueId}
7. job.updateProgress(90)
8. Store result in League.settings via Prisma:
   await prisma.league.updateMany({
     where: { platformLeagueId: leagueId },
     data: { settings: { rankingsCache: result, cachedAt: new Date().toISOString() } }
   })
9. job.updateProgress(100)
10. return { ok: true, rankings: result }
```

### 'psychology':
```
1. job.updateProgress(20)
2. POST {baseUrl}/api/rankings/manager-psychology
   Body: { leagueId, rosterId, managerName }
   Read manager-psychology/route.ts to find exact request shape
3. job.updateProgress(80)
4. Store result:
   Update League.settings.psychologyCache[rosterId] via Prisma
5. job.updateProgress(100)
6. return { ok: true, psychology: result }
```

### 'dynasty-roadmap':
```
1. job.updateProgress(20)
2. POST {baseUrl}/api/rankings/dynasty-roadmap
   Body: { leagueId, rosterId }
   Read dynasty-roadmap/route.ts for exact request shape
3. job.updateProgress(80)
4. return { ok: true, roadmap: result }
```

Worker boilerplate (copy from simulation-worker.ts):
```typescript
let worker: Worker<PowerRankingsJobData> | null = null

if (!redisConnection) {
  console.warn("[power-rankings-worker] Redis not configured. Worker disabled.")
} else {
  worker = new Worker<PowerRankingsJobData>(
    "power-rankings",
    async (job: Job<PowerRankingsJobData>) => {
      // switch on job.data.jobType
    },
    {
      connection: redisConnection.url
        ? { url: redisConnection.url }
        : { host: redisConnection.host!, port: redisConnection.port! },
    }
  )
  worker.on("completed", (job) => console.log("[power-rankings-worker] completed", job.id))
  worker.on("failed", (job, err) => console.error("[power-rankings-worker] failed", job?.id, err))
}

export { worker as powerRankingsWorker }
```

---

## Step 3 — Create app/api/power-rankings/worker/route.ts

Read lib/queues/bullmq.ts first.
Create a new Queue using the exact same pattern as existing queues.

```typescript
import { Queue } from "bullmq"
import { redisConnection } from "@/lib/queues/bullmq"

const powerRankingsQueue = redisConnection
  ? new Queue("power-rankings", { connection: redisConnection })
  : null
```

### POST /api/power-rankings/worker
Auth: getServerSession → 401 if no session.

Request body:
```typescript
{
  jobType:      'refresh-rankings' | 'psychology' | 'dynasty-roadmap'
  leagueId:     string
  rosterId?:    number
  managerName?: string
}
```

Validation:
- If no queue (Redis not configured): return 503 { error: 'Queue not available' }
- If missing leagueId: return 400 { error: 'leagueId required' }

Add job:
```typescript
const job = await powerRankingsQueue.add(body.jobType, {
  ...body,
  baseUrl: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
})
return NextResponse.json({ jobId: job.id, status: 'queued' })
```

### GET /api/power-rankings/worker?jobId=X
Auth: getServerSession → 401 if no session.

```typescript
const job = await powerRankingsQueue.getJob(jobId)
if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

const state    = await job.getState()
const progress = job.progress as number ?? 0
const result   = job.returnvalue ?? null

return NextResponse.json({ jobId, status: state, progress, result })
```

---

## Step 4 — Create app/power-rankings/page.tsx

### SCREEN 1 — LEAGUE GATE

Copy the exact LeagueGate component from app/waiver-ai/page.tsx.
Same fetch logic, same card layout, same empty state.
On league select → move to Screen 2.

### SCREEN 2 — POWER RANKINGS MAIN

#### Sticky Header:
```
[🏆 Power Rankings]  [league name pill]  [sport badge]
                     [Refresh Rankings button]  [Change League]
```

Refresh Rankings button:
- On click → POST /api/power-rankings/worker { jobType: 'refresh-rankings', leagueId }
- Receives jobId → polls GET /api/power-rankings/worker?jobId every 2s
- Shows inline progress bar (0-100%) in header while running
- On status='completed' → reload rankings data + stop polling
- On status='failed' → show error toast + stop polling
- Use useRef for interval: `const pollRef = useRef<NodeJS.Timeout | null>(null)`
- Cleanup on unmount: `clearInterval(pollRef.current)`

#### Rankings Data Loading:
On league select → fetch existing rankings:
```typescript
const res = await fetch(`/api/rankings?leagueId=${league.sleeperLeagueId ?? league.id}`)
const data = await res.json()
```
Read app/api/rankings/route.ts to understand response shape.
Map response to local TeamRanking[] type.

#### HERO ROW — 4 stat cards:

```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ 🏆 CHAMPION FAV  │ │ 💪 STRONGEST     │ │ 📈 MARKET LEADER │ │ 🔄 TRADE MARKET  │
│ Bosto23          │ │ ROSTER           │ │ Bosto23          │ │ Import trades to │
│ Rank #1 · 0-0    │ │ Bosto23          │ │ Highest market   │ │ unlock market    │
│ Score 79         │ │ Value 51,250     │ │ Score 100        │ │ data             │
│                  │ │ Best starters    │ │                  │ │ Open Trade Hub → │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

Gold glow / Green glow / Cyan glow / Violet glow respectively.
Read RankingsClient.tsx to find the exact data fields used for these.

#### RANKING VIEW TABS:
Read RankingsClient.tsx to find all existing tab types.
Render them as horizontal scrollable pills.
Active tab: teal bottom border + white text.
Switching tabs: pass view type param to the rankings API.

#### MAIN RANKINGS TABLE:

TypeScript type for a row:
```typescript
interface TeamRanking {
  rank:          number
  rosterId:      number
  teamName:      string
  managerName:   string
  record:        string   // "3-1"
  score:         number
  winScore:      number   // WS
  powerScore:    number   // PS
  mvScore:       number   // MVS
  trend:         'up' | 'down' | 'neutral'
  strength:      string
  risk:          string
  phase:         string   // "Rebuilding", "Contender", etc
  // expanded data (loaded on demand):
  rankExplanation?:  RankExplanation
  forwardOdds?:      ForwardOdds
  luckMeter?:        LuckMeter
  keyDrivers?:       KeyDriver[]
  winWindow?:        WinWindow
  positionValues?:   PositionValues
  nextSteps?:        NextStep[]
  insight?:          string
  psychology?:       ManagerPsychology
  dynastyRoadmap?:   DynastyRoadmap
}

interface RankExplanation {
  confidence:    'Good' | 'Fair' | 'Low'
  rankLabel:     string   // e.g. "MEDIUM (55)"
  tooEarly:      boolean
  win:           number
  pwr:           number
  lck:           number
  mkt:           number
  mgr:           number
  whyChanged:    { label: string; direction: 'up'|'down'; value: string }[]
}

interface ForwardOdds {
  playoffs:  number  // 0-100
  top3:      number
  title:     number
  simCount:  number  // 1000
}

interface LuckMeter {
  status:        'Lucky' | 'Neutral' | 'Unlucky'
  position:      number  // 0-100 on the bar
  actualRecord:  string
  shouldBeRecord: string
  luckWins:      number
  insight:       string
}

interface KeyDriver {
  label:     string
  direction: 'positive' | 'negative'
  weight:    number   // percent
  detail:    string
}

interface WinWindow {
  label:      string  // "Flexible", "Win Now", "Rebuild"
  detail:     string
  confidence: string
}

interface PositionValues {
  QB: number; RB: number; WR: number; TE: number
  starterValue: number
  benchDepth:   number
}

interface NextStep {
  label:  string
  impact: 'LOW' | 'MEDIUM' | 'HIGH'
  detail: string
}

interface ManagerPsychology {
  archetype:       string
  decisionStyle:   string
  tradeTendencies: string
  draftStyle:      string
  strengths:       string[]
  weaknesses:      string[]
  insight:         string
}

interface DynastyRoadmap {
  overall:    string
  confidence: string
  years:      { year: number; action: string; priority: string; rationale: string }[]
}
```

Table rows — render each TeamRanking:

```
Rank  [Avatar] Team Name        Record  Score  [WS/PS/MVS bars]  Trend  Strength  Risk  [▼]
```

Row left border color:
- Rank 1: `border-l-4 border-yellow-400`
- Rank 2: `border-l-4 border-gray-300`
- Rank 3: `border-l-4 border-amber-600`
- Other:  `border-l-4 border-transparent`

Phase badge (Rebuilding / Contender / etc):
- Rebuilding: blue bg
- Contender:  green bg
- Mid-Pack:   gray bg

WS/PS/MVS bars:
Three thin colored bars stacked vertically, each showing score/100 fill.

Trend:
- ▲ = green text
- ▼ = red text
- — = white/40 text

Expand/collapse:
- Click anywhere on row → toggle expanded state
- Expanded row: `max-height: 2000px, opacity: 1` (CSS transition)
- Collapsed:    `max-height: 0, opacity: 0, overflow: hidden`

#### EXPANDED ROW DETAIL:

Two-column layout inside expanded row:

LEFT (60%):
Use data from the TeamRanking fields above.
All sections are collapsible cards.
Load detail data lazily on first expand:
```typescript
if (!team.rankExplanation) {
  // fetch from /api/rankings/league-v2?leagueId=X&rosterId=Y
  // store in teams state
}
```

**RANK EXPLANATION card:**
```
[Good Confidence] [MEDIUM (55)]
[TOO EARLY — Not enough games played]  ← only if tooEarly

WIN ████████░░  50    PWR ████████░░  91
LCK ████░░░░░░  50    MKT ██████░░░░  82
MGR ████░░░░░░  50
```

**WHY RANK CHANGED card:**
```
▲ Roster strength up      91 percentile
▲ Rising market value     82 percentile
▲ Bench depth up           2 bench rank
```
▲ = green arrow, ▼ = red arrow

**FORWARD ODDS card:**
```
FORWARD ODDS                1,000 sims
Playoffs   ████████████████░░░░  59.6%   (green bar)
Top 3      ████████░░░░░░░░░░░░  32.1%   (blue bar)
Title      ████░░░░░░░░░░░░░░░░  11.2%   (gold bar)
```
Bars animate in width from 0 to actual% on expand.

**CONFIDENCE card:**
```
[shield icon] Good Confidence
Ranking confidence 81/100 — most data sources available but some may be aging.
```

**KEY DRIVERS card (2-col grid):**
```
┌─────────────────────┐  ┌─────────────────────┐
│ ▲ Strong Starters   │  │ ▲ High Asset Value   │
│   41%               │  │   32%                │
│   Starter %ile: 91% │  │   Market %ile: 82%   │
└─────────────────────┘  └─────────────────────┘
┌─────────────────────┐
│ ▲ Deep Bench        │
│   25%               │
│   Bench #2, 24,043  │
└─────────────────────┘
```
Teal left border for ▲ positive.
Red left border for ▼ negative.

**WIN WINDOW card:**
```
Flexible            ← big bold label in appropriate color
Could pivot either way
Confidence: Low
```
Win Now = red/amber gradient text
Rebuild  = blue gradient text
Flexible = cyan gradient text

**LUCK METER card:**
```
LUCK METER                    [Neutral]
Unlucky |━━━━━━━━━━━━━━━━━━━━━━━━━━━━━| Lucky
         ▲ (marker position)

Actual Record  │  Should-Be Record
    0-0        │       0-0
              Luck:  0 wins

[icon] Steady as she goes. Your record reflects your roster
strength accurately. No luck skew detected.
→ Look for marginal upgrades — a small edge at TE or FLEX...
```

**POSITION VALUES row:**
```
QB      RB      WR      TE
17.9k   17.9k   21.9k   12.0k

Starter Value: 45,721   │   Bench Depth: 24,043
```

**NEXT STEPS card:**
```
[LOW IMPACT]  Review your rankings
Your team is performing as expected — monitor weekly changes...
```
LOW = gray badge, MEDIUM = yellow badge, HIGH = red badge

RIGHT (40%):

**YOUR COACH card (sticky within expanded row):**
```
Your Coach                [MEDIUM (55)]

[Get My Coaching Insight]   ← teal gradient button
[Generate 3-5 Year Plan]    ← outline button
```

On "Get My Coaching Insight" click:
- Show loading spinner inside the button
- POST /api/power-rankings/worker { jobType: 'psychology', leagueId, rosterId, managerName }
- Poll every 2s until status='completed'
- On complete: render MANAGER PSYCHOLOGY section

**MANAGER PSYCHOLOGY section (appears after coaching insight loads):**
Read manager-psychology/route.ts to find exact response fields.
The route exports: ManagerData, ArchetypeDefinition, computeDeterministicArchetype, buildFallbackProfile

Display:
```
[The Analyst]  ← violet archetype badge

Decision Style: Data-driven, methodical
Trade Tendencies: Patient, waits for value
Draft Style: BPA with positional awareness

Strengths                    Weaknesses
[Deep research] [Patient]    [Risk-averse] [Slow pivot]

"This manager consistently outperforms in dynasty by building
 through the draft. Their trade history shows discipline..."
```
AI insight: italic, cyan left border

On "Generate 3-5 Year Plan" click:
- Show loading spinner
- POST /api/power-rankings/worker { jobType: 'dynasty-roadmap', leagueId, rosterId }
- Poll until complete
- Render DYNASTY ROADMAP

**DYNASTY ROADMAP section:**
Read dynasty-roadmap/route.ts for response shape (YearPlan type).

Display as horizontal timeline:
```
Year 1          Year 2          Year 3          Year 4          Year 5
[REBUILD]       [ACQUIRE]       [WIN NOW]       [SUSTAIN]       [DYNASTY]
Trade aging     Stack picks     Go all-in on    Reload via      Establish
veterans for    and youth       2027 season     draft           legacy
picks           assets
```
Each year card: colored pill + action label + rationale text
Mobile: horizontal scroll

---

## Step 5 — Register the worker

Find where simulation-worker.ts is imported/started.
It may be in:
- A separate worker process file
- `lib/workers/index.ts`
- A cron route that starts it

Import and start power-rankings-worker.ts the same way:
```typescript
import "@/lib/workers/power-rankings-worker"
```

---

## Visual Design

```
bg:      #07071a
cards:   #0c0c1e
borders: border-white/8

Hero cards:
  Champion Favorite: gold    #f59e0b glow
  Strongest Roster:  green   #10b981 glow
  Market Leader:     cyan    #06b6d4 glow
  Trade Market:      violet  #7c3aed glow

Table:
  Rank 1 row: border-l-4 border-yellow-400
  Rank 2 row: border-l-4 border-gray-300
  Rank 3 row: border-l-4 border-amber-600
  Expanded:   bg-white/2 border-t border-cyan-500/20

Forward Odds bars:
  Playoffs: #10b981
  Top 3:    #3b82f6
  Title:    #f59e0b
  Bar width animates 0% → actual% on expand (CSS transition 700ms)

Luck meter:
  Bar: linear-gradient(90deg, #ef4444, #fbbf24, #10b981)
  Marker: white triangle at position %

Win Window:
  Win Now:  text bg-gradient red→amber
  Rebuild:  text bg-gradient blue
  Flexible: text bg-gradient cyan

Key drivers:
  ▲ positive: border-l-2 border-teal-500
  ▼ negative: border-l-2 border-red-500

Psychology:
  Archetype badge: bg-violet-500/20 text-violet-300
  Strengths chip:  bg-green-500/20 text-green-300
  Weakness chip:   bg-red-500/20 text-red-300
  AI insight:      italic, border-l-2 border-cyan-500

Dynasty timeline:
  Cards in horizontal row
  Each: rounded-2xl bg-white/4 border-white/10
  Year pill: teal gradient
  Mobile: overflow-x-auto scroll

Mobile (<768px):
  Table → stacked cards (one card per manager)
  Hero row → horizontal scroll
  Expanded content → single column
  Dynasty timeline → horizontal scroll
```

---

## All Buttons Must Work

- ✓ League gate → select league → load rankings table
- ✓ View tabs → switch ranking type
- ✓ Table row click → expand/collapse with animation
- ✓ Refresh Rankings → enqueue job → poll progress → reload data
- ✓ Get My Coaching Insight → enqueue psychology job → poll → show result
- ✓ Generate 3-5 Year Plan → enqueue roadmap job → poll → show timeline
- ✓ Open Trade Hub → navigate to /trade-evaluator
- ✓ Change League → reset to league gate
- ✓ Forward odds bars → animate in on row expand
- ✓ Luck meter bar → renders at correct position

---

## Final Checks

```bash
npx tsc --noEmit
node scripts/site-debugger.mjs --url http://localhost:3000 --suite tools
```

Commit only these files:
```bash
git add lib/workers/power-rankings-worker.ts
git add app/api/power-rankings/worker/route.ts
git add app/power-rankings/page.tsx
git commit -m "feat: add power rankings page with manager psychology, dynasty roadmap, and BullMQ worker"
```

---

## Constraints

- No any / no @ts-ignore
- No new npm dependencies beyond what already exists
- Worker uses exact same bullmq import pattern as simulation-worker.ts
- All polling uses useRef for interval cleanup — no memory leaks
- All Prisma writes are wrapped in try/catch — non-fatal
- Queue gracefully degrades if Redis is not configured (503 response)
- API routes all require getServerSession — 401 if unauthenticated
- The page uses 'use client' directive
- Don't change any existing rankings routes or RankingsClient.tsx
