/**
 * Survivor tribe assignment, rebalance, swap, merge — integrates with SurvivorTribeService (roster-based).
 */

import { prisma } from '@/lib/prisma'
import type { SurvivorTribe } from '@prisma/client'
import { createTribes } from './SurvivorTribeService'
import { appendSurvivorAudit } from './SurvivorAuditLog'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { postHostMessage } from './hostEngine'

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const TRIBE_COLORS = ['#38bdf8', '#f97316', '#a78bfa', '#34d399', '#f472b6', '#fbbf24', '#94a3b8', '#ef4444']

function autoTribeNames(count: number): string[] {
  const base = ['Vaka', 'Baka', 'Luvu', 'Ua', 'Yase', 'Nuku', 'Sele', 'Dakal']
  return Array.from({ length: count }, (_, i) => base[i % base.length] + (i >= base.length ? ` ${i + 1}` : ''))
}

/**
 * Assign managers to tribes. Uses existing Survivor config + roster rows.
 * `draft_pattern`: snake draft order by roster creation order for balanced tribes.
 */
export async function assignPlayersToTribes(
  leagueId: string,
  mode: 'auto' | 'manual' | 'draft_pattern',
): Promise<SurvivorTribe[]> {
  if (mode === 'manual') {
    throw new Error('Manual tribe assignment must supply roster→tribe mapping via commissioner tools.')
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      name: true,
      survivorTribeCount: true,
      survivorTribeNaming: true,
      survivorPhase: true,
    },
  })
  const config = await getSurvivorConfig(leagueId)
  if (!config) throw new Error('Survivor config missing — enable Survivor for this league first.')

  const tribeCount = league?.survivorTribeCount ?? config.tribeCount
  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  const rosterIds = rosters.map((r) => r.id)
  if (rosterIds.length === 0) throw new Error('No rosters in league')

  let formation: 'random' | 'commissioner' = 'random'
  let rosterToTribeIndex: Record<string, number> | undefined

  if (mode === 'draft_pattern') {
    formation = 'commissioner'
    const n = tribeCount
    rosterToTribeIndex = {}
    let direction = 1
    let slot = 0
    for (let i = 0; i < rosterIds.length; i++) {
      const rid = rosterIds[i]!
      rosterToTribeIndex[rid] = slot
      slot += direction
      if (slot >= n || slot < 0) {
        direction *= -1
        slot += direction
      }
    }
  } else if (mode === 'auto') {
    const shuffled = fisherYatesShuffle(rosterIds)
    formation = 'commissioner'
    rosterToTribeIndex = {}
    shuffled.forEach((rid, i) => {
      rosterToTribeIndex![rid] = i % tribeCount
    })
  } else {
    formation = 'random'
  }

  const naming = league?.survivorTribeNaming ?? 'auto'
  const tribeNames = naming === 'auto' ? autoTribeNames(tribeCount) : undefined

  const created = await createTribes(leagueId, {
    rosterIds,
    formation,
    rosterToTribeIndex,
    tribeNames,
    seed: Date.now(),
  })
  if (!created.ok || !created.tribes) {
    throw new Error(created.error ?? 'Tribe assignment failed')
  }

  const tribeRows = await prisma.survivorTribe.findMany({
    where: { configId: config.configId },
    orderBy: { slotIndex: 'asc' },
  })

  for (let i = 0; i < tribeRows.length; i++) {
    const color = TRIBE_COLORS[i % TRIBE_COLORS.length]
    await prisma.survivorTribe.update({
      where: { id: tribeRows[i]!.id },
      data: { colorHex: color, phase: 'pre_merge' },
    })
  }

  await appendSurvivorAudit(leagueId, config.configId, 'tribe_created', { mode, tribeCount })

  await postHostMessage(
    leagueId,
    'welcome',
    { leagueName: league?.name ?? leagueId, week: 1 },
    'league_chat',
  ).catch(() => {})

  return prisma.survivorTribe.findMany({
    where: { leagueId },
    orderBy: { slotIndex: 'asc' },
  })
}

