# SOCIAL_PULSE_TASK.md
# Drop into repo root. In Cursor: @SOCIAL_PULSE_TASK.md implement step by step

## What This Builds

A dedicated **Social Pulse** page at `/social-pulse` that improves the existing
Market Board feature with better accuracy, a richer UI, and real-time sentiment
visualization. Uses the existing Grok live X + web search backend — no new API
needed. Adds the card to the Tools Hub.

---

## What Already Exists (DO NOT change these)

```
app/api/legacy/social-pulse/route.ts    ← 203 lines — Grok + X search + web search
lib/social-pulse-schema.ts              ← Zod schemas for request/response
lib/xai-client.ts                       ← XAI/Grok client
lib/ai-player-context.ts                ← getUniversalAIContext()
lib/rate-limit.ts                       ← rate limiting
```

The API route at `POST /api/legacy/social-pulse` already:
- Uses Grok 4 with live `x_search` and `web_search` tools
- Searches last 7 days of X posts and web news
- Returns: `summary`, `bullets`, `market[]`, `connections[]`, `pulseScore`
- Each market item has: `player`, `signal`, `reason`, `confidence`, `impactScore`, `recencyHours`

Signal types:
```typescript
'up' | 'down' | 'mixed' | 'injury' | 'hype' |
'buy_low' | 'sell_high' | 'released' | 'traded' | 'idp_scarcity'
```

Request schema:
```typescript
{
  sport:      'NFL' | 'NBA'
  format:     'redraft' | 'dynasty' | 'specialty'
  idpEnabled: boolean  (optional, default false)
  players:    string[] (1-20 player/team/coach names)
  league_id?: string
}
```

---

## Step 1 — Read these files completely before writing anything

```
app/api/legacy/social-pulse/route.ts
lib/social-pulse-schema.ts
lib/xai-client.ts
lib/ai-player-context.ts
app/waiver-ai/page.tsx           (visual style + pattern reference)
app/trade-evaluator/page.tsx     (visual style reference)
```

---

## Step 2 — Create app/social-pulse/page.tsx

New page at `/social-pulse`. No league gate needed — this is a public research tool.
Auth is still checked: unauthenticated users see the tool but get 401 on submit.

### FULL PAGE LAYOUT:

```
┌──────────────────────────────────────────────────────────────┐
│  STICKY HEADER                                               │
│  [📡 Social Pulse]  [NFL ▼]  [Dynasty ▼]  [IDP toggle]      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  HERO SECTION                                                │
│  Understand player narratives before the market shifts.      │
│  Powered by Grok AI with live X + web search                 │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────┬────────────────────────────────┐
│  LEFT: SEARCH PANEL         │  RIGHT: RESULTS PANEL          │
│  (320px fixed)              │  (flex-1)                      │
│                             │                                │
│  [Player/Team input]        │  [Empty state OR results]      │
│  [Quick picks]              │                                │
│  [Get Social Pulse button]  │                                │
│  [Recent searches]          │                                │
└─────────────────────────────┴────────────────────────────────┘
```

---

### LEFT PANEL — SEARCH:

**Title:** Social Pulse
**Subtitle:** Live X and web search for real-time player/team news and sentiment

**Player Input:**
```
Players, Teams, or Coaches (comma-separated)
[e.g. Josh Allen, Keon Coleman, Buffalo Bills         ]
```
- Textarea, 2 rows
- On Enter → submits (if Shift+Enter, add newline)
- Shows parsed player count: "3 players" badge as you type
- Max 20 players enforced client-side

**Format toggle:**
```
Format:  [Dynasty]  [Redraft]
```
Single-select pills — Dynasty is default

**Sport toggle:**
```
Sport:  [NFL]  [NBA]
```
Single-select — NFL is default

**IDP toggle:**
```
☐ IDP leagues
```
Checkbox — off by default. Only shows if sport=NFL.

**Quick picks (predefined popular searches):**
```
TRENDING SEARCHES
[Josh Allen]  [Ja'Marr Chase]  [Christian McCaffrey]
[Bijan Robinson]  [Breece Hall]  [Jordan Love]
[Buffalo Bills offense]  [Injury report]
```
Clicking a chip adds it to the input.

**"Get Social Pulse" button:**
- Full width, purple gradient
- Shows loading state with animated dots when running
- Disabled when input is empty

**Recent searches** (localStorage):
```
RECENT
[Josh Allen, Keon Coleman (2m ago)]  [x]
[Bijan Robinson (1h ago)]            [x]
```
Click to reload that search.
Clear all button.

---

### RIGHT PANEL — RESULTS:

#### EMPTY STATE:
```
[📡 icon]
Enter player names, teams, or coaches to get the latest
real-time news from X and the web.
Search for multiple names to find connections between them.

WHAT YOU'LL GET:
  📊 Market signal (Buy Low / Sell High / Injury / Hype...)
  🔍 Live X posts from the last 7 days
  🌐 Web news and beat reporter updates
  🔗 Cross-player connections and trade implications
```

#### LOADING STATE:
```
[animated pulse icon]
Searching X and the web...
[dots animation]
Using Grok AI with live X search and web search
```

