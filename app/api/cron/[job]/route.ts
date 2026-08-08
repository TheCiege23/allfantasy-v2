import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Route-count consolidation: every static sibling under this directory used to
 * be its own route file, which pushed the app past Vercel's hard 2048-route
 * ceiling (deploys fail with too_many_routes). This single dynamic dispatcher
 * serves the IDENTICAL URLs - each sibling's logic now lives in its colocated
 * handler.ts (same directory, same relative imports, same behavior).
 * Do NOT add new route.ts files under this directory - add a handler.ts and
 * register it in the map below.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // max across all handlers in this cluster

const HANDLERS: Record<string, () => Promise<Record<string, unknown>>> = {
  'adp-refresh': () => import('../adp-refresh/handler'),
  'decision-os-intelligence-maintenance': () => import('../decision-os-intelligence-maintenance/handler'),
  'decision-os-snapshot-capture': () => import('../decision-os-snapshot-capture/handler'),
  'draft-pool-prewarm': () => import('../draft-pool-prewarm/handler'),
  'draft-tick': () => import('../draft-tick/handler'),
  'fantasy-os-exec-sync': () => import('../fantasy-os-exec-sync/handler'),
  'import-depth-charts': () => import('../import-depth-charts/handler'),
  'import-injuries': () => import('../import-injuries/handler'),
  'import-news': () => import('../import-news/handler'),
  'import-nfl-team-defense': () => import('../import-nfl-team-defense/handler'),
  'import-player-game-stats': () => import('../import-player-game-stats/handler'),
  'import-players': () => import('../import-players/handler'),
  'import-projections': () => import('../import-projections/handler'),
  'import-schedules': () => import('../import-schedules/handler'),
  'import-scores': () => import('../import-scores/handler'),
  'import-season-stats': () => import('../import-season-stats/handler'),
  'import-standings': () => import('../import-standings/handler'),
  'legacy-import-drain': () => import('../legacy-import-drain/handler'),
  'live-score-tick': () => import('../live-score-tick/handler'),
  'morning-briefing': () => import('../morning-briefing/handler'),
  'recompute-allfantasy-adp': () => import('../recompute-allfantasy-adp/handler'),
  'sync-player-images': () => import('../sync-player-images/handler'),
  'trade-grade-notify': () => import('../trade-grade-notify/handler'),
  'trade-weekly-recalibration': () => import('../trade-weekly-recalibration/handler'),
  'waivers': () => import('../waivers/handler'),
  'weekly-awards': () => import('../weekly-awards/handler'),
  'world-cup-bracket-reminders': () => import('../world-cup-bracket-reminders/handler'),
}

type Ctx = { params: Promise<{ job: string }> | { job: string } }

async function dispatch(method: string, req: NextRequest, ctx: Ctx): Promise<Response> {
  const params = await ctx.params
  const name = params.job
  const load = HANDLERS[name]
  if (!load) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const mod = await load()
  const fn = mod[method]
  if (typeof fn !== 'function') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  return (fn as (r: NextRequest, c?: unknown) => Promise<Response>)(req, ctx)
}

export const GET = (req: NextRequest, ctx: Ctx) => dispatch('GET', req, ctx)
export const POST = (req: NextRequest, ctx: Ctx) => dispatch('POST', req, ctx)