export async function rebalanceTribes(leagueId: string): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { survivorRebalanceTrigger: true },
  })
  const minSize = league?.survivorRebalanceTrigger ?? 3
  const config = await getSurvivorConfig(leagueId)
  if (!config) return

  const tribes = await prisma.survivorTribe.findMany({
    where: { configId: config.configId, isMerged: false },
    include: { members: true },
  })
  const small = tribes.filter((t) => t.members.length < minSize && t.members.length > 0)
  if (small.length === 0) return

  const donors = tribes.filter((t) => t.members.length > minSize + 1)
  // Minimal rebalance: move one member from largest donor to smallest tribe (placeholder logic)
  for (const st of small) {
    const donor = donors.sort((a, b) => b.members.length - a.members.length)[0]
    if (!donor?.members[0]) continue
    const m = donor.members[0]!
    await prisma.survivorTribeMember.update({
      where: { id: m.id },
      data: { tribeId: st.id },
    })
  }

  await appendSurvivorAudit(leagueId, config.configId, 'tribe_shuffle', { minSize })
}

export async function executeTribeSwap(
  leagueId: string,
  week: number,
  swapType: string,
): Promise<{ id: string }> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) throw new Error('No Survivor config')

  const tribes = await prisma.survivorTribe.findMany({
    where: { configId: config.configId },
    include: { members: true },
  })
  const beforeSnapshot = tribes.map((t) => ({
    tribeId: t.id,
    rosterIds: t.members.map((m) => m.rosterId),
  }))
  const allRosterIds = tribes.flatMap((t) => t.members.map((m) => m.rosterId))
  const shuffled = fisherYatesShuffle(allRosterIds)
  const n = Math.max(1, tribes.length)
  const per = Math.ceil(shuffled.length / n)
  for (let ti = 0; ti < tribes.length; ti++) {
    const t = tribes[ti]!
    const slice = shuffled.slice(ti * per, (ti + 1) * per)
    await prisma.survivorTribeMember.deleteMany({ where: { tribeId: t.id } })
    for (const rid of slice) {
      await prisma.survivorTribeMember.create({ data: { tribeId: t.id, rosterId: rid } })
    }
  }

  const afterSnapshot = await prisma.survivorTribe
    .findMany({
      where: { configId: config.configId },
      include: { members: true },
    })
    .then((rows) => rows.map((t) => ({ tribeId: t.id, rosterIds: t.members.map((m) => m.rosterId) })))

  const swap = await prisma.survivorTribeSwap.create({
    data: {
      leagueId,
      week,
      swapType,
      beforeSnapshot: beforeSnapshot as object,
      afterSnapshot: afterSnapshot as object,
    },
  })

  await appendSurvivorAudit(leagueId, config.configId, 'tribe_shuffle', { swapId: swap.id, swapType })
  return { id: swap.id }
}

export async function executeMerge(leagueId: string, week: number): Promise<void> {
  await prisma.league.update({
    where: { id: leagueId },
    data: { survivorPhase: 'merge' },
  })
  const config = await getSurvivorConfig(leagueId)
  if (!config) return

  const mergedName = `Merged — Week ${week}`
  const tribe = await prisma.survivorTribe.create({
    data: {
      leagueId,
      configId: config.configId,
      name: mergedName,
      slotIndex: 99,
      isMerged: true,
      phase: 'merged',
    },
  })

  const members = await prisma.survivorTribeMember.findMany({
    where: { tribe: { configId: config.configId } },
  })
  for (const m of members) {
    await prisma.survivorTribeMember.update({
      where: { id: m.id },
      data: { tribeId: tribe.id },
    })
  }

  await prisma.survivorTribe.updateMany({
    where: { configId: config.configId, id: { not: tribe.id } },
    data: { isActive: false, phase: 'dissolved' },
  })

  await appendSurvivorAudit(leagueId, config.configId, 'merge', { week, mergedTribeId: tribe.id })
  await postHostMessage(leagueId, 'merge_announcement', { leagueName: mergedName, week }, 'merge_chat').catch(
    () => {},
  )
}
