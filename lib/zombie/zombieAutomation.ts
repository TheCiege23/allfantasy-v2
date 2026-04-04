import { prisma } from '@/lib/prisma'
import { runWeeklyResolution } from '@/lib/zombie/weeklyResolutionEngine'
import { syncUniverseStats } from '@/lib/zombie/universeStatEngine'

/**
 * Called from score-sync cron or `/api/zombie/automation` to advance weekly horde state.
 */
export async function runZombieAutomationTick(): Promise<{
  leaguesProcessed: number
  errors: string[]
}> {
  const errors: string[] = []
  const active = await prisma.zombieLeague.findMany({
    where: { status: { in: ['active', 'registering'] } },
  })

  let leaguesProcessed = 0
  for (const z of active) {
    try {
      const week = Math.max(1, z.currentWeek || 1)
      await runWeeklyResolution(z.id, week)
      if (z.universeId) {
        await syncUniverseStats(z.universeId, week)
      }
      leaguesProcessed += 1
    } catch (e) {
      errors.push(`${z.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { leaguesProcessed, errors }
}
