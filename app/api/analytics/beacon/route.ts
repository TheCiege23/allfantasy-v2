import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recordAnalyticsEvent } from '@/lib/analytics/recordAnalyticsEvent'
import { ANALYTICS_TOOL_PRODUCT } from '@/lib/analytics/eventNames'

export const dynamic = 'force-dynamic'

const ALLOWED_PREFIXES = [
  'product.create_league.',
  'engagement.',
  'product.',
]

function isAllowedEvent(event: string): boolean {
  if (event.length === 0 || event.length > 200) return false
  return ALLOWED_PREFIXES.some((p) => event.startsWith(p))
}

export async function POST(req: NextRequest) {
  let body: { event?: string; sessionId?: string; path?: string; meta?: Record<string, unknown> }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const event = typeof body.event === 'string' ? body.event.trim() : ''
  if (!isAllowedEvent(event)) {
    return NextResponse.json({ ok: false, error: 'Event not allowed' }, { status: 400 })
  }

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  const sessionId =
    typeof body.sessionId === 'string' && body.sessionId.length <= 80 ? body.sessionId : null
  const path = typeof body.path === 'string' && body.path.length <= 500 ? body.path : null
  const meta =
    body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta)
      ? (body.meta as Record<string, unknown>)
      : null

  await recordAnalyticsEvent({
    event,
    toolKey: ANALYTICS_TOOL_PRODUCT,
    userId,
    sessionId,
    path,
    meta,
  })

  return NextResponse.json({ ok: true })
}
