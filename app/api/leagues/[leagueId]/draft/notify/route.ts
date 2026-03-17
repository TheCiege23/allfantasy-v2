/**
 * POST: Emit a draft notification (e.g. approaching timeout, slow reminder, draft starting soon).
 * Callable by commissioner or by cron/internal. Body: { eventType, payload? }.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import {
  createDraftNotification,
  createDraftNotificationForUsers,
  getAppUserIdForRoster,
  getLeagueMemberAppUserIds,
} from '@/lib/draft-notifications'
import type { DraftNotificationEventType } from '@/lib/draft-notifications'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const BROADCAST_EVENTS: DraftNotificationEventType[] = ['draft_paused', 'draft_resumed', 'draft_starting_soon', 'draft_slow_reminder', 'draft_orphan_ai_assigned']

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const eventType = body.eventType as string | undefined
  const payload = body.payload as Record<string, unknown> | undefined

  const allowedTypes: DraftNotificationEventType[] = [
    'draft_approaching_timeout',
    'draft_slow_reminder',
    'draft_starting_soon',
    'draft_orphan_ai_assigned',
    'draft_auction_outbid',
  ]
  if (!eventType || !allowedTypes.includes(eventType as DraftNotificationEventType)) {
    return NextResponse.json(
      { error: `eventType required: one of ${allowedTypes.join(', ')}` },
      { status: 400 }
    )
  }

  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } })
  const basePayload = {
    leagueId,
    leagueName: league?.name ?? undefined,
    ...(payload ?? {}),
  }

  try {
    if (eventType === 'draft_approaching_timeout' && payload?.rosterId) {
      const appUserId = await getAppUserIdForRoster(String(payload.rosterId))
      if (appUserId) {
        await createDraftNotification(appUserId, 'draft_approaching_timeout', {
          ...basePayload,
          pickLabel: payload.pickLabel as string | undefined,
          rosterId: String(payload.rosterId),
        })
      }
    } else if (eventType === 'draft_auction_outbid' && payload?.rosterId) {
      const appUserId = await getAppUserIdForRoster(String(payload.rosterId))
      if (appUserId) {
        await createDraftNotification(appUserId, 'draft_auction_outbid', {
          ...basePayload,
          rosterId: String(payload.rosterId),
          previousBid: payload.previousBid as number | undefined,
        })
      }
    } else if (BROADCAST_EVENTS.includes(eventType as DraftNotificationEventType)) {
      const userIds = await getLeagueMemberAppUserIds(leagueId)
      await createDraftNotificationForUsers(userIds, eventType as DraftNotificationEventType, {
        ...basePayload,
        minutesRemaining: payload?.minutesRemaining as number | undefined,
      })
    } else {
      return NextResponse.json({ error: `Unhandled eventType: ${eventType}` }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[draft/notify]', e)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}
