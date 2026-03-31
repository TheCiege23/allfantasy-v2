import { createPlatformThread, createSystemMessage } from '@/lib/platform/chat-service'
import { prisma } from '@/lib/prisma'

import type { DraftIntelState } from './types'

function buildThreadTitle(leagueName: string | null, archived = false) {
  const base = `Chimmy Draft Intel${leagueName ? ` - ${leagueName}` : ''}`
  return archived ? `${base} (Archived)` : base
}

function buildMetadata(state: DraftIntelState, threadId?: string) {
  return {
    draftIntelThread: true,
    verifiedBadge: true,
    leagueId: state.leagueId,
    leagueName: state.leagueName,
    sport: state.sport,
    archived: state.archived,
    allowReplies: !state.archived,
    showInDmList: true,
    readOnlyFeed: true,
    threadId,
    actionHref: `/app/league/${state.leagueId}/draft`,
    actionLabel: state.archived ? 'Open recap' : 'Open draft',
  }
}

export async function findExistingDraftIntelThreadId(
  userId: string,
  leagueId: string
): Promise<string | null> {
  const memberships = await (prisma as any).platformChatThreadMember.findMany({
    where: {
      userId,
      isBlocked: false,
      thread: { threadType: 'ai', productType: 'app' },
    },
    include: {
      thread: {
        select: {
          id: true,
          title: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 25,
            select: { metadata: true },
          },
        },
      },
    },
    take: 40,
  })

  for (const membership of memberships) {
    const thread = membership.thread
    if (!thread?.id) continue
    if (Array.isArray(thread.messages)) {
      const matched = thread.messages.some((message: { metadata?: unknown }) => {
        const metadata =
          message.metadata && typeof message.metadata === 'object'
            ? (message.metadata as Record<string, unknown>)
            : null
        return metadata?.draftIntelThread === true && metadata?.leagueId === leagueId
      })
      if (matched) return thread.id as string
    }
  }

  return null
}

export async function ensureDraftIntelThread(input: {
  userId: string
  leagueId: string
  leagueName: string | null
  sport: string
}): Promise<string | null> {
  const existing = await findExistingDraftIntelThreadId(input.userId, input.leagueId)
  if (existing) return existing

  const created = await createPlatformThread({
    creatorUserId: input.userId,
    threadType: 'ai',
    productType: 'app',
    title: buildThreadTitle(input.leagueName),
  })
  if (!created?.id) return null

  await createSystemMessage(
    created.id,
    'draft_intel_intro',
    `Chimmy is tracking ${input.leagueName ?? 'your league'} draft board and will send private queue updates here.`,
    {
      draftIntelThread: true,
      verifiedBadge: true,
      leagueId: input.leagueId,
      leagueName: input.leagueName,
      sport: input.sport,
      archived: false,
      allowReplies: true,
      showInDmList: true,
      readOnlyFeed: true,
      actionHref: `/app/league/${input.leagueId}/draft`,
      actionLabel: 'Open draft',
    }
  ).catch(() => null)

  return created.id
}

export async function sendDraftIntelDm(state: DraftIntelState): Promise<{ threadId: string | null; sent: boolean }> {
  const threadId = await ensureDraftIntelThread({
    userId: state.userId,
    leagueId: state.leagueId,
    leagueName: state.leagueName,
    sport: state.sport,
  })
  if (!threadId) return { threadId: null, sent: false }

  const messageType =
    state.status === 'complete'
      ? 'draft_intel_recap'
      : state.status === 'on_clock'
        ? 'draft_intel_on_clock'
        : 'draft_intel_queue'
  const body =
    state.status === 'complete'
      ? state.recap ?? 'Draft complete.'
      : state.status === 'on_clock'
        ? state.messages.onClock
        : state.trigger === 'n_minus_5'
          ? state.messages.ready
          : state.messages.update

  const sent = await createSystemMessage(threadId, messageType, body, {
    ...buildMetadata(state, threadId),
    messageKind:
      state.status === 'complete'
        ? 'recap'
        : state.status === 'on_clock'
          ? 'on_clock'
          : state.trigger === 'n_minus_5'
            ? 'queue_ready'
            : 'queue_update',
    queue: state.queue.map((entry) => ({
      rank: entry.rank,
      playerName: entry.playerName,
      position: entry.position,
      team: entry.team,
      availabilityProbability: entry.availabilityProbability,
      reason: entry.reason,
    })),
    picksUntilUser: state.picksUntilUser,
    headline: state.headline,
    recap: state.recap,
  })

  if (state.archived) {
    await (prisma as any).platformChatThread.update({
      where: { id: threadId },
      data: { title: buildThreadTitle(state.leagueName, true) },
    }).catch(() => null)
  }

  return { threadId, sent: Boolean(sent) }
}
