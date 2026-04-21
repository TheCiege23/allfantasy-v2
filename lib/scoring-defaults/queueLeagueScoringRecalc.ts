import { prisma } from '@/lib/prisma'
import { processLeagueWeek } from '@/server/services/weeklyProcessor'

/**
 * After commissioner scoring overrides change, re-run weekly processing for the
 * league's current `settings.leg` (Sleeper-style week index) when present; otherwise week 1.
 * Fire-and-forget — does not block API responses.
 */
export function queueLeagueScoringRecalcAfterRulesChange(leagueId: string): void {
  void (async () => {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { season: true, settings: true },
      })
      if (!league) return
      const raw = league.settings as Record<string, unknown> | null | undefined
      const legRaw = raw?.leg
      const leg = typeof legRaw === 'number' ? legRaw : Number(legRaw)
      const week =
        Number.isFinite(leg) && leg >= 1 && leg <= 40 ? Math.floor(leg) : 1
      await processLeagueWeek({ leagueId, season: league.season, week })
    } catch (err) {
      console.warn('[commissioner-scoring] background week processing after rules change failed', {
        leagueId,
        err,
      })
    }
  })()
}
