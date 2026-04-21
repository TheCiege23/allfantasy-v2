import { prisma } from '@/lib/prisma'
import { createPlatformNotification } from '@/lib/platform/notification-service'
import { evaluateLegalityForPersistedRoster } from './loadLegalityEvaluationContext'
import { hashRosterLegalityReminder } from './weeklyReminder'

export type WeeklyReminderRunStats = {
  scanned: number
  notified: number
  skippedLegal: number
  skippedDuplicate: number
  errors: number
}

/**
 * Weekly cron: notify managers whose rosters are still illegal (once per week per issue-hash unless hash changes).
 */
export async function runWeeklyRosterLegalityReminders(options?: {
  maxRosters?: number
}): Promise<WeeklyReminderRunStats> {
  const max = Math.min(500, Math.max(1, options?.maxRosters ?? 300))
  const stats: WeeklyReminderRunStats = {
    scanned: 0,
    notified: 0,
    skippedLegal: 0,
    skippedDuplicate: 0,
    errors: 0,
  }

  const rosters = await prisma.roster.findMany({
    select: {
      id: true,
      leagueId: true,
      playerData: true,
      platformUserId: true,
    },
    take: max,
    orderBy: { updatedAt: 'desc' },
  })

  for (const r of rosters) {
    stats.scanned += 1
    try {
      const league = await prisma.league.findFirst({
        where: { id: r.leagueId },
        select: { id: true, name: true, season: true, settings: true },
      })
      if (!league) {
        stats.errors += 1
        continue
      }

      const evaluated = await evaluateLegalityForPersistedRoster({
        id: r.id,
        leagueId: r.leagueId,
        playerData: r.playerData,
      })
      if (!evaluated) {
        stats.errors += 1
        continue
      }

      const { result, week, season } = evaluated
      if (result.isLegal || !result.weeklyReminderNeeded) {
        stats.skippedLegal += 1
        continue
      }

      const issueHash = hashRosterLegalityReminder(season, week, result.rawIssueCodes, result.rosterOverflowCount)

      const existing = await prisma.rosterLegalityWeeklyReminder.findUnique({
        where: {
          rosterId_season_week: {
            rosterId: r.id,
            season,
            week,
          },
        },
      })
      if (existing && existing.issueHash === issueHash) {
        stats.skippedDuplicate += 1
        continue
      }

      const issueCount = Math.max(
        result.requiredMovesCount,
        result.blockingReasons.length,
        result.highlightedPlayerIds.length,
        1,
      )

      const title = 'Roster needs attention'
      const body = `Your roster still has ${issueCount} issue${issueCount === 1 ? '' : 's'} preventing a legal lineup in ${league.name ?? 'your league'}. Open Team to fix IR, taxi, devy, or overflow.`

      const sourceKey = `roster-legality-weekly:${r.id}:${season}:${week}:${issueHash}`

      await createPlatformNotification({
        userId: r.platformUserId,
        leagueId: r.leagueId,
        productType: 'app',
        type: 'roster_legality_weekly',
        title,
        body,
        severity: 'medium',
        sourceKey,
        meta: {
          rosterId: r.id,
          leagueId: r.leagueId,
          season,
          week,
          issueHash,
          issueCount,
          actionHref: `/league/${r.leagueId}?view=team`,
          actionLabel: 'Review roster',
        },
      })

      await prisma.rosterLegalityWeeklyReminder.upsert({
        where: {
          rosterId_season_week: {
            rosterId: r.id,
            season,
            week,
          },
        },
        create: {
          leagueId: r.leagueId,
          rosterId: r.id,
          season,
          week,
          issueHash,
        },
        update: {
          issueHash,
          notifiedAt: new Date(),
        },
      })

      stats.notified += 1
    } catch {
      stats.errors += 1
    }
  }

  return stats
}
