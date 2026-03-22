import { prisma } from '@/lib/prisma'
import { ensureAICommissionerConfig, toActionLogView, toAlertView, toConfigView } from './AICommissionerService'
import { normalizeOptionalSportForCommissioner } from './SportCommissionerResolver'
import type { AICommissionerOverview } from './types'

export interface CommissionerQueryInput {
  leagueId: string
  sport?: string | null
  includeResolved?: boolean
  includeDismissed?: boolean
  includeSnoozed?: boolean
  alertLimit?: number
  actionLimit?: number
}

export async function getAICommissionerOverview(
  input: CommissionerQueryInput
): Promise<AICommissionerOverview> {
  const sport = normalizeOptionalSportForCommissioner(input.sport)
  const config = await ensureAICommissionerConfig({ leagueId: input.leagueId, sport: sport ?? undefined })
  const league = await prisma.league.findUnique({
    where: { id: input.leagueId },
    select: { season: true },
  })
  const alertStatuses = ['open', 'approved'] as string[]
  if (input.includeSnoozed ?? true) alertStatuses.push('snoozed')
  if (input.includeResolved) alertStatuses.push('resolved')
  if (input.includeDismissed) alertStatuses.push('dismissed')

  const [alerts, actionLogs] = await Promise.all([
    prisma.aiCommissionerAlert.findMany({
      where: {
        leagueId: input.leagueId,
        ...(sport ? { sport } : {}),
        status: { in: alertStatuses },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: Math.max(10, Math.min(200, input.alertLimit ?? 80)),
    }),
    prisma.aiCommissionerActionLog.findMany({
      where: {
        leagueId: input.leagueId,
        ...(sport ? { sport } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(10, Math.min(100, input.actionLimit ?? 30)),
    }),
  ])

  return {
    leagueId: input.leagueId,
    sport: config.sport,
    season: league?.season ?? new Date().getUTCFullYear(),
    config: toConfigView(config),
    alerts: alerts.map(toAlertView),
    actionLogs: actionLogs.map(toActionLogView),
  }
}
