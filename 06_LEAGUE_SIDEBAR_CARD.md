# League Sidebar Card Redesign — Full Production Cursor Prompt

## FEATURE OVERVIEW
Replaces the existing inline league card rendering in the My Leagues right rail with a
new `LeagueSidebarCard` component featuring:
- Colored status dot (blue/yellow/green/gray)  
- Format meta line: "2026 • 12-Team Dynasty PPR"
- Commissioner COMM badge
- Paid/Free badge
- Platform color label
- Proper filtering (no ranking/legacy artifacts)

---

## CURSOR PROMPT

```
Read these files completely before changing anything:
  app/dashboard/components/LeagueListPanel.tsx
  app/dashboard/components/LeagueAvatar.tsx
  app/dashboard/components/RightControlPanel.tsx
  app/dashboard/types.ts
  app/api/league/list/route.ts
  lib/leagues/leagueListFilter.ts
  globals.css

══════════════════════════════════════════════════════
STEP 1 — FORMAT BUILDER UTILITY
══════════════════════════════════════════════════════

Create lib/leagues/leagueFormatLabel.ts

export function buildLeagueFormatLabel(league: {
  format?: string | null
  scoring?: string | null
  isDynasty?: boolean
  leagueVariant?: string | null
  teamCount?: number | null
  season?: number | string | null
}): string

Logic:
  parts = []
  1. Add year (season)
  2. Add "{teamCount}-Team {typeLabel}" where typeLabel is:
     - Dynasty if isDynasty or variant includes 'dynasty'
     - Keeper if variant includes 'keeper'
     - Guillotine if variant includes 'guillotine'
     - Best Ball if variant includes 'best_ball' or 'bestball'
     - Survivor, Big Brother, Zombie, Tournament if matching
     - Redraft (default)
  3. Add scoring if not 'standard':
     - 'ppr' → 'PPR'
     - 'half_ppr' or '0.5' → 'Half-PPR'
     - other: capitalize and show
  Return parts.join(' • ')

export function buildStatusConfig(status: string | undefined): {
  label: string
  dotColor: string
  textColor: string
  bgColor: string
  borderColor: string
}

Status colors:
  pre_draft  → blue  (bg-blue-400, text-blue-400)
  drafting   → yellow (bg-yellow-400, text-yellow-400)
  in_season/active → green (bg-green-400, text-green-400)
  complete/completed/off_season → gray (bg-white/30, text-white/35)
  default → white/25

══════════════════════════════════════════════════════
STEP 2 — LeagueSidebarCard COMPONENT
══════════════════════════════════════════════════════

Create components/league/LeagueSidebarCard.tsx

'use client'

Props:
  league: UserLeague
  isSelected?: boolean
  isFavorite?: boolean
  onSelect?: (league: UserLeague) => void
  onFavoriteToggle?: (leagueId: string) => void
  isDragging?: boolean
  isDropTarget?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  showRefreshButton?: boolean
  isRefreshing?: boolean
  isRefreshed?: boolean
  onRefresh?: (e: React.MouseEvent, leagueId: string) => void

LAYOUT (horizontal flex):
  [drag handle] [Link href="/league/{id}"] [★ favorite button]

Inside Link:
  [LeagueAvatar size=36] [text stack]

Text stack — 3 rows:
  ROW 1: League name (truncate) + Commissioner badge + Paid/Free badge
    isCommissioner → amber COMM badge: border-amber-500/30 bg-amber-500/15 text-amber-300
    isPaid → emerald Paid badge
    !isPaid → muted Free badge

  ROW 2: formatLabel from buildLeagueFormatLabel()
    text-[11px] text-white/45

  ROW 3: Status dot + status label + separator + platform label
    Dot: inline-block h-1.5 w-1.5 rounded-full {status.dotColor}
    Label: text-[10px] font-semibold {status.textColor}
    Platform: text-[10px] {getPlatformColor(league.platform)}

Platform colors:
  sleeper → text-emerald-400/70
  yahoo → text-violet-400/70
  espn → text-red-400/70
  default → text-white/35

Selected state: border-l-2 border-l-cyan-500 bg-cyan-500/[0.08]
Hover: hover:bg-white/[0.04]
Drop target: ring-1 ring-cyan-500/40

Sleeper refresh button: absolute top-1.5 right-8, opacity-0 group-hover:opacity-100

══════════════════════════════════════════════════════
STEP 3 — UPDATE LeagueListPanel
══════════════════════════════════════════════════════

UPDATE app/dashboard/components/LeagueListPanel.tsx

READ fully first.

KEEP exactly as-is:
  - All drag-and-drop logic
  - Favorites sorting + localStorage persistence
  - Search filter
  - Loading skeleton
  - Empty state
  - handleRefresh, handleFavoriteToggle
  - applySavedOrder

REPLACE only the per-league render block inside .map():

BEFORE: large inline JSX with Link, badges, pills
AFTER:
  <div key={league.id} onDragOver={...} onDrop={...}>
    <LeagueSidebarCard
      league={league}
      isSelected={league.id === selectedId}
      isFavorite={favoriteSet.has(league.id)}
      onSelect={onSelect}
      onFavoriteToggle={handleFavoriteToggle}
      isDragging={draggingId === league.id}
      isDropTarget={dropTargetId === league.id && draggingId !== league.id}
      dragHandleProps={{
        draggable: true,
        onDragStart: ...,
        onDragEnd: resetDragState,
      }}
      showRefreshButton={(league.platform || '').toLowerCase() === 'sleeper'}
      isRefreshing={refreshing[league.id] ?? false}
      isRefreshed={refreshed[league.id] ?? false}
      onRefresh={handleRefresh}
    />
  </div>

Remove dead functions: getPlatformPill, getLeagueStatusDisplay, getConceptBadge

══════════════════════════════════════════════════════
STEP 4 — UPDATE API + TYPES
══════════════════════════════════════════════════════

UPDATE app/api/league/list/route.ts
  Add normalizeSleeperScoring():
    'ppr' → 'PPR', 'half_ppr' → 'Half-PPR', else → 'Standard'
  Apply to normalizedSleeper map for scoring field

UPDATE app/dashboard/DashboardShell.tsx mapLeague()
  Verify these are mapped:
    leagueVariant, isDynasty, scoring, teamCount, season
    isCommissioner, isPaid, userRole
  Add any missing ones

UPDATE app/dashboard/types.ts
  Verify UserLeague has:
    isCommissioner?: boolean
    userRole?: 'commissioner' | 'member' | 'imported'
    isPaid?: boolean
    entryFee?: number | null
    leagueVariant?: string | null

══════════════════════════════════════════════════════
FILES TO CREATE/UPDATE
══════════════════════════════════════════════════════

CREATE:
  components/league/LeagueSidebarCard.tsx
  lib/leagues/leagueFormatLabel.ts

UPDATE:
  app/dashboard/components/LeagueListPanel.tsx
  app/dashboard/types.ts
  app/dashboard/DashboardShell.tsx
  app/api/league/list/route.ts

══════════════════════════════════════════════════════
FINAL STEPS
══════════════════════════════════════════════════════

1. npx tsc --noEmit — fix ALL type errors
2. git add -A
3. git commit -m "feat(my-leagues): LeagueSidebarCard — colored status dot, format meta line (Year • N-Team Format Scoring), Commissioner COMM badge, Paid/Free badge, platform color, buildLeagueFormatLabel/buildStatusConfig utilities, Sleeper scoring normalization"
4. git push origin main
5. Confirm Vercel build READY
6. Report commit hash
```
