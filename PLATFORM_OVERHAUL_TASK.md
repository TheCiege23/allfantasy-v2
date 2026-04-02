# PLATFORM_OVERHAUL_TASK.md
# Drop into repo root. In Cursor: @PLATFORM_OVERHAUL_TASK.md implement step by step
# This is a large task — implement one PHASE at a time, tsc after each phase.

---

## What This Changes

This is a sweeping platform-level change across 6 areas:

1. **Multi-sport AI** — every tool works for NFL, NBA, MLB (not just NFL)
2. **New import → rank workflow** — import triggers rank calculation, locked per platform
3. **Platform identity** — username changes on 3rd-party sites track to AF user
4. **League invites** — commissioner gets invite link, smart routing for new/existing users
5. **Manager roles & orphan teams** — O/C/CC badges, team claim flow
6. **League type mapping** — guillotine, best ball, survivor etc. map to AF equivalents
7. **UI cohesion** — the app never looks detached; everything flows as one

---

## Step 1 — Read ALL of these before writing a single line

```
lib/legacy-import.ts                         (585 lines — inferLeagueType, runLegacyImport)
lib/ranking/computeLegacyRank.ts             (208 lines — computeLegacyRankPreview)
lib/ranking/difficulty.ts
lib/ranking/config.ts
app/api/legacy/rank/refresh/route.ts         (190 lines)
app/api/legacy/identity-sync/route.ts        (93 lines)
app/api/import-sleeper/route.ts              (292 lines — cachedSleeperFetch, processLeague)
app/api/legacy/import/route.ts              (100 lines)
prisma/schema.prisma                         (LegacyUser, LegacyLeague, LegacyUserRankCache,
                                              LeagueTeam, League, LegacyImportJob)
lib/sleeper-client.ts
app/waiver-ai/page.tsx                       (visual reference)
app/trade-evaluator/page.tsx                 (visual reference)
app/page.tsx                                 (homepage — for UI cohesion context)
```

---

## PHASE 1 — Database Schema Changes

Add these new models and fields to `prisma/schema.prisma`.

### 1a — Add `PlatformIdentity` model (multi-platform identity tracking)

```prisma
model PlatformIdentity {
  id              String   @id @default(uuid())
  userId          String                    // AF user ID
  platform        String                    // 'sleeper' | 'yahoo' | 'mfl' | 'fantrax' | 'espn'
  platformUserId  String                    // immutable ID from the platform
  platformUsername String                   // display name — CAN change
  displayName     String?                   // current display name
  avatarUrl       String?
  sport           String   @default("nfl")  // which sport this identity covers
  isVerified      Boolean  @default(false)
  firstImportAt   DateTime?                 // when first import happened
  rankLocked      Boolean  @default(false)  // true after first import triggers rank
  lastSyncedAt    DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([platform, platformUserId])      // one identity per platform per user ID
  @@index([userId])
}
```

### 1b — Add `LeagueInvite` model

```prisma
model LeagueInvite {
  id          String    @id @default(uuid())
  leagueId    String                         // AF League ID
  token       String    @unique @default(uuid())
  createdBy   String                         // commissioner AF user ID
  expiresAt   DateTime?
  maxUses     Int       @default(50)
  useCount    Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())

  league      League    @relation(fields: [leagueId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([leagueId])
}
```

### 1c — Add `LeagueManagerClaim` model (for invite → team assignment)

```prisma
model LeagueManagerClaim {
  id              String   @id @default(uuid())
  leagueId        String
  afUserId        String                      // who claimed
  teamExternalId  String                      // which team they claimed
  platformUserId  String?                     // their ID on the source platform
  claimedAt       DateTime @default(now())
  isConfirmed     Boolean  @default(false)

  league          League   @relation(fields: [leagueId], references: [id])

  @@unique([leagueId, afUserId])
  @@unique([leagueId, teamExternalId])
}
```

### 1d — Add fields to `LeagueTeam` model

Add these fields to the existing `LeagueTeam` model:
```prisma
  role            String   @default("member")  // 'commissioner' | 'co_commissioner' | 'member' | 'orphan'
  isOrphan        Boolean  @default(false)
  claimedByUserId String?                      // AF user ID who claimed this team
  platformUserId  String?                      // source platform user ID for matching
```

### 1e — Add `rankImportCount` to `LegacyUserRankCache`

