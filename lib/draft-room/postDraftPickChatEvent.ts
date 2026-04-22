/**
 * Draft-room-only chat rows for each completed pick.
 * Stored with source `draft` + type `draft_pick` so they never appear in the main league chat stream
 * (league GET excludes source=draft), while the draft chat GET merges these in when sync is on.
 */

import { prisma } from '@/lib/prisma'
import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'

export type PostDraftPickChatEventInput = {
  leagueId: string
  rosterId: string
  madeByUserId: string | null | undefined
  playerName: string
  position: string
  rosterDisplayName: string
  overall: number
  pickLabel: string
  round?: number | null
  roundSlot?: number | null
  playerId?: string | null
  /** NFL team abbreviation when known */
  nflTeam?: string | null
}

async function resolveActorAppUserId(input: PostDraftPickChatEventInput): Promise<string | null> {
  const direct = typeof input.madeByUserId === 'string' && input.madeByUserId.trim() ? input.madeByUserId.trim() : null
  if (direct) return direct

  const roster = await prisma.roster.findFirst({
    where: { id: input.rosterId, leagueId: input.leagueId },
    select: { platformUserId: true },
  })
  if (roster?.platformUserId) return roster.platformUserId

  const league = await prisma.league.findUnique({
    where: { id: input.leagueId },
    select: { userId: true },
  })
  return league?.userId ?? null
}

/**
 * Fire-and-forget from pick submission; failures must never affect draft mechanics.
 */
export async function postDraftPickChatEvent(input: PostDraftPickChatEventInput): Promise<void> {
  const actorId = await resolveActorAppUserId(input)
  if (!actorId) return

  const pickedAt = new Date().toISOString()
  const summary = `${input.playerName} (${input.position}) → ${input.rosterDisplayName}`
  const roundPart =
    input.round != null && input.roundSlot != null
      ? ` · R${input.round} · Pick ${input.roundSlot}`
      : ''
  const body = `${summary} · Pick ${input.pickLabel} (#${input.overall})${roundPart}`

  await createLeagueChatMessage(input.leagueId, actorId, body, {
    type: 'draft_pick',
    source: 'draft',
    metadata: {
      draftPickEvent: true,
      /** Explicit: never treated as league-sync content; stored draft-only at row level. */
      leagueChatSyncExcluded: true,
      playerName: input.playerName,
      position: input.position,
      rosterDisplayName: input.rosterDisplayName,
      rosterId: input.rosterId,
      pickedAt,
      overall: input.overall,
      pickLabel: input.pickLabel,
      ...(input.round != null ? { round: input.round } : {}),
      ...(input.roundSlot != null ? { roundSlot: input.roundSlot, slot: input.roundSlot } : {}),
      ...(typeof input.playerId === 'string' && input.playerId.trim() ? { playerId: input.playerId.trim() } : {}),
      ...(typeof input.nflTeam === 'string' && input.nflTeam.trim() ? { nflTeam: input.nflTeam.trim() } : {}),
    },
  })
}
