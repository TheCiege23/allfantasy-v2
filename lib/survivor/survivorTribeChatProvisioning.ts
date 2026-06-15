import 'server-only'

import { prisma } from '@/lib/prisma'
import { normalizeSurvivorFoundationSettings } from './normalizeSurvivorSettings'

export interface SurvivorChatProvisioningOptions {
  actorUserId?: string
}

export type SurvivorChatProvisioningOutcome = {
  ok: true
  created: boolean
  leagueChannelId: string
  tribeChannels: Array<{ tribeId: string; channelId: string; name: string; memberCount: number; created: boolean }>
}

/**
 * Create the main league chat + one private chat per tribe and wire membership.
 *
 * - League channel: every Survivor participant (+ non-participating commissioner host).
 * - Tribe channel: that tribe's ACTIVE members. A NON-participating commissioner host is
 *   added to every tribe chat (oversight); a PARTICIPATING commissioner is NOT added to a
 *   tribe they are not a member of (privacy). The AI host posts via senderIsHost messages.
 * Idempotent: an existing tribe channel (by tribeId) is reused and its membership refreshed.
 */
export async function provisionSurvivorChats(
  leagueId: string,
  opts: SurvivorChatProvisioningOptions = {},
): Promise<SurvivorChatProvisioningOutcome> {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true, userId: true, settings: true } })
  const settings = normalizeSurvivorFoundationSettings(
    league?.settings && typeof league.settings === 'object' ? (league.settings as Record<string, unknown>) : {},
  )
  const commissionerUserId = league?.userId ?? null
  const commissionerIsNonParticipatingHost = settings.commissionerParticipationMode === 'non_participating_host'
  const hostUserIds = commissionerUserId && commissionerIsNonParticipatingHost ? [commissionerUserId] : []

  // Active participants (for the league channel) + their tribe.
  const players = await prisma.survivorPlayer.findMany({
    where: { leagueId, playerState: 'active' },
    select: { userId: true, tribeId: true },
  })
  const playerRows = players as Array<{ userId: string; tribeId: string | null }>
  const allParticipantUserIds = playerRows.map((p) => p.userId)
  const membersByTribe = new Map<string, string[]>()
  for (const p of playerRows) {
    if (!p.tribeId) continue
    const arr = membersByTribe.get(p.tribeId) ?? []
    arr.push(p.userId)
    membersByTribe.set(p.tribeId, arr)
  }

  const leagueMembers = Array.from(new Set([...allParticipantUserIds, ...hostUserIds]))
  let created = false

  // League channel (idempotent by leagueId + channelType).
  let leagueChannel = await prisma.survivorChatChannel.findFirst({
    where: { leagueId, channelType: 'league', isArchived: false },
    select: { id: true },
  })
  if (!leagueChannel) {
    leagueChannel = await prisma.survivorChatChannel.create({
      data: { leagueId, name: `${league?.name ?? 'Survivor'} — Island`, channelType: 'league', memberUserIds: leagueMembers },
      select: { id: true },
    })
    created = true
  } else {
    await prisma.survivorChatChannel.update({ where: { id: leagueChannel.id }, data: { memberUserIds: leagueMembers } })
  }

  const tribes = await prisma.survivorTribe.findMany({
    where: { leagueId },
    select: { id: true, name: true, chatChannelId: true },
    orderBy: { slotIndex: 'asc' },
  })

  const tribeChannels: SurvivorChatProvisioningOutcome['tribeChannels'] = []
  for (const tribe of tribes) {
    const tribeMembers = Array.from(new Set([...(membersByTribe.get(tribe.id) ?? []), ...hostUserIds]))
    let channelId = tribe.chatChannelId
    let channelCreated = false

    const existing = channelId
      ? await prisma.survivorChatChannel.findFirst({ where: { id: channelId, leagueId }, select: { id: true } })
      : await prisma.survivorChatChannel.findFirst({ where: { leagueId, channelType: 'tribe', tribeId: tribe.id, isArchived: false }, select: { id: true } })

    if (existing) {
      channelId = existing.id
      await prisma.survivorChatChannel.update({ where: { id: existing.id }, data: { memberUserIds: tribeMembers } })
    } else {
      const ch = await prisma.survivorChatChannel.create({
        data: { leagueId, name: `${tribe.name} Tribe`, channelType: 'tribe', tribeId: tribe.id, memberUserIds: tribeMembers },
        select: { id: true },
      })
      channelId = ch.id
      channelCreated = true
      created = true
      await prisma.survivorTribe.update({ where: { id: tribe.id }, data: { chatChannelId: channelId } })
    }

    tribeChannels.push({ tribeId: tribe.id, channelId: channelId!, name: `${tribe.name} Tribe`, memberCount: tribeMembers.length, created: channelCreated })
  }

  if (created) {
    await prisma.survivorAuditEntry.create({
      data: {
        leagueId,
        category: 'chat',
        action: 'tribe_chats_provisioned',
        actorUserId: opts.actorUserId ?? null,
        data: { leagueChannelId: leagueChannel.id, tribeChannelCount: tribeChannels.length, hostIncluded: hostUserIds.length > 0 },
        isVisibleToCommissioner: true,
        isVisibleToPublic: true,
      },
    })
  }

  return { ok: true, created, leagueChannelId: leagueChannel.id, tribeChannels }
}
