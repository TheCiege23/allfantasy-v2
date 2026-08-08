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
export const maxDuration = 60 // max across all handlers in this cluster

const HANDLERS: Record<string, () => Promise<Record<string, unknown>>> = {
  'animations': () => import('../animations/handler'),
  'audit': () => import('../audit/handler'),
  'automation': () => import('../automation/handler'),
  'bashing': () => import('../bashing/handler'),
  'chimmy': () => import('../chimmy/handler'),
  'commissioner': () => import('../commissioner/handler'),
  'commissioner-ui-prefs': () => import('../commissioner-ui-prefs/handler'),
  'event-feed': () => import('../event-feed/handler'),
  'inventory': () => import('../inventory/handler'),
  'items': () => import('../items/handler'),
  'league': () => import('../league/handler'),
  'matchups': () => import('../matchups/handler'),
  'payment-tracker': () => import('../payment-tracker/handler'),
  'resolution': () => import('../resolution/handler'),
  'rules-doc': () => import('../rules-doc/handler'),
  'settings': () => import('../settings/handler'),
  'status': () => import('../status/handler'),
  'status-board': () => import('../status-board/handler'),
  'universe': () => import('../universe/handler'),
  'universe-hub': () => import('../universe-hub/handler'),
  'universe-stats': () => import('../universe-stats/handler'),
  'weekly-update': () => import('../weekly-update/handler'),
  'whisperer': () => import('../whisperer/handler'),
}

type Ctx = { params: Promise<{ action: string }> | { action: string } }

async function dispatch(method: string, req: NextRequest, ctx: Ctx): Promise<Response> {
  const params = await ctx.params
  const name = params.action
  const load = HANDLERS[name]
  if (!load) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const mod = await load()
  const fn = mod[method]
  if (typeof fn !== 'function') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  return (fn as (r: NextRequest, c?: unknown) => Promise<Response>)(req, ctx)
}

export const GET = (req: NextRequest, ctx: Ctx) => dispatch('GET', req, ctx)
export const POST = (req: NextRequest, ctx: Ctx) => dispatch('POST', req, ctx)
export const PUT = (req: NextRequest, ctx: Ctx) => dispatch('PUT', req, ctx)
export const PATCH = (req: NextRequest, ctx: Ctx) => dispatch('PATCH', req, ctx)