#### RESULTS (after API response):

**PULSE SCORE banner** (full width, prominent):
```
┌──────────────────────────────────────────────────────────────┐
│  MARKET PULSE SCORE                              [87/100]    │
│  ████████████████████████████████████░░░░░░░░░  HIGH HEAT   │
│  Last updated: just now • Sources: X + Web • 7-day window   │
└──────────────────────────────────────────────────────────────┘
```
Pulse score color:
  80-100 = red "HIGH HEAT"
  60-79  = orange "ELEVATED"
  40-59  = yellow "MODERATE"
  0-39   = gray "QUIET"

**AI SUMMARY card:**
```
┌──────────────────────────────────────────────────────────────┐
│  [Grok icon] AI NARRATIVE SUMMARY                            │
│                                                              │
│  [summary text from API]                                     │
└──────────────────────────────────────────────────────────────┘
```

**KEY BULLETS card:**
```
┌──────────────────────────────────────────────────────────────┐
│  📌 KEY SIGNALS                                              │
│                                                              │
│  • [bullet 1]                                                │
│  • [bullet 2]                                                │
│  • [bullet 3]                                                │
└──────────────────────────────────────────────────────────────┘
```

**PLAYER SIGNAL CARDS** (one per player in market[]):
```
┌──────────────────────────────────────────────────────────────┐
│  [RB] Josh Allen           📈 BUY LOW        [82] confidence │
│  ────────────────────────────────────────────────────────    │
│  Impact: ████████████░░░░  78/100                            │
│  Recency: 3 hours ago                                        │
│                                                              │
│  "Strong game narrative trending after Sunday's             │
│   performance. Fantasy managers undervaluing..."             │
└──────────────────────────────────────────────────────────────┘
```

Signal badge colors:
  up          → green  "📈 RISING"
  down        → red    "📉 FALLING"
  mixed       → yellow "⚡ MIXED"
  injury      → red    "🚑 INJURY ALERT"
  hype        → cyan   "🔥 HYPE"
  buy_low     → teal   "💎 BUY LOW"
  sell_high   → orange "💰 SELL HIGH"
  released    → gray   "✂️ RELEASED"
  traded      → blue   "🔄 TRADED"
  idp_scarcity → purple "🛡️ IDP SCARCITY"

Confidence ring (same SVG ring component as waiver AI AI score):
  80-100 = green
  50-79  = yellow
  0-49   = red

Impact bar:
  Full-width progress bar showing impactScore/100
  Animates in on load

Recency chip:
  "3 hours ago" / "12 hours ago" / "2 days ago"
  Green if < 6h, yellow if < 24h, gray if older

**CONNECTIONS card** (if connections[] is non-empty):
```
┌──────────────────────────────────────────────────────────────┐
│  🔗 CROSS-PLAYER CONNECTIONS                                 │
│                                                              │
│  • Josh Allen injury report + Keon Coleman usage spike       │
│  • Bills offense trending after Monday's game thread         │
└──────────────────────────────────────────────────────────────┘
```

**SEND TO TRADE ANALYZER button** (always visible after results):
```
[⇄ Analyze a trade involving these players →]
```
Navigates to /trade-evaluator with player names pre-filled.

---

## Step 3 — Accuracy Improvements to the API Route

The existing route at `app/api/legacy/social-pulse/route.ts` is already good
but needs these improvements. Read the file first, then make surgical edits:

### 3a — Improve the system prompt for accuracy:

Find the `SYSTEM` constant and add these instructions after the existing ones:

```
ACCURACY REQUIREMENTS:
- Only report information you found via tool calls — never hallucinate
- If a search returns no results for a player, say so explicitly
- Include the approximate time of each signal (hours/days ago)
- Distinguish between official team news and fan speculation
- For injuries: only report if you found an official report or beat reporter source
- For trades: only report confirmed or credibly rumored transactions
- Set recencyHours based on the actual timestamp of the source you found
- Set confidence lower (< 60) when information is speculative or unconfirmed
- Set confidence higher (> 80) when information is from official team accounts or beat reporters
```

### 3b — Improve the user prompt builder:

Find `buildUserPrompt` in the route. Add to its output:

```
- Search for each player by full name AND common nickname (e.g. "CeeDee Lamb" AND "CD Lamb")
- Also search for "<player name> fantasy" to capture fantasy-specific discourse
- If searching NFL players, also check for relevant team hashtags
```

### 3c — Add source attribution:

In the response, add a `sources` field (extend the schema if needed):
```typescript
sources?: string[]   // URLs or source descriptions found during search
```

This gives users confidence that the data is real.

---

## Step 4 — Add to Tools Hub

Find the tools hub registry files (from previous task research):
```
lib/tool-hub/types.ts
lib/tool-hub/FeaturedToolResolver.ts
lib/tool-hub/SportToolFilterResolver.ts
lib/seo-landing/config.ts
```

Read their structure and add:

```typescript
{
  name:        "Social Pulse",
  slug:        "social-pulse",
  description: "Real-time player and team sentiment from X and the web. Know what the market is saying before it moves. Powered by Grok AI with live search.",
  href:        "/social-pulse",
  category:    ["AI & Assistant"],
  badge:       "Live",        // indicates real-time data
  featured:    true,
  icon:        "📡",
  related:     ["Fantasy Trade Analyzer", "Waiver Wire Advisor"],
}
```

