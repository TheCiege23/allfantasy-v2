/**
 * GET /api/xp/events?managerId=&sport=&eventType=&limit=
 * Returns XPEventView[] for "How did I earn this XP?".
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEventsByManagerId } from '@/lib/xp-progression/ManagerXPQueryService'
import { XP_EVENT_TYPES } from '@/lib/xp-progression/types'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

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
    const sport =
      rawSport == null
        ? undefined
        : isSupportedSport(rawSport)
          ? normalizeToSupportedSport(rawSport)
          : null
    if (sport === null) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }
    const rawEventType = url.searchParams.get('eventType')
    const eventType =
      rawEventType && XP_EVENT_TYPES.includes(rawEventType as (typeof XP_EVENT_TYPES)[number])
        ? rawEventType
        : undefined
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
