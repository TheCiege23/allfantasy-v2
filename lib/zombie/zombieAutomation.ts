import { prisma } from '@/lib/prisma'
import { runWeeklyResolution } from '@/lib/zombie/weeklyResolutionEngine'
import { syncUniverseStats } from '@/lib/zombie/universeStatEngine'
import { processExpiredBashingDecisionsForAll } from '@/lib/zombie/bashingEngine'
import { scheduleWeeklyUpdate } from '@/lib/zombie/weeklyUpdateEngine'
import { deliverPendingAnimations } from '@/lib/zombie/animationEngine'

/**
 * Called from score-sync cron or `/api/zombie/automation` to advance weekly horde state.
 */
export async function runZombieAutomationTick(opts?: { force?: boolean }): Promise<{
  leaguesProcessed: number
  errors: string[]
  skippedIdempotent: number
}> {
  const errors: string[] = []
  let skippedIdempotent = 0
  try {
    await processExpiredBashingDecisionsForAll()
  } catch (e) {
    errors.push(`bashing-expiry: ${e instanceof Error ? e.message : String(e)}`)
  }

  const active = await prisma.zombieLeague.findMany({
    where: { status: { in: ['active', 'registering'] } },
  })

  let leaguesProcessed = 0
  for (const z of active) {
    try {
      const week = Math.max(1, z.currentWeek || 1)
      if (!opts?.force) {
        const done = await prisma.zombieWeeklyResolution.findUnique({
          where: { zombieLeagueId_week: { zombieLeagueId: z.id, week } },
        })
        if (done?.status === 'complete' && done.resolvedAt) {
          skippedIdempotent += 1
          continue
        }
      }
      await runWeeklyResolution(z.id, week, { force: opts?.force === true })
      if (z.universeId) {
        await syncUniverseStats(z.universeId, week)
      }
      await scheduleWeeklyUpdate(z.leagueId).catch((e) =>
        errors.push(`${z.id} weekly-update: ${e instanceof Error ? e.message : String(e)}`),
      )
      await deliverPendingAnimations(z.leagueId).catch((e) =>
        errors.push(`${z.id} animations: ${e instanceof Error ? e.message : String(e)}`),
      )
      leaguesProcessed += 1
    } catch (e) {
      errors.push(`${z.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { leaguesProcessed, errors, skippedIdempotent }
}
