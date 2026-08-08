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

const HANDLERS: Record<string, () => Promise<Record<string, unknown>>> = {
  'dashboard': () => import('../dashboard/handler'),
  'health': () => import('../health/handler'),
  'live': () => import('../live/handler'),
  'multi-bracket': () => import('../multi-bracket/handler'),
  'post-tournament': () => import('../post-tournament/handler'),
  'review': () => import('../review/handler'),
  'risk-profile': () => import('../risk-profile/handler'),
  'simulate-entry': () => import('../simulate-entry/handler'),
  'sleeper': () => import('../sleeper/handler'),
  'story': () => import('../story/handler'),
  'trash-talk': () => import('../trash-talk/handler'),
  'uniqueness': () => import('../uniqueness/handler'),
  'win-probability': () => import('../win-probability/handler'),
}

type Ctx = { params: Promise<{ tool: string }> | { tool: string } }

async function dispatch(method: string, req: NextRequest, ctx: Ctx): Promise<Response> {
  const params = await ctx.params
  const name = params.tool
  const load = HANDLERS[name]
  if (!load) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const mod = await load()
  const fn = mod[method]
  if (typeof fn !== 'function') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  return (fn as (r: NextRequest, c?: unknown) => Promise<Response>)(req, ctx)
}

export const GET = (req: NextRequest, ctx: Ctx) => dispatch('GET', req, ctx)
export const POST = (req: NextRequest, ctx: Ctx) => dispatch('POST', req, ctx)
