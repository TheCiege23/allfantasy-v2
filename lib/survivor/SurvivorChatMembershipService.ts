/**
 * Survivor tribe chat membership: add/remove members, AI host (PROMPT 346). Deterministic.
 * Tribe chat is identified by source = 'tribe_<tribeId>' on LeagueChatMessage or equivalent.
 * This service manages SurvivorTribeChatMember rows for who is in each tribe chat.
 */

import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { getTribesWithMembers } from './SurvivorTribeService'
import { appendSurvivorAudit } from './SurvivorAuditLog'
import { tribeChatSource } from './constants'

const AI_HOST_USER_ID = 'survivor-ai-host'

/**
 * Bootstrap tribe chat memberships after tribes are created: add all tribe members + AI host per tribe.
 */
export async function bootstrapTribeChatMembers(leagueId: string): Promise<{ ok: boolean; error?: string }> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const tribes = await getTribesWithMembers(leagueId)
  for (const tribe of tribes) {
    for (const member of tribe.members) {
      await prisma.survivorTribeChatMember.upsert({
        where: {
          uniq_tribe_roster: { tribeId: tribe.id, rosterId: member.rosterId },
        },
        create: {
          tribeId: tribe.id,
          rosterId: member.rosterId,
          isAiHost: false,
        },
        update: {},
      })
    }
    await prisma.survivorTribeChatMember.upsert({
      where: {
        uniq_tribe_user: { tribeId: tribe.id, userId: AI_HOST_USER_ID },
      },
      create: {
        tribeId: tribe.id,
        rosterId: '',
        userId: AI_HOST_USER_ID,
        isAiHost: true,
      },
      update: {},
    })
  }

  await appendSurvivorAudit(leagueId, config.configId, 'chat_membership_updated', {
    action: 'bootstrap',
    tribeCount: tribes.length,
  })
  return { ok: true }
}

/**
 * Remove a roster from their tribe chat (e.g. after elimination). Add to exile/jury chat per product.
 */
export async function removeRosterFromTribeChat(leagueId: string, rosterId: string): Promise<{ ok: boolean; error?: string }> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const deleted = await prisma.survivorTribeChatMember.deleteMany({
    where: { rosterId, tribe: { configId: config.configId } },
  })
  if (deleted.count > 0) {
    await appendSurvivorAudit(leagueId, config.configId, 'chat_membership_updated', {
      action: 'remove',
      rosterId,
    })
  }
  return { ok: true }
}

/**
 * Get chat source string for a tribe (for filtering LeagueChatMessage or posting).
 */
export function getTribeChatSource(tribeId: string): string {
  return tribeChatSource(tribeId)
}

/**
 * Get roster IDs that are members of a tribe chat (for permission checks).
 */
export async function getTribeChatMemberRosterIds(tribeId: string): Promise<string[]> {
  const members = await prisma.survivorTribeChatMember.findMany({
    where: { tribeId, isAiHost: false },
    select: { rosterId: true },
  })
  return members.map((m) => m.rosterId).filter(Boolean)
}

/**
 * After shuffle: update tribe chat memberships to match new tribe members. Remove old, add new.
 */
export async function syncTribeChatMembersAfterShuffle(leagueId: string): Promise<{ ok: boolean; error?: string }> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const tribes = await getTribesWithMembers(leagueId)
  for (const tribe of tribes) {
    const currentRosterIds = new Set(tribe.members.map((m) => m.rosterId))
    const existing = await prisma.survivorTribeChatMember.findMany({
      where: { tribeId: tribe.id, isAiHost: false },
      select: { id: true, rosterId: true },
    })
    for (const ex of existing) {
      if (!currentRosterIds.has(ex.rosterId)) {
        await prisma.survivorTribeChatMember.deleteMany({ where: { id: ex.id } })
      }
    }
    for (const rosterId of currentRosterIds) {
      await prisma.survivorTribeChatMember.upsert({
        where: {
          uniq_tribe_roster: { tribeId: tribe.id, rosterId },
        },
        create: { tribeId: tribe.id, rosterId, isAiHost: false },
        update: {},
      })
    }
  }
  await appendSurvivorAudit(leagueId, config.configId, 'chat_membership_updated', { action: 'sync_after_shuffle' })
  return { ok: true }
}