Add to existing `LegacyUserRankCache`:
```prisma
  rankImportCount  Int      @default(0)        // increments on each platform's first rank
  rankSources      Json?                       // { sleeper: true, yahoo: false, ... }
  lastRankResetAt  DateTime?                   // set when user disputes + gets re-rank
```

### 1f — Add relation to `League` for invites and claims

Add to existing `League` model:
```prisma
  invites         LeagueInvite[]
  managerClaims   LeagueManagerClaim[]
```

### 1g — Run migration

```bash
npx prisma migrate dev --name "platform_identity_invites_roles"
```

---

## PHASE 2 — New Import → Rank Workflow

### The Rule (implement exactly):

> When a user imports from a platform for the **first time**, their full history
> is imported AND their rank is computed and locked.
> After that, leagues and stats update normally but rank does NOT change
> for that platform.
> The user can request one re-rank per platform if they believe the first
> import was incomplete (dispute flow).

### 2a — Create `lib/platform-identity.ts`

```typescript
// lib/platform-identity.ts
// Handles multi-platform identity management

import { prisma } from '@/lib/prisma'

export type Platform = 'sleeper' | 'yahoo' | 'mfl' | 'fantrax' | 'espn'

/**
 * Upsert a platform identity for an AF user.
 * Always tracks by platformUserId (immutable), updates username if changed.
 */
export async function upsertPlatformIdentity(
  afUserId:       string,
  platform:       Platform,
  platformUserId: string,
  platformUsername: string,
  opts?: {
    displayName?: string
    avatarUrl?:   string
    sport?:       string
  }
) {
  const existing = await prisma.platformIdentity.findFirst({
    where: { platform, platformUserId }
  })

  if (existing) {
    // Username may have changed — update it but keep the identity linked to same AF user
    return prisma.platformIdentity.update({
      where: { id: existing.id },
      data: {
        platformUsername,    // update username
        displayName:   opts?.displayName ?? platformUsername,
        avatarUrl:     opts?.avatarUrl,
        lastSyncedAt:  new Date(),
      }
    })
  }

  return prisma.platformIdentity.create({
    data: {
      userId:          afUserId,
      platform,
      platformUserId,
      platformUsername,
      displayName:     opts?.displayName ?? platformUsername,
      avatarUrl:       opts?.avatarUrl,
      sport:           opts?.sport ?? 'nfl',
      firstImportAt:   new Date(),
      lastSyncedAt:    new Date(),
    }
  })
}

/**
 * Check if a platform's rank has been locked for this user.
 * Returns true if this is NOT the first import (rank already locked).
 */
export async function isPlatformRankLocked(
  afUserId: string,
  platform: Platform
): Promise<boolean> {
  const identity = await prisma.platformIdentity.findFirst({
    where: { userId: afUserId, platform }
  })
  return identity?.rankLocked ?? false
}

/**
 * Lock the rank for a platform after first import rank is computed.
 */
export async function lockPlatformRank(
  afUserId: string,
  platform: Platform
) {
  await prisma.platformIdentity.updateMany({
    where:  { userId: afUserId, platform },
    data:   { rankLocked: true, firstImportAt: new Date() },
  })
}

/**
 * Find an AF user by their platform identity (handles username changes).
 * Always match by platformUserId, not username.
 */
export async function findAfUserByPlatformId(
  platform:       Platform,
  platformUserId: string
): Promise<string | null> {
  const identity = await prisma.platformIdentity.findFirst({
    where: { platform, platformUserId }
  })
  return identity?.userId ?? null
}
```

### 2b — Update `app/api/import-sleeper/route.ts`

Read the file fully first (292 lines, functions: `cachedSleeperFetch`, `processLeague`, `POST`).

After the existing import completes successfully, add rank computation:

```typescript
// At the end of the POST handler, after leagues are imported:
import { isPlatformRankLocked, lockPlatformRank, upsertPlatformIdentity } from '@/lib/platform-identity'
import { computeLegacyRankPreview } from '@/lib/ranking/computeLegacyRank'

// Upsert platform identity (handles username changes)
await upsertPlatformIdentity(
  session.user.id,      // AF user ID
  'sleeper',
  sleeperUser.user_id,  // immutable Sleeper user ID
  sleeperUser.username, // may change
  {
    displayName: sleeperUser.display_name,
    avatarUrl:   sleeperUser.avatar,
    sport:       'nfl',
  }
)

// Compute and lock rank on first import only
const isLocked = await isPlatformRankLocked(session.user.id, 'sleeper')
if (!isLocked) {
  // Compute rank using all imported data
  await computeAndSaveRank(session.user.id)
  await lockPlatformRank(session.user.id, 'sleeper')
}

// Always update league data (stats sync is always allowed)
// ... existing league update code continues normally
```

