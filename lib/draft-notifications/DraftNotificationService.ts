/**
 * Draft notifications — deterministic, event-driven. No AI required for content.
 */

import { prisma } from '@/lib/prisma'
import { createPlatformNotification } from '@/lib/platform/notification-service'
import type { DraftNotificationEventType, DraftNotificationPayload } from './types'

const DRAFT_ROOM_PATH = (leagueId: string) => `/app/league/${leagueId}/draft`

/**
 * Resolve app user id for a roster owner. Orphan rosters (platformUserId starting with "orphan-") have no user.
 */
export async function getAppUserIdForRoster(rosterId: string): Promise<string | null> {
  const roster = await prisma.roster.findUnique({
    where: { id: rosterId },
    select: { platformUserId: true },
  })
  if (!roster?.platformUserId || String(roster.platformUserId).startsWith('orphan-')) return null
  return roster.platformUserId
}

/**
 * All league member app user ids (roster owners). Excludes orphans.
 */
export async function getLeagueMemberAppUserIds(leagueId: string): Promise<string[]> {
  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { platformUserId: true },
  })
  const ids = new Set<string>()
  for (const r of rosters) {
    if (r.platformUserId && !String(r.platformUserId).startsWith('orphan-')) ids.add(r.platformUserId)
  }
  return Array.from(ids)
}

/**
 * Deterministic title/body for each event type.
 */
function getTitleAndBody(
  eventType: DraftNotificationEventType,
  payload: DraftNotificationPayload
): { title: string; body: string | null; severity: 'low' | 'medium' | 'high' } {
  const league = payload.leagueName ? ` — ${payload.leagueName}` : ''
  switch (eventType) {
    case 'draft_on_the_clock':
      return {
        title: `You're on the clock${league}`,
        body: payload.pickLabel ? `Pick ${payload.pickLabel}. Make your selection.` : 'Make your draft pick.',
        severity: 'high',
      }
    case 'draft_approaching_timeout':
      return {
        title: `Draft timer almost up${league}`,
        body: payload.pickLabel ? `Pick ${payload.pickLabel} — time running out.` : 'Your pick is due soon.',
        severity: 'high',
      }
    case 'draft_auto_pick_fired':
      return {
        title: `Auto-pick made${league}`,
        body: payload.playerName ? `${payload.playerName} was selected for you.` : 'An auto-pick was used for your slot.',
        severity: 'medium',
      }
    case 'draft_queue_player_unavailable':
      return {
        title: `Queue player taken${league}`,
        body: 'A player in your queue was drafted by another team. Choose a new pick.',
        severity: 'medium',
      }
    case 'draft_paused':
      return {
        title: `Draft paused${league}`,
        body: 'The commissioner has paused the draft.',
        severity: 'low',
      }
    case 'draft_resumed':
      return {
        title: `Draft resumed${league}`,
        body: 'The draft has resumed.',
        severity: 'low',
      }
    case 'draft_trade_offer_received':
      return {
        title: `Draft trade offer${league}`,
        body: 'You have a new draft pick trade proposal.',
        severity: 'medium',
      }
    case 'draft_ai_trade_review_available':
      return {
        title: `AI trade review ready${league}`,
        body: 'An AI review is available for a draft pick trade.',
        severity: 'low',
      }
    case 'draft_orphan_ai_assigned':
      return {
        title: `Orphan/AI manager updated${league}`,
        body: 'Commissioner has updated AI manager settings for empty teams.',
        severity: 'low',
      }
    case 'draft_auction_outbid':
      return {
        title: `You were outbid${league}`,
        body: payload.previousBid != null ? `Your bid of $${payload.previousBid} was outbid.` : 'Another manager placed a higher bid.',
        severity: 'medium',
      }
    case 'draft_slow_reminder':
      return {
        title: `Slow draft reminder${league}`,
        body: payload.minutesRemaining != null ? `Your pick is due in about ${payload.minutesRemaining} minutes.` : 'Your draft pick is due soon.',
        severity: 'medium',
      }
    case 'draft_starting_soon':
      return {
        title: `Draft starting soon${league}`,
        body: 'Your league draft is about to start.',
        severity: 'high',
      }
    default:
      return {
        title: `Draft update${league}`,
        body: null,
        severity: 'low',
      }
  }
}

