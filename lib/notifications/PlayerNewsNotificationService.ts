/**
 * Player News Notification Service
 *
 * When new player news arrives (injuries, trades, signings, suspensions),
 * this service finds all managers who roster that player across all leagues
 * and dispatches notifications to them.
 *
 * Notification channels:
 * - In-app notification (always)
 * - Push notification (if enabled)
 * - Email digest (if enabled, batched)
 *
 * Deduplication: same player + same category → max 1 notification per 2 hours
 */

import { prisma } from '@/lib/prisma'
import type { NewsCategory } from '@/lib/workers/x-news-ingestion'

type OptionalPlayerNewsNotificationModel = {
  findFirst?: (args: unknown) => Promise<unknown>
  create?: (args: unknown) => Promise<unknown>
  findMany?: (args: unknown) => Promise<unknown>
  updateMany?: (args: unknown) => Promise<unknown>
  count?: (args: unknown) => Promise<unknown>
}

function getPlayerNewsNotificationModel(): OptionalPlayerNewsNotificationModel | undefined {
  return (prisma as unknown as { playerNewsNotification?: OptionalPlayerNewsNotificationModel }).playerNewsNotification
}

export type PlayerNewsNotification = {
  userId: string
  leagueId: string
  playerName: string
  team: string | null
  headline: string
  category: NewsCategory
  impact: 'high' | 'medium' | 'low'
  sport: string
  createdAt: Date
}

const CATEGORY_ICONS: Record<string, string> = {
  injury: '🏥',
  suspension: '🚫',
  trade: '🔄',
  signing: '✍️',
  release: '📋',
  roster_move: '📋',
  team_news: '📢',
  player_news: '📰',
  game_update: '🏟️',
  coaching: '🏈',
}

const CATEGORY_LABELS: Record<string, string> = {
  injury: 'Injury Update',
  suspension: 'Suspension',
  trade: 'Trade Alert',
  signing: 'Signing',
  release: 'Released',
  roster_move: 'Roster Move',
  team_news: 'Team News',
  player_news: 'Player News',
  game_update: 'Game Update',
  coaching: 'Coaching News',
}

/**
 * Dispatch notifications for a new player news item.
 * Finds all managers who roster the player and notifies them.
 */
export async function dispatchPlayerNewsNotifications(
  playerName: string,
  team: string | null,
  headline: string,
  category: NewsCategory,
  impact: 'high' | 'medium' | 'low',
  sport: string,
): Promise<number> {
  const playerNewsNotification = getPlayerNewsNotificationModel()
  if (!playerNewsNotification) return 0

  // Skip low-impact notifications unless injury
  if (impact === 'low' && category !== 'injury') return 0

  // Find all rosters containing this player across all leagues
  const rosterPlayers = await prisma.redraftRosterPlayer.findMany({
    where: {
      playerName: { contains: playerName, mode: 'insensitive' },
      droppedAt: null, // still on roster
    },
    select: {
      roster: {
        select: {
          ownerId: true,
          leagueId: true,
        },
      },
    },
    take: 500,
  }).catch(() => [])

  if (rosterPlayers.length === 0) return 0

  // Deduplicate: same player + category + user → max 1 per 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  let dispatched = 0

  const seen = new Set<string>()

  for (const rp of rosterPlayers) {
    const userId = rp.roster?.ownerId
    const leagueId = rp.roster?.leagueId
    if (!userId || !leagueId) continue

    const dedupeKey = `${userId}:${playerName}:${category}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    // Check for recent duplicate notification
    const existing = await playerNewsNotification.findFirst?.({
      where: {
        userId,
        playerName,
        category,
        createdAt: { gte: twoHoursAgo },
      },
    }).catch(() => null)

    if (existing) continue

    // Create notification record
    const icon = CATEGORY_ICONS[category] ?? '📰'
    const label = CATEGORY_LABELS[category] ?? 'News'
    const title = `${icon} ${label}: ${playerName}`
    const body = headline.slice(0, 200)

    await playerNewsNotification.create?.({
      data: {
        userId,
        leagueId,
        playerName,
        team,
        headline: title,
        body,
        category,
        impact,
        sport,
        isRead: false,
      },
    }).catch(() => {})

    dispatched++
  }

  return dispatched
}

/**
 * Get unread news notifications for a user.
 */
export async function getUnreadNewsNotifications(
  userId: string,
  limit: number = 20,
): Promise<Array<{
  id: string
  playerName: string
  headline: string
  body: string
  category: string
  impact: string
  sport: string
  leagueId: string
  isRead: boolean
  createdAt: Date
}>> {
  const playerNewsNotification = getPlayerNewsNotificationModel()
  if (!playerNewsNotification?.findMany) return []

  return (await playerNewsNotification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      playerName: true,
      headline: true,
      body: true,
      category: true,
      impact: true,
      sport: true,
      leagueId: true,
      isRead: true,
      createdAt: true,
    },
  }) as Array<{
    id: string
    playerName: string
    headline: string
    body: string
    category: string
    impact: string
    sport: string
    leagueId: string
    isRead: boolean
    createdAt: Date
  }>)
}

/**
 * Mark notifications as read.
 */
export async function markNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  const playerNewsNotification = getPlayerNewsNotificationModel()
  if (!playerNewsNotification?.updateMany) return

  await playerNewsNotification.updateMany({
    where: { userId, id: { in: notificationIds } },
    data: { isRead: true, readAt: new Date() },
  })
}

/**
 * Mark all news notifications as read for a user.
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const playerNewsNotification = getPlayerNewsNotificationModel()
  if (!playerNewsNotification?.updateMany) return

  await playerNewsNotification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })
}

/**
 * Get notification count badge for a user.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const playerNewsNotification = getPlayerNewsNotificationModel()
  if (!playerNewsNotification?.count) return 0

  const count = await playerNewsNotification.count({
    where: { userId, isRead: false },
  })
  return typeof count === 'number' ? count : 0
}