### 2c — Create `lib/ranking/computeAndSaveRank.ts`

```typescript
// lib/ranking/computeAndSaveRank.ts
// Computes rank from all imported platform data and saves to LegacyUserRankCache

import { prisma }                  from '@/lib/prisma'
import { computeLegacyRankPreview } from '@/lib/ranking/computeLegacyRank'

export async function computeAndSaveRank(afUserId: string): Promise<void> {
  // Read all LegacyUser records linked to this AF user (there may be multiple platforms)
  // For now, find by userId — expand when multi-platform is added
  const legacyUser = await prisma.legacyUser.findFirst({
    where: { /* link to AF user — check actual schema relation */ },
    include: {
      leagues:   true,
      aiReports: true,
    }
  })

  if (!legacyUser) return

  // Compute rank using existing function
  const rankResult = await computeLegacyRankPreview(legacyUser)

  // Save to LegacyUserRankCache
  await prisma.legacyUserRankCache.upsert({
    where:  { legacyUserId: legacyUser.id },
    create: {
      legacyUserId:   legacyUser.id,
      careerXp:       BigInt(rankResult.careerXp       ?? 0),
      careerLevel:    rankResult.careerLevel    ?? 0,
      careerTier:     rankResult.careerTier     ?? 1,
      careerTierName: rankResult.careerTierName ?? 'Practice Squad',
    },
    update: {
      careerXp:       BigInt(rankResult.careerXp       ?? 0),
      careerLevel:    rankResult.careerLevel    ?? 0,
      careerTier:     rankResult.careerTier     ?? 1,
      careerTierName: rankResult.careerTierName ?? 'Practice Squad',
    }
  })
}
```

Read `lib/ranking/computeLegacyRank.ts` to understand the exact input/output
of `computeLegacyRankPreview` and update the above accordingly.

### 2d — Create dispute/re-rank flow

Create `app/api/legacy/rank/dispute/route.ts`:

```typescript
// POST /api/legacy/rank/dispute
// Allows user to request one re-rank if they believe import was incomplete
// Rate limited: 1 per platform per user, ever

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform } = await req.json()

  // Check if they've already disputed this platform
  const identity = await prisma.platformIdentity.findFirst({
    where: { userId: session.user.id, platform }
  })
  if (!identity) return NextResponse.json({ error: 'No import found for this platform' }, { status: 400 })
  if (identity.disputeUsed) return NextResponse.json({ error: 'You have already used your re-rank for this platform' }, { status: 429 })

  // Unlock rank, mark dispute used
  await prisma.platformIdentity.update({
    where: { id: identity.id },
    data:  { rankLocked: false, disputeUsed: true }
  })

  // Re-run the import + rank
  // ... trigger full re-import job

  return NextResponse.json({ ok: true, message: 'Re-rank initiated. Your rank will update once complete.' })
}
```

Add `disputeUsed Boolean @default(false)` to `PlatformIdentity` in schema.

---

## PHASE 3 — League Invite System

### 3a — Create `app/api/league/invite/route.ts`

```typescript
// POST — Commissioner creates an invite link
// GET  — Validates a token and returns league info

export async function POST(req: NextRequest) {
  // Auth: must be commissioner of the league
  // Create LeagueInvite, return token
  // Returns: { inviteUrl: `https://allfantasy.ai/join/${token}` }
}

export async function GET(req: NextRequest) {
  // ?token=X
  // Returns league name, team count, commissioner name
  // Used by join page before auth
}
```

### 3b — Create `app/join/[token]/page.tsx`

This is the invite landing page. The routing is smart:

```typescript
'use client'
// On mount:
// 1. Fetch GET /api/league/invite?token=X — get league info
// 2. Check session
//    - Has session + league already joined → redirect /app/league/{id}
//    - Has session, not in league → show "Claim Your Team" step
//    - No session → show "Sign in to join" OR "Create account"

