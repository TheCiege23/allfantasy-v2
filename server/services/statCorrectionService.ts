/**
 * Stat corrections: re-run weekly scoring for affected weeks (idempotent).
 * Persists idempotency keys in `stat_reprocess_logs` so retries are safe across processes.
 */
import { prisma } from '@/lib/prisma'
import { processLeagueWeek } from '@/server/services/weeklyProcessor'
import { computePlayoffSeeds } from '@/server/services/playoffEngine'

export async function reprocessWeekAfterStatCorrection(params: {
  leagueId: string
  season: number
  week: number
  idempotencyKey?: string
  refreshPlayoffSeeds?: boolean
}): Promise<{ ok: boolean; result?: Awaited<ReturnType<typeof processLeagueWeek>>; skipped?: boolean }> {
  const key = params.idempotencyKey ?? `reprocess:${params.leagueId}:${params.season}:${params.week}`

  const existing = await prisma.statReprocessLog.findUnique({ where: { key } })
  if (existing) {
    return { ok: true, skipped: true }
  }

  const result = await processLeagueWeek({
    leagueId: params.leagueId,
    season: params.season,
    week: params.week,
  })

  await prisma.statReprocessLog.create({
    data: {
      key,
      leagueId: params.leagueId,
      season: params.season,
      week: params.week,
    },
  })

  if (params.refreshPlayoffSeeds !== false) {
    try {
      await computePlayoffSeeds(params.leagueId, params.season)
    } catch (e) {
      console.warn('[statCorrectionService] playoff seed refresh', e)
    }
  }

  return { ok: true, result }
}
