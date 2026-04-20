import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveLeagueAccess } from '@/lib/league-access'
import { isElevatedCommissioner } from '@/server/services/permissionService'

export const dynamic = 'force-dynamic'

type FeedItem = {
  id: string
  source: 'league_event' | 'activity_legacy'
  type: string
  message: string
  title?: string | null
  visibility?: string | null
  createdAt: string
  metadata?: unknown
}

/**
 * GET — merged league feed: canonical `league_events` + legacy `activity_events` (backward compatible).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const access = await resolveLeagueAccess(leagueId, userId)
  if (!access?.isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const elevated = await isElevatedCommissioner(leagueId, userId)

  const [leagueRows, legacyRows] = await Promise.all([
    prisma.leagueEvent.findMany({
      where: {
        leagueId,
        ...(elevated ? {} : { visibility: { not: 'commissioners_only' } }),
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: {
        id: true,
        eventType: true,
        title: true,
        description: true,
        visibility: true,
        payload: true,
        createdAt: true,
      },
    }),
    prisma.activityEvent.findMany({
      where: { leagueId },
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: {
        id: true,
        type: true,
        message: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ])

  const fromLeague: FeedItem[] = leagueRows.map((r) => ({
    id: `le:${r.id}`,
    source: 'league_event',
    type: r.eventType,
    title: r.title,
    message: r.description ?? r.title,
    visibility: r.visibility,
    metadata: r.payload,
    createdAt: r.createdAt.toISOString(),
  }))

  const fromLegacy: FeedItem[] = legacyRows.map((r) => ({
    id: `ae:${r.id}`,
    source: 'activity_legacy',
    type: r.type,
    message: r.message,
    metadata: r.metadata,
    createdAt: r.createdAt.toISOString(),
  }))

  const merged = [...fromLeague, ...fromLegacy]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 80)

  return NextResponse.json({ items: merged })
}