// FLOW after auth is confirmed:
// Show all unclaimed teams in the league (isOrphan === true OR claimedByUserId === null)
// User picks which team is theirs from a grid of manager name/avatar cards
// One-click confirm: POST /api/league/invite/claim
// Redirect to /app/league/{leagueId}
```

The team picker UI:
```tsx
// Grid of manager cards — unclaimed teams
{unclaimedTeams.map(team => (
  <button key={team.id} onClick={() => setSelectedTeam(team)}
    className={`rounded-2xl border p-4 text-left transition-all ${
      selectedTeam?.id === team.id
        ? 'border-teal-500 bg-teal-500/10'
        : 'border-white/10 bg-[#0c0c1e] hover:border-white/25'
    }`}>
    {/* Avatar */}
    <div className="w-12 h-12 rounded-full overflow-hidden mb-3">
      {team.avatarUrl
        ? <img src={team.avatarUrl} alt={team.ownerName}/>
        : <div className="w-full h-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 flex items-center justify-center font-black text-white">
            {team.ownerName[0]?.toUpperCase()}
          </div>
      }
    </div>
    <div className="font-bold text-white text-sm">{team.teamName}</div>
    <div className="text-xs text-white/50 mt-0.5">@{team.ownerName}</div>
    {team.role === 'commissioner' && (
      <span className="mt-2 inline-block text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">C</span>
    )}
  </button>
))}

<button onClick={handleClaim} disabled={!selectedTeam}
  className="w-full mt-4 rounded-2xl py-3 font-black bg-cyan-500 text-black disabled:opacity-30">
  That's me — Claim This Team →
</button>
```

### 3c — Create `app/api/league/invite/claim/route.ts`

```typescript
// POST: { token, teamExternalId }
// Auth required
// 1. Validate token
// 2. Check team is unclaimed
// 3. Create LeagueManagerClaim
// 4. Update LeagueTeam: claimedByUserId = session.user.id, isOrphan = false
// 5. Return { leagueId }
```

### 3d — Routing logic for invite links

```typescript
// In app/join/[token]/page.tsx:
// CASE 1: Logged in + already claimed a team in this league
//   → redirect('/app/league/' + leagueId)
// CASE 2: Logged in + not yet claimed
//   → show team picker
// CASE 3: Not logged in
//   → show two buttons:
//     [Sign In to Join] → /login?callbackUrl=/join/TOKEN
//     [Create Account & Join] → /signup?callbackUrl=/join/TOKEN
// The callbackUrl ensures they land back on the join page after auth
// where they then pick their team and get redirected to the league
```

---

## PHASE 4 — Manager Roles & Orphan Teams

### 4a — Import commissioner/co-commissioner from Sleeper

In `lib/legacy-import.ts` and `app/api/import-sleeper/route.ts`,
read the Sleeper `leagueData.metadata.co_commissioners` array and
`leagueData.draft_order` to identify:

```typescript
// When creating/updating LeagueTeam rows, set role field:
const isCommissioner   = sleeperRoster.owner_id === leagueData.commissioner_id
const isCoCommissioner = (leagueData.metadata?.co_commissioners ?? []).includes(sleeperRoster.owner_id)

await prisma.leagueTeam.update({
  where: { id: team.id },
  data: {
    role: isCommissioner   ? 'commissioner' :
          isCoCommissioner ? 'co_commissioner' : 'member',
    platformUserId: sleeperRoster.owner_id,  // for matching on invite claim
  }
})
```

### 4b — Mark orphan teams

When importing, mark teams with no Sleeper user as orphan:
```typescript
// If roster.owner_id is null or empty → orphan
const isOrphan = !sleeperRoster.owner_id || sleeperRoster.owner_id === ''
await prisma.leagueTeam.update({
  where: { id: team.id },
  data: {
    isOrphan: isOrphan,
    role:     isOrphan ? 'orphan' : existingRole,
  }
})
```

### 4c — Role badge component

Create `components/ManagerRoleBadge.tsx`:

```tsx
type Role = 'commissioner' | 'co_commissioner' | 'orphan' | 'member'

