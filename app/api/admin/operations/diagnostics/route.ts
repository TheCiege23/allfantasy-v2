import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Read-only platform snapshot for admin triage (counts only).
 */
export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const [
      leagues,
      users,
      notificationsUnread,
      draftSessionsActive,
      waiverRuns24h,
    ] = await Promise.all([
      prisma.league.count(),
      prisma.appUser.count(),
      prisma.platformNotification.count({ where: { readAt: null } }),
      prisma.draftSession.count({
        where: { status: { in: ['pre_draft', 'in_progress', 'paused'] } },
      }),
      prisma.waiverRun.count({
        where: { runAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ])

    return NextResponse.json({
      data: {
        leagues,
        users,
        notificationsUnread,
        draftSessionsActive,
        waiverRuns24h,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (e) {
    console.error('[admin/operations/diagnostics]', e)
    return NextResponse.json({ error: 'Diagnostics failed' }, { status: 500 })
  }
}
