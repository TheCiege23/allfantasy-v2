/**
 * Zombie weekly update scheduler & orchestration.
 * Triggered by automation system based on sport schedule.
 * Handles multi-league universes with coordinated updates.
 */

import { prisma } from '@/lib/prisma'
import { buildWeeklyUpdate, composeWeeklyUpdateBody } from '@/lib/zombie/weeklyUpdateEngine'
import { getZombieSportConfig } from '@/lib/zombie/sportRulesConfig'
import { getZombieSeasonSchedule } from '@/lib/zombie/zombieSeasonSchedule'

export type ZombieUpdateResult = {
  leagueId: string
  success: boolean
  week: number
  message?: string
  error?: string
}

/**
 * Trigger weekly update for a single zombie league.
 * Posts announcement to league chat + updates standings.
 */
export async function triggerZombieLeagueWeeklyUpdate(
  leagueId: string,
  week: number
): Promise<ZombieUpdateResult> {
  try {
    const z = await prisma.zombieLeague.findUnique({
      where: { leagueId },
      select: { id: true, status: true, sport: true, universeId: true },
    })
    if (!z) {
      return { leagueId, success: false, week, error: 'Zombie league not found' }
    }
    if (z.status !== 'active' && z.status !== 'in_progress') {
      return { leagueId, success: false, week, error: `League status ${z.status}, skipping update` }
    }

    // Build weekly update (infections, resource awards)
    const draft = await buildWeeklyUpdate(leagueId, week)
    const text = composeWeeklyUpdateBody(draft)

    // Get league owner for system announcement
    const lg = await prisma.league.findUnique({ where: { id: leagueId }, select: { userId: true } })
    if (!lg?.userId) {
      return { leagueId, success: false, week, error: 'League owner not found' }
    }

    // Post to league chat as host announcement
    await prisma.leagueChatMessage.create({
      data: {
        leagueId,
        userId: lg.userId,
        message: text.slice(0, 100_000),
        type: 'host_announcement',
        metadata: {
          senderIsHost: true,
          contentType: 'host_announcement',
          isPinned: true,
          zombieWeeklyUpdate: true,
          week,
        },
      },
    })

    // Create/update announcement record
    const existing = await prisma.zombieAnnouncement.findFirst({
      where: { zombieLeagueId: z.id, week, type: 'weekly_update' },
      orderBy: { createdAt: 'desc' },
    })

    if (existing && !existing.isPosted) {
      await prisma.zombieAnnouncement.update({
        where: { id: existing.id },
        data: { isPosted: true, postedAt: new Date(), content: text },
      })
    } else if (!existing) {
      await prisma.zombieAnnouncement.create({
        data: {
          zombieLeagueId: z.id,
          universeId: z.universeId,
          type: 'weekly_update',
          title: `Week ${week} — Horde Report`,
          content: text,
          week,
          isPosted: true,
          postedAt: new Date(),
          isPublic: true,
        },
      })
    }

    return { leagueId, success: true, week, message: 'Weekly update posted' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { leagueId, success: false, week, error: msg }
  }
}

/**
 * Trigger weekly updates for all leagues in a zombie universe.
 * Used when a 3-6 league universe needs coordinated updates.
 */
export async function triggerZombieUniverseWeeklyUpdates(
  universeId: string,
  week: number
): Promise<ZombieUpdateResult[]> {
  try {
    const universe = await prisma.zombieUniverse.findUnique({
      where: { id: universeId },
      select: { leagues: { select: { leagueId: true } } },
    })
    if (!universe) {
      return [{ leagueId: universeId, success: false, week, error: 'Universe not found' }]
    }

    const results: ZombieUpdateResult[] = []
    for (const league of universe.leagues) {
      if (league.leagueId) {
        const result = await triggerZombieLeagueWeeklyUpdate(league.leagueId, week)
        results.push(result)
      }
    }

    // Post universe-level summary to universe chat
    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length
    const universeMsg = {
      id: `universe-summary-w${week}-${Date.now()}`,
      userId: 'system',
      userName: 'Universe Horde Report',
      body:
        `📡 **Week ${week} Complete**: ${successCount} league(s) updated` +
        (failureCount > 0 ? `, ${failureCount} failed` : ''),
      createdAt: new Date().toISOString(),
    }

    const settings = (await prisma.zombieUniverse.findUnique({
      where: { id: universeId },
      select: { settings: true },
    }))?.settings as Record<string, unknown> | null

    const existing = settings?.universeChat
      ? Array.isArray(settings.universeChat)
        ? settings.universeChat
        : []
      : []
    const updated = [...existing, universeMsg].slice(-200)

    await prisma.zombieUniverse.update({
      where: { id: universeId },
      data: { settings: { ...settings, universeChat: updated } },
    })

    return results
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return [{ leagueId: universeId, success: false, week, error: msg }]
  }
}

/**
 * Main entry point: trigger all active zombie league updates based on sport schedule.
 * Called by automation system at designated times per sport:
 * - NFL: Tuesday 10:00am ET
 * - NBA/MLB/NHL/NCAAB: Monday 10:00am ET
 * - NCAAF: Sunday 10:00am ET
 * - SOCCER: Tuesday 10:00am ET
 */
export async function triggerAllZombieWeeklyUpdates(): Promise<{
  total: number
  succeeded: number
  failed: number
  results: ZombieUpdateResult[]
}> {
  const results: ZombieUpdateResult[] = []

  try {
    const now = new Date()
    const nowDay = now.getUTCDay()
    const nowHour = now.getUTCHours()

    // Get all active zombie leagues grouped by sport.
    const leagues = await prisma.zombieLeague.findMany({
      where: { status: { in: ['active', 'in_progress'] } },
      select: { leagueId: true, sport: true, currentWeek: true, universeId: true },
    })

    const dueLeagues = leagues.filter((league) => {
      const schedule = getZombieSeasonSchedule(league.sport)
      return schedule.weeklyUpdateDayOfWeek === nowDay && schedule.automationHourUtc === nowHour
    })

    const universeSummary = new Map<string, { success: number; failed: number; week: number }>()

    for (const league of dueLeagues) {
      const result = await triggerZombieLeagueWeeklyUpdate(league.leagueId, league.currentWeek ?? 1)
      results.push(result)
      if (league.universeId) {
        const prev = universeSummary.get(league.universeId) ?? {
          success: 0,
          failed: 0,
          week: league.currentWeek ?? 1,
        }
        if (result.success) prev.success += 1
        else prev.failed += 1
        universeSummary.set(league.universeId, prev)
      }
    }

    for (const [universeId, summary] of universeSummary.entries()) {
      const settings = (await prisma.zombieUniverse.findUnique({
        where: { id: universeId },
        select: { settings: true },
      }))?.settings as Record<string, unknown> | null
      const existing = Array.isArray(settings?.universeChat) ? settings.universeChat : []
      const message = {
        id: `universe-summary-w${summary.week}-${Date.now()}`,
        userId: 'system',
        userName: 'Universe Horde Report',
        body:
          `📡 Week ${summary.week} complete: ${summary.success} league(s) updated` +
          (summary.failed > 0 ? `, ${summary.failed} failed.` : '.'),
        createdAt: new Date().toISOString(),
      }
      await prisma.zombieUniverse.update({
        where: { id: universeId },
        data: { settings: { ...(settings ?? {}), universeChat: [...existing, message].slice(-200) } },
      })
    }

    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return {
      total: results.length,
      succeeded,
      failed,
      results,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Zombie weekly update orchestration failed:', msg)
    return {
      total: 0,
      succeeded: 0,
      failed: 1,
      results: [{ leagueId: 'orchestration', success: false, week: -1, error: msg }],
    }
  }
}

/**
 * Utility: Get current week for a league based on redraft season.
 */
export async function getCurrentZombieLeagueWeek(leagueId: string): Promise<number> {
  const z = await prisma.zombieLeague.findFirst({
    where: { leagueId },
    select: { currentWeek: true },
  })
  return z?.currentWeek ?? 1
}

/**
 * Utility: Get next scheduled update time for a sport.
 */
export function getZombieUpdateScheduleForSport(sport: string): {
  dayOfWeek: string // 'Monday', 'Tuesday', etc.
  timeUtc: string // 'HH:mm' in UTC
  timeEt: string // 'HH:mm ET'
} {
  // Keep this utility aligned with the canonical per-sport schedule contract.
  const config = getZombieSportConfig(sport)
  const schedule = getZombieSeasonSchedule(config.sport)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const hour = String(schedule.automationHourUtc).padStart(2, '0')
  return {
    dayOfWeek: dayNames[schedule.weeklyUpdateDayOfWeek] ?? 'Monday',
    timeUtc: `${hour}:00`,
    // Product copy standardizes this as ET 10am for now.
    timeEt: '10:00am',
  }
}