const ROLE_CONFIG: Record<Role, { label: string; color: string }> = {
  commissioner:    { label: 'C',  color: 'bg-amber-500/25 text-amber-400 border-amber-500/40' },
  co_commissioner: { label: 'CC', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  orphan:          { label: 'O',  color: 'bg-cyan-500/20  text-cyan-400  border-cyan-500/30'  },
  member:          { label: '',   color: '' },
}

export function ManagerRoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role]
  if (!cfg.label) return null
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}
```

Use this badge everywhere manager names appear in:
- League standings tables
- Power rankings
- Draft board team headers
- Trade finder partner cards
- Manager comparison

---

## PHASE 5 — League Type Mapping

Read `lib/legacy-import.ts` functions: `inferLeagueType`, `detectSpecialtyFormat`, `detectLeagueFormats`.

### 5a — Extend league type detection

Add/update league type mappings in `lib/legacy-import.ts`:

```typescript
export type AFLeagueFormat =
  | 'redraft'
  | 'keeper'
  | 'dynasty'
  | 'guillotine'     // survivor — one team eliminated each week
  | 'best_ball'      // no waiver, best possible lineup auto-set
  | 'survivor'       // same concept as guillotine
  | 'contract'       // auction with contracts
  | 'devy'           // college player dynasty
  | 'taxi'           // dynasty with taxi squad
  | 'idb'            // idp best ball
  | 'superflex'      // 2QB / superflex
  | 'cfb'            // college football

// Sleeper league type field mapping:
const SLEEPER_TYPE_MAP: Record<number, AFLeagueFormat> = {
  0: 'redraft',
  1: 'keeper',
  2: 'dynasty',
  3: 'best_ball',
}

// Guillotine detection: check settings.last_scored_leg or metadata
function isGuillotine(leagueData: SleeperLeague): boolean {
  return leagueData.settings?.squads === 1 ||
         leagueData.metadata?.['scoring_type'] === 'guillotine' ||
         leagueData.settings?.['last_scored_leg'] != null
}
```

### 5b — AF narrative for each league type

Create `lib/league-format-config.ts`:

```typescript
export const LEAGUE_FORMAT_CONFIG = {
  guillotine: {
    label:       'Guillotine',
    emoji:       '⚔️',
    color:       '#ef4444',
    description: 'One team is eliminated every week — the lowest scorer is cut.',
    afFeatures: [
      'Auto-elimination after each week scores lock',
      'AI tracks survivor probabilities for every team',
      'Waiver priority adjusts for remaining managers',
      'Weekly survival odds shown on power rankings',
    ],
    automations: [
      'Weekly low-scorer auto-elimination',
      'Prize pool redistribution tracking',
      'Survivor bracket visualization',
    ],
  },
  best_ball: {
    label:       'Best Ball',
    emoji:       '🎯',
    color:       '#06b6d4',
    description: 'No lineup setting needed — your best possible lineup is auto-optimized.',
    afFeatures: [
      'AI calculates your best possible lineup each week',
      'Upside analysis for every roster slot',
      'Injury risk tracking for your player pool',
    ],
    automations: [
      'Auto-lineup optimization',
      'Weekly upside reports',
    ],
  },
  dynasty: {
    label:       'Dynasty',
    emoji:       '👑',
    color:       '#f59e0b',
    description: 'Keep your roster year over year. Build a franchise.',
    afFeatures: [
      'Dynasty value tracking across seasons',
      'Age curve analysis for every player',
      'Rookie draft AI recommendations',
      '3-5 year roadmap generation',
    ],
    automations: [
      'Annual rookie draft board',
      'Dynasty value alerts',
    ],
  },
  keeper: {
    label:       'Keeper',
    emoji:       '🔒',
    color:       '#8b5cf6',
    description: 'Keep select players from season to season.',
    afFeatures: [
      'AI keeper value analysis',
      'Keeper vs draft pick tradeoff calculator',
    ],
    automations: [],
  },
  // Add redraft, contract, devy, superflex, cfb similarly...
}
```

### 5c — Show league type context everywhere leagues appear

In league cards, power rankings, and the dashboard, show the format label + emoji.
Never show a bare "Dynasty" or "Redraft" — always pair with the AF description.

---

## PHASE 6 — Multi-Sport AI Tool Support

Every AI tool currently defaults to NFL. Fix each one.

### Tools to fix:

```
app/trade-evaluator/page.tsx
app/waiver-ai/page.tsx
app/trade-finder/page.tsx
app/mock-draft/page.tsx
app/power-rankings/page.tsx
app/social-pulse/page.tsx
app/manager-compare/page.tsx
```

### 6a — Sport detection from league

When a tool loads with a selected league, read `league.sport` from the API response.
The `League` model has `sport: LeagueSport` (NFL | NBA | MLB).

Add sport to all tool request bodies:

```typescript
// In every tool that sends a league_id, also send sport:
body: JSON.stringify({
  league_id: league.sleeperLeagueId ?? league.id,
  sport:     league.sport ?? 'NFL',    // ← add this
  // ... rest of body
})
```

### 6b — Extend LeagueSport enum in schema

```prisma
enum LeagueSport {
  NFL
  NBA
  MLB
  NHL    // add
  CFB    // add — college football
  NBA2K  // add — NBA2K fantasy
}
```

### 6c — Update AI system prompts for multi-sport

In each API route that has a system prompt, make it sport-aware.
Find any prompt that says "fantasy football" or "NFL" and make it dynamic:

```typescript
const sportLabel = {
  NFL: 'fantasy football (NFL)',
  NBA: 'fantasy basketball (NBA)',
  MLB: 'fantasy baseball (MLB)',
  NHL: 'fantasy hockey (NHL)',
  CFB: 'college football fantasy (CFB)',
}[sport] ?? 'fantasy sports'

