import { prisma } from '@/lib/prisma'

export type NotifyCommissionerOptions = {
  urgency?: string
  relatedUserId?: string
  relatedEventId?: string
  relatedEventType?: string
  requiresAction?: boolean
  actionDeadline?: Date
  week?: number | null
}

/**
 * Persist commissioner inbox row for zombie events (platform push can subscribe later).
 */
export async function notifyCommissioner(
  leagueId: string,
  type: string,
  title: string,
  summary: string,
  options: NotifyCommissionerOptions = {},
): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { userId: true },
  })
  if (!league) return

  await prisma.zombieCommissionerNotification.create({
    data: {
      leagueId,
      commissionerId: league.userId,
      week: options.week ?? null,
      type,
      title,
      summary,
      relatedUserId: options.relatedUserId ?? null,
      relatedEventId: options.relatedEventId ?? null,
      relatedEventType: options.relatedEventType ?? null,
      urgency: options.urgency ?? 'normal',
      requiresAction: options.requiresAction ?? false,
      actionDeadline: options.actionDeadline ?? null,
    },
  })
}
