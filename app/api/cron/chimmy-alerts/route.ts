import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { runUnifiedAlertEngine } from '@/lib/chimmy-alerts'
import { loadActiveLeagueMembers } from '@/lib/chimmy-alerts/ChimmyAlertSignalHydrator'
import type { ChimmyAlertContext } from '@/lib/chimmy-alerts/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BATCH_SIZE = 40

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = req.nextUrl.searchParams
  const leagueId = params.get('leagueId') ?? undefined
  const sport = params.get('sport') ?? undefined
  const dryRun = params.get('dryRun') === 'true'
  const now = new Date()

  let cursor: string | undefined
  let totalProcessed = 0
  let totalDelivered = 0
  let totalSkipped = 0
  let batchCount = 0

  do {
    const { members, nextCursor } = await loadActiveLeagueMembers({
      limit: BATCH_SIZE,
      cursor,
      leagueId,
      sport,
      now,
    })

    for (const member of members) {
      const context: ChimmyAlertContext = {
        userId: member.userId,
        role: member.role,
        sport: member.sport,
        leagueType: member.leagueType,
        leagueId: member.leagueId,
        teamId: member.teamId,
        subscriptionState: {
          hasPremium: false,
          hasCommissioner: member.role === 'commissioner',
          hasAdmin: false,
        },
        signalBundle: member.signals,
        leagueState: member.leagueState,
        pageSurface: 'background',
        now,
      }

      try {
        const alerts = await runUnifiedAlertEngine(context, {
          autoDeliver: !dryRun,
        })
        totalDelivered += alerts.length
      } catch (err) {
        console.error(
          '[cron/chimmy-alerts] engine error',
          { userId: member.userId, leagueId: member.leagueId },
          err,
        )
        totalSkipped += 1
      }

      totalProcessed += 1
    }

    batchCount += 1
    cursor = nextCursor ?? undefined
  } while (cursor)

  return NextResponse.json({
    ok: true,
    dryRun,
    batches: batchCount,
    processed: totalProcessed,
    delivered: totalDelivered,
    skipped: totalSkipped,
    sport: sport ?? 'all',
    leagueId: leagueId ?? 'all',
  })
}