const SYSTEM_PROMPT = `You are an elite ${sportLabel} analyst...`
```

### 6d — Update waiver AI for multi-sport

The waiver AI currently calls NFL-specific player APIs.
When sport=NBA, use NBA player endpoints.
When sport=MLB, use MLB player endpoints.

```typescript
// In app/api/waiver-ai/route.ts:
const playerContextByExport = {
  NFL: fetchNFLPlayerContext,
  NBA: fetchNBAPlayerContext,
  MLB: fetchMLBPlayerContext,
}
const fetchContext = playerContextByExport[sport] ?? playerContextByExport.NFL
```

---

## PHASE 7 — UI Cohesion (Remove the "Detached App" Feel)

The screenshot shows a page that looks like a separate product embedded inside the app.
Everything must feel like one flowing experience.

### 7a — Remove the af-legacy iframe/embedded feel

The problem: `app/af-legacy/` pages have their own nav, their own tabs, and their own
"Back to Home" button — making users feel like they left the main app.

**Fix**: Audit `app/af-legacy/` pages. Each tool tab should route to the standalone
tool page instead (e.g., "AI Trade Hub" → `/trade-evaluator`, not an embedded tab).

The top-level `af-legacy` route should redirect to the dashboard.

### 7b — Dashboard is the hub, not af-legacy

The user's dashboard at `/dashboard` should be the central experience.
After import, users go to dashboard (not af-legacy).
All tool links from the dashboard go to standalone tool pages.

Update the dashboard to show:
- User's rank/tier badge (from LegacyUserRankCache)
- Connected platforms (PlatformIdentity rows)
- Their leagues (League model, grouped by sport)
- Quick access to all tools
- Import status per platform

### 7c — Import UX: make it feel native

The import flow should NOT be a separate page that feels detached.
It should be a modal/drawer from the dashboard or a guided step within the dashboard.

Create `components/ImportDrawer.tsx`:
```tsx
// Slides in from the right as a drawer
// Shows platform selection → username input → import progress → rank reveal
// Stays within the existing page layout
// On complete: rank reveal animation inline on dashboard
```

### 7d — Rank reveal after import

After first import triggers rank computation, show an inline reveal:
```tsx
// On dashboard after import completes:
<div className="rounded-3xl border border-amber-500/30 bg-amber-500/8 p-8 text-center">
  <div className="text-6xl mb-4 animate-bounce">🏆</div>
  <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Your AllFantasy Rank</div>
  <div className="text-5xl font-black text-white mb-2">{tier.tierName}</div>
  <div className="text-lg text-white/60">Level {tier.careerLevel} · {tier.careerXp.toLocaleString()} XP</div>
  <p className="text-sm text-white/45 mt-3 max-w-xs mx-auto">
    Earned from your complete history across {platformCount} platform{platformCount>1?'s':''}
  </p>
  <div className="text-xs text-white/25 mt-4">
    Your rank is now locked based on this import.
    You can dispute it once if you believe data was missed.
  </div>
  <button onClick={handleDispute} className="mt-3 text-xs text-white/40 underline hover:text-white transition-colors">
    Something's missing → Request re-rank
  </button>
