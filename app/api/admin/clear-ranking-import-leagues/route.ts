/**
 * Admin-only one-shot endpoint: mark all leagueVariant=null Sleeper leagues
 * for the requesting user as leagueVariant='legacy_summary' so they no longer
 * appear in My Leagues.
 *
 * After running this, re-sync any leagues you want to track via the Sleeper
 * sync UI — explicit user-triggered syncs use forceActivate:true and will
 * overwrite the tag, making them visible in My Leagues again.
 *
 * POST /api/admin/clear-ranking-import-leagues
 * Body: { userId?: string }  — omit to clear for the currently logged-in user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isDevAdminUserId } from '@/lib/dev-admin/access'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const requesterId = session?.user?.id
  if (!requesterId || !isDevAdminUserId(requesterId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  // Allow targeting a specific userId, default to the calling admin's own account
  const targetUserId: string = typeof body.userId === 'string' && body.userId.trim()
    ? body.userId.trim()
    : requesterId

  const dryRun = body.dryRun === true

  // Find all Sleeper leagues with null variant for this user
  const affected = await (prisma as any).league.findMany({
    where: {
      userId: targetUserId,
      platform: 'sleeper',
      leagueVariant: null,
    },
    select: { id: true, name: true, season: true, status: true, platformLeagueId: true },
    orderBy: [{ season: 'desc' }, { name: 'asc' }],
  })

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      count: affected.length,
      leagues: affected,
      message: `Dry run: would mark ${affected.length} Sleeper league(s) as legacy_summary.`,
    })
  }

  if (affected.length === 0) {
    return NextResponse.json({ count: 0, message: 'Nothing to clear.' })
  }

  const ids = affected.map((r: { id: string }) => r.id)
  const result = await (prisma as any).league.updateMany({
    where: { id: { in: ids } },
    data: { leagueVariant: 'legacy_summary' },
  })

  return NextResponse.json({
    count: result.count,
    leagues: affected,
    message: `Marked ${result.count} Sleeper league(s) as legacy_summary. Re-sync real leagues via the Sleeper sync UI to make them visible again.`,
  })
}
