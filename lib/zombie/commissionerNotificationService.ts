import { prisma } from '@/lib/prisma'

export type NotifyPlayerOptions = {
  /** In-app body; may include names. */
  body?: string | null
  /** low | medium | high | critical */
  severity?: string
  meta?: Record<string, unknown>
  /**
   * When true, title/body are rewritten for push-style surfaces to avoid spoilers.
   * Full detail should still be shown in-app via `meta.inAppTitle` / `meta.inAppBody` if set.
   */
  pushSpoilerSafe?: boolean
}

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

/**
 * Player-facing in-app notification (PlatformNotification). Use spoiler-safe title/body when `pushSpoilerSafe`.
 */
export async function notifyZombiePlayer(
  userId: string,
  type: string,
  title: string,
  options: NotifyPlayerOptions = {},
): Promise<void> {
  const safe = options.pushSpoilerSafe === true
  const displayTitle = safe ? 'League update' : title
  const displayBody = safe ? 'Check your league — results are in.' : (options.body ?? null)

  await prisma.platformNotification.create({
    data: {
      userId,
      type: `zombie_${type}`,
      title: displayTitle,
      body: displayBody,
      severity: options.severity ?? 'low',
      meta: {
        ...(options.meta ?? {}),
        pushSpoilerSafe: safe,
        inAppTitle: title,
        inAppBody: options.body,
      } as object,
    },
  })
}
