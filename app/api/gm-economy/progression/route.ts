/**
 * GET /api/gm-economy/progression?managerId=&sport=&eventType=&limit=&offset=
 * Returns progression events for a manager (career timeline).
 */

import { NextResponse } from 'next/server'
import { listProgressionEvents } from '@/lib/gm-economy/GMProfileQueryService'

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
    const offsetParam = url.searchParams.get('offset')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50
    const offset = offsetParam != null ? Math.max(0, parseInt(offsetParam, 10)) : 0

    const { events, total } = await listProgressionEvents({
      managerId,
      sport,
      eventType,
      limit,
      offset,
    })

    return NextResponse.json({ managerId, events, total })
  } catch (e) {
    console.error('[gm-economy/progression GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load progression' },
      { status: 500 }
    )
  }
}
