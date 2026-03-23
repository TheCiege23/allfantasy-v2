/**
 * GET /api/gm-economy/progression?managerId=&sport=&eventType=&limit=&offset=
 * Returns progression events for a manager (career timeline).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listProgressionEvents } from '@/lib/gm-economy/GMProfileQueryService'
import { GM_PROGRESSION_EVENT_TYPES } from '@/lib/gm-economy/types'
import { isSupportedGMCareerSport, normalizeSportForGMCareer } from '@/lib/gm-economy/SportCareerResolver'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const managerId = url.searchParams.get('managerId')
    if (!managerId) {
      return NextResponse.json({ error: 'Missing managerId' }, { status: 400 })
    }
    if (managerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rawSport = url.searchParams.get('sport')
    const sport = rawSport
      ? isSupportedGMCareerSport(rawSport)
        ? normalizeSportForGMCareer(rawSport)
        : null
      : undefined
    if (sport === null) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }
    const rawEventType = url.searchParams.get('eventType')
    const eventType =
      rawEventType && GM_PROGRESSION_EVENT_TYPES.includes(rawEventType as (typeof GM_PROGRESSION_EVENT_TYPES)[number])
        ? rawEventType
        : undefined
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
