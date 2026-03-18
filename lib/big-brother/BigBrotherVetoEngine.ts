/**
 * [NEW] lib/big-brother/BigBrotherVetoEngine.ts
 * Veto pool (HOH + 2 noms + random), winner, use/save, replacement. Deterministic & auditable. PROMPT 2/6.
 */

import { prisma } from '@/lib/prisma'
import { getBigBrotherConfig } from './BigBrotherLeagueConfig'
import { getExcludedRosterIds } from './bigBrotherGuard'

/** Seeded shuffle for deterministic veto draw. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0
    const j = (s % (i + 1)) >>> 0
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Build deterministic seed for veto draw: leagueId + configId + week hashed to number.
 */
function vetoDrawSeed(leagueId: string, configId: string, week: number): number {
  const str = `${leagueId}:${configId}:${week}`
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h) || 1
}

/**
 * Select veto competitors: HOH + nominee1 + nominee2 + (vetoCompetitorCount - 3) random from rest.
 * If league is small, use as many eligible as possible without duplicates.
 * Returns ordered list (auditable); store in cycle.vetoParticipantRosterIds.
 */
export async function selectVetoCompetitors(cycleId: string): Promise<{ ok: boolean; rosterIds?: string[]; error?: string }> {
  const cycle = await prisma.bigBrotherCycle.findUnique({
    where: { id: cycleId },
    select: {
      id: true,
      leagueId: true,
      configId: true,
      week: true,
      hohRosterId: true,
      nominee1RosterId: true,
      nominee2RosterId: true,
    },
  })
  if (!cycle?.hohRosterId || !cycle.nominee1RosterId || !cycle.nominee2RosterId) {
    return { ok: false, error: 'Cycle missing HOH or nominations' }
  }

  const config = await getBigBrotherConfig(cycle.leagueId)
  if (!config) return { ok: false, error: 'Not a Big Brother league' }

  const excluded = await getExcludedRosterIds(cycle.leagueId)
  const fixed = [cycle.hohRosterId, cycle.nominee1RosterId, cycle.nominee2RosterId]
  const rest = await prisma.roster.findMany({
    where: {
      leagueId: cycle.leagueId,
      id: { notIn: [...excluded, ...fixed] },
    },
    select: { id: true },
  })
  const restIds = rest.map((r) => r.id)
  const needCount = Math.max(0, config.vetoCompetitorCount - 3)
  const seed = vetoDrawSeed(cycle.leagueId, cycle.configId, cycle.week)
  const shuffled = seededShuffle(restIds, seed)
  const drawn = shuffled.slice(0, needCount)
  const rosterIds = [...fixed, ...drawn]

  await prisma.bigBrotherCycle.update({
    where: { id: cycleId },
    data: { vetoParticipantRosterIds: rosterIds },
  })
  return { ok: true, rosterIds }
}

/**
 * Record veto winner (from challenge result).
 */
export async function setVetoWinner(cycleId: string, winnerRosterId: string): Promise<{ ok: boolean; error?: string }> {
  const cycle = await prisma.bigBrotherCycle.findUnique({
    where: { id: cycleId },
    select: { vetoParticipantRosterIds: true },
  })
  if (!cycle) return { ok: false, error: 'Cycle not found' }
  const participants = (cycle.vetoParticipantRosterIds as string[] | null) ?? []
  if (!participants.includes(winnerRosterId)) return { ok: false, error: 'Winner was not a veto competitor' }

  await prisma.bigBrotherCycle.update({
    where: { id: cycleId },
    data: { vetoWinnerRosterId: winnerRosterId },
  })
  return { ok: true }
}

/**
 * Record veto use: save one nominee. HOH must then name replacement.
 */
export async function useVeto(cycleId: string, savedRosterId: string): Promise<{ ok: boolean; error?: string }> {
  const cycle = await prisma.bigBrotherCycle.findUnique({
    where: { id: cycleId },
    select: { nominee1RosterId: true, nominee2RosterId: true },
  })
  if (!cycle) return { ok: false, error: 'Cycle not found' }
  if (savedRosterId !== cycle.nominee1RosterId && savedRosterId !== cycle.nominee2RosterId) {
    return { ok: false, error: 'Saved roster must be one of the two nominees' }
  }

  await prisma.bigBrotherCycle.update({
    where: { id: cycleId },
    data: { vetoUsed: true, vetoSavedRosterId: savedRosterId },
  })
  return { ok: true }
}