</div>
```

---

## PHASE 8 — Schema Migration SQL

For the new fields added to existing `LeagueTeam`, create a manual migration
if `prisma migrate dev` doesn't auto-generate cleanly:

```sql
-- Add role and orphan fields to LeagueTeam
ALTER TABLE "LeagueTeam"
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS "isOrphan" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "claimedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "platformUserId" TEXT;

-- Create PlatformIdentity table
CREATE TABLE IF NOT EXISTS "PlatformIdentity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "platformUserId" TEXT NOT NULL,
  "platformUsername" TEXT NOT NULL,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "sport" TEXT NOT NULL DEFAULT 'nfl',
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "firstImportAt" TIMESTAMP(3),
  "rankLocked" BOOLEAN NOT NULL DEFAULT false,
  "disputeUsed" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformIdentity_platform_platformUserId_key"
  ON "PlatformIdentity"("platform", "platformUserId");

-- Create LeagueInvite table
CREATE TABLE IF NOT EXISTS "LeagueInvite" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "maxUses" INTEGER NOT NULL DEFAULT 50,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeagueInvite_token_key" ON "LeagueInvite"("token");

-- Create LeagueManagerClaim table
CREATE TABLE IF NOT EXISTS "LeagueManagerClaim" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "afUserId" TEXT NOT NULL,
  "teamExternalId" TEXT NOT NULL,
  "platformUserId" TEXT,
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY ("id")
);
```

---

## Files to Create / Modify Summary

| Action | File |
|--------|------|
| CREATE | `lib/platform-identity.ts` |
| CREATE | `lib/ranking/computeAndSaveRank.ts` |
| CREATE | `lib/league-format-config.ts` |
| CREATE | `components/ManagerRoleBadge.tsx` |
| CREATE | `components/ImportDrawer.tsx` |
| CREATE | `app/join/[token]/page.tsx` |
| CREATE | `app/api/league/invite/route.ts` |
| CREATE | `app/api/league/invite/claim/route.ts` |
| CREATE | `app/api/legacy/rank/dispute/route.ts` |
| MODIFY | `prisma/schema.prisma` |
| MODIFY | `app/api/import-sleeper/route.ts` |
| MODIFY | `lib/legacy-import.ts` |
| MODIFY | `app/trade-evaluator/page.tsx` (sport param) |
| MODIFY | `app/waiver-ai/page.tsx` (sport param) |
| MODIFY | `app/trade-finder/page.tsx` (sport param) |
| MODIFY | `app/power-rankings/page.tsx` (sport param) |
| MODIFY | `app/social-pulse/page.tsx` (sport param) |
| MODIFY | `app/mock-draft/page.tsx` (sport param) |

---

## Final Checks After Each Phase

```bash
npx prisma migrate dev    # after Phase 1
npx tsc --noEmit          # after each phase
node scripts/site-debugger.mjs --url http://localhost:3000 --suite all
```

Commit per phase:
```bash
git commit -m "feat(phase1): add PlatformIdentity, LeagueInvite, LeagueManagerClaim schema"
git commit -m "feat(phase2): new import→rank workflow with per-platform lock"
git commit -m "feat(phase3): league invite system with smart routing"
git commit -m "feat(phase4): manager roles O/C/CC and orphan team badges"
git commit -m "feat(phase5): league type mapping with AF narratives"
git commit -m "feat(phase6): multi-sport AI tool support"
git commit -m "feat(phase7): UI cohesion — dashboard as hub, import drawer"
```

---

## Constraints

- Never break existing Sleeper import flow — all changes are additive
- `computeLegacyRankPreview` is not changed — only called from new wrapper
- Rank lock is per-platform, not global — users can import Yahoo separately
- All invite tokens are UUIDs — never guessable, expire after 30 days or 50 uses
- Orphan "O" badge is cyan (distinguishable from team colors)
- Commissioner "C" badge is amber/gold
- Co-Commissioner "CC" badge is amber but lighter
- No `any` / no `@ts-ignore`
- All Prisma calls wrapped in try/catch
- Sport defaults to 'NFL' when not provided — never breaks existing tools
