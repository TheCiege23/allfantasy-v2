/**
 * GET /api/xp/events?managerId=&sport=&eventType=&limit=
 * Returns XPEventView[] for "How did I earn this XP?".
 */

import { NextResponse } from 'next/server'
import { getEventsByManagerId } from '@/lib/xp-progression/ManagerXPQueryService'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const managerId = url.searchParams.get('managerId')
    if (!managerId) {
      return NextResponse.json({ error: 'Missing managerId' }, { status: 400 })
    }
    const sport = url.searchParams.get('sport') ?? undefined
    const eventType = url.searchParams.get('eventType') ?? undefined
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 500) : 100

    const events = await getEventsByManagerId(managerId, { sport, eventType, limit })
    return NextResponse.json({ managerId, events })
  } catch (e) {
    console.error('[xp/events GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load XP events' },
      { status: 500 }
    )
  }
}