/**
 * Create a single draft notification (in-app). Deterministic title/body; optional integration with email/push is external.
 */
export async function createDraftNotification(
  appUserId: string,
  eventType: DraftNotificationEventType,
  payload: DraftNotificationPayload
): Promise<boolean> {
  const { title, body, severity } = getTitleAndBody(eventType, payload)
  const href = DRAFT_ROOM_PATH(payload.leagueId)
  return createPlatformNotification({
    userId: appUserId,
    productType: 'app',
    type: eventType,
    title,
    body: body ?? undefined,
    severity,
    meta: {
      ...payload,
      leagueId: payload.leagueId,
      actionHref: href,
      actionLabel: 'Open draft',
    },
  })
}

/**
 * Notify multiple users (e.g. draft paused/resumed). Fire-and-forget per user.
 */
export async function createDraftNotificationForUsers(
  appUserIds: string[],
  eventType: DraftNotificationEventType,
  payload: DraftNotificationPayload
): Promise<number> {
  let count = 0
  for (const id of appUserIds) {
    const ok = await createDraftNotification(id, eventType, payload)
    if (ok) count++
  }
  return count
}

/**
 * Event trigger: after a pick is submitted, notify the next manager they're on the clock.
 */
export async function notifyOnTheClockAfterPick(leagueId: string): Promise<void> {
  try {
    const session = await prisma.draftSession.findUnique({
      where: { leagueId },
      include: { picks: { orderBy: { overall: 'asc' } } },
    })
    if (!session || session.status !== 'in_progress') return
    const { resolveCurrentOnTheClock } = await import('@/lib/live-draft-engine/CurrentOnTheClockResolver')
    const slotOrder = (session.slotOrder as { slot: number; rosterId: string; displayName: string }[]) ?? []
    const totalPicks = session.teamCount * session.rounds
    const current = resolveCurrentOnTheClock({
      totalPicks,
      picksCount: session.picks.length,
      teamCount: session.teamCount,
      draftType: session.draftType as 'snake' | 'linear' | 'auction',
      thirdRoundReversal: session.thirdRoundReversal,
      slotOrder,
    })
    if (!current) return
    const appUserId = await getAppUserIdForRoster(current.rosterId)
    if (!appUserId) return
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } })
    await createDraftNotification(appUserId, 'draft_on_the_clock', {
      leagueId,
      leagueName: league?.name ?? undefined,
      pickLabel: current.pickLabel,
      round: current.round,
      slot: current.slot,
      rosterId: current.rosterId,
      displayName: current.displayName,
    })
  } catch {
    // Fire-and-forget
  }
}

/**
 * Event trigger: draft paused — notify all league members.
 */
export async function notifyDraftPaused(leagueId: string): Promise<void> {
  const userIds = await getLeagueMemberAppUserIds(leagueId)
  if (userIds.length === 0) return
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } })
  await createDraftNotificationForUsers(userIds, 'draft_paused', {
    leagueId,
    leagueName: league?.name ?? undefined,
  })
}

/**
 * Event trigger: draft resumed — notify all league members.
 */
export async function notifyDraftResumed(leagueId: string): Promise<void> {
  const userIds = await getLeagueMemberAppUserIds(leagueId)
  if (userIds.length === 0) return
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } })
  await createDraftNotificationForUsers(userIds, 'draft_resumed', {
    leagueId,
    leagueName: league?.name ?? undefined,
  })
}

/**
 * Event trigger: auto-pick was used for this roster.
 */
export async function notifyAutoPickFired(
  leagueId: string,
  rosterId: string,
  playerName: string
): Promise<void> {
  const appUserId = await getAppUserIdForRoster(rosterId)
  if (!appUserId) return
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } })
  await createDraftNotification(appUserId, 'draft_auto_pick_fired', {
    leagueId,
    leagueName: league?.name ?? undefined,
    rosterId,
    playerName,
  })
}

/**
 * Event trigger: queue player was unavailable (already drafted).
 */
export async function notifyQueuePlayerUnavailable(leagueId: string, rosterId: string): Promise<void> {
  const appUserId = await getAppUserIdForRoster(rosterId)
  if (!appUserId) return
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } })
  await createDraftNotification(appUserId, 'draft_queue_player_unavailable', {
    leagueId,
    leagueName: league?.name ?? undefined,
    rosterId,
  })
}