Add a "Live" badge style (if it doesn't exist):
```typescript
// In whatever badge component is used:
Live: "bg-green-500/20 border-green-500/30 text-green-400 animate-pulse"
```

Add to filter tabs in the All Tools section:
- Appears under: All, AI & Assistant
- If there's a "Research" or "Analysis" category, add it there too

---

## Visual Design

```
bg:      #07071a
cards:   #0c0c1e
borders: border-white/8

Pulse Score bar colors:
  HIGH HEAT (80-100): from-red-500 to-orange-400
  ELEVATED  (60-79):  from-orange-500 to-yellow-400
  MODERATE  (40-59):  from-yellow-500 to-yellow-300
  QUIET     (0-39):   from-gray-600 to-gray-400

Signal badge colors (match signal types):
  up          → bg-green-500/20  text-green-300  border-green-500/30
  down        → bg-red-500/20    text-red-300    border-red-500/30
  mixed       → bg-yellow-500/20 text-yellow-300 border-yellow-500/30
  injury      → bg-red-600/30    text-red-200    border-red-600/40
  hype        → bg-cyan-500/20   text-cyan-300   border-cyan-500/30
  buy_low     → bg-teal-500/20   text-teal-300   border-teal-500/30
  sell_high   → bg-orange-500/20 text-orange-300 border-orange-500/30
  released    → bg-gray-500/20   text-gray-300   border-gray-500/30
  traded      → bg-blue-500/20   text-blue-300   border-blue-500/30
  idp_scarcity → bg-violet-500/20 text-violet-300 border-violet-500/30

Player signal cards:
  Left border color matches signal type
  Hover: border-white/20

Confidence ring: same SVG component as waiver AI score ring
  radius 14, strokeWidth 3, rotated -90deg

Impact bar: white/10 bg, signal-color fill, animates width on mount

Recency chip:
  < 6h:   bg-green-500/15  text-green-400
  < 24h:  bg-yellow-500/15 text-yellow-400
  older:  bg-white/8       text-white/30

Quick pick chips:
  bg-white/6 text-white/50 hover:bg-white/10 hover:text-white
  rounded-full px-3 py-1 text-xs font-semibold

Mobile:
  Left panel stacks above results
  Player signal cards: single column
  Pulse score bar: condensed
```

---

## All Buttons Must Work

- ✓ Sport toggle (NFL/NBA) → changes sport in request
- ✓ Format toggle (Dynasty/Redraft) → changes format in request
- ✓ IDP checkbox → toggles idpEnabled
- ✓ Player input → type player names comma-separated
- ✓ Quick pick chips → add player to input
- ✓ "Get Social Pulse" → calls POST /api/legacy/social-pulse
- ✓ Recent searches → reload previous search
- ✓ Clear recent → removes from localStorage
- ✓ "Send to Trade Analyzer" → /trade-evaluator with players prefilled
- ✓ Error state shows API error message
- ✓ Rate limit (429) → shows "Try again in X seconds" countdown

---

## localStorage Keys

```
social-pulse-recent     → JSON array of recent searches (max 5)
social-pulse-format     → last used format ('dynasty' | 'redraft')
social-pulse-sport      → last used sport ('NFL' | 'NBA')
```

---

## Error Handling

| Status | User-facing message |
|--------|---------------------|
| 401    | "Sign in to use Social Pulse" + sign in button |
| 429    | "Rate limit reached. Try again in [N]s" + countdown |
| 500    | "Grok search failed. Try again." |
| Network | "Connection error — check your internet" |

---

## Final Checks

```bash
npx tsc --noEmit
node scripts/site-debugger.mjs --url http://localhost:3000 --suite tools
```

Manual test:
1. Navigate to /social-pulse
2. Type "Josh Allen, Keon Coleman" → hit Get Social Pulse
3. Verify: pulse score shows, signal cards render, bullets appear
4. Test rate limit: submit 11 times in 60s → should show 429 message
5. Check Tools Hub: Social Pulse card visible, clickable, routes to /social-pulse

Commit:
```bash
git add app/social-pulse/page.tsx
git add app/api/legacy/social-pulse/route.ts   # only if you changed it
git add lib/social-pulse-schema.ts              # only if you changed it
git add lib/tool-hub/types.ts
git add lib/tool-hub/FeaturedToolResolver.ts
git add lib/seo-landing/config.ts
git commit -m "feat: add Social Pulse page with live Grok X+web search, signal cards, and tools hub card"
```

---

## Constraints

- DO NOT change the API route URL — it stays at /api/legacy/social-pulse
- DO NOT add new npm dependencies
- The "Live" badge on the tools hub card must pulse/animate (CSS animation)
- Player signal cards must load with staggered animation (each 100ms apart)
- Impact bar width animates from 0% to actual value on mount
- All localStorage reads are wrapped in try/catch
- Rate limit countdown uses setInterval that clears on component unmount
- No any / no @ts-ignore
