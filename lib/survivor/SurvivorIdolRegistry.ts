/**
 * Survivor idol registry: assignment, transfer, use, expiry (PROMPT 346). Deterministic.
 * Player-bound; one per user at initial assignment; full chain-of-custody in SurvivorIdolLedgerEntry.
 */

import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { appendSurvivorAudit } from './SurvivorAuditLog'
import { DEFAULT_IDOL_POWER_POOL } from './constants'
import type { IdolPowerType } from './types'

/** Seeded RNG for deterministic assignment. */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) >>> 0
    return (s >>> 0) / 0xffff_ffff
  }
}

/**
 * Assign idols after draft: N idols to N distinct drafted players; max one per roster at assignment.
 * playerRosterPairs: { playerId, rosterId }[] for all drafted players (from draft picks).
 */
export async function assignIdolsAfterDraft(
  leagueId: string,
  playerRosterPairs: { playerId: string; rosterId: string }[],
  options?: { seed?: number }
): Promise<{ ok: boolean; assigned: number; error?: string }> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return { ok: false, assigned: 0, error: 'Not a Survivor league' }

  const existing = await prisma.survivorIdol.findMany({
    where: { configId: config.configId },
    select: { id: true },
  })
  if (existing.length > 0) return { ok: false, assigned: 0, error: 'Idols already assigned' }

  const count = Math.min(config.idolCount, playerRosterPairs.length)
  if (count <= 0) return { ok: true, assigned: 0 }

  const pool = config.idolPowerPool?.length ? config.idolPowerPool : [...DEFAULT_IDOL_POWER_POOL]
  const rng = seededRandom(options?.seed ?? Date.now())

  const usedRosterIds = new Set<string>()
  const shuffled = [...playerRosterPairs]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  let assigned = 0
  for (let i = 0; i < count; i++) {
    const pair = shuffled[i]
    if (usedRosterIds.has(pair.rosterId)) continue
    usedRosterIds.add(pair.rosterId)
    const powerType = pool[i % pool.length] ?? 'protect_self'
    const idol = await prisma.survivorIdol.create({
      data: {
        leagueId,
        configId: config.configId,
        rosterId: pair.rosterId,
        playerId: pair.playerId,
        powerType,
        status: 'hidden',
      },
    })
    await prisma.survivorIdolLedgerEntry.create({
      data: {
        leagueId,
        idolId: idol.id,
        eventType: 'assigned',
        toRosterId: pair.rosterId,
        metadata: { playerId: pair.playerId, powerType },
      },
    })
    assigned++
  }

  await appendSurvivorAudit(leagueId, config.configId, 'idol_assigned', { count: assigned })
  return { ok: true, assigned }
}

/**
 * Transfer idol ownership (on trade/waiver claim/stolen player). New owner = toRosterId.
 */
export async function transferIdol(
  leagueId: string,
  idolId: string,
  toRosterId: string,
  reason: 'trade' | 'waiver_claim' | 'stolen_player'
): Promise<{ ok: boolean; error?: string }> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const idol = await prisma.survivorIdol.findFirst({
    where: { id: idolId, leagueId, configId: config.configId },
  })
  if (!idol) return { ok: false, error: 'Idol not found' }
  if (idol.status !== 'hidden' && idol.status !== 'revealed') return { ok: false, error: 'Idol already used or expired' }

  const fromRosterId = idol.rosterId
  await prisma.survivorIdol.update({
    where: { id: idolId },
    data: { rosterId: toRosterId },
  })
  await prisma.survivorIdolLedgerEntry.create({
    data: {
      leagueId,
      idolId,
      eventType: 'transferred',
      fromRosterId,
      toRosterId,
      metadata: { reason },
    },
  })
  await appendSurvivorAudit(leagueId, config.configId, 'idol_transferred', {
    idolId,
    fromRosterId,
    toRosterId,
    reason,
  })
  return { ok: true }
}

/**
 * Get idol by player (for transfer on trade/claim/steal). Returns first active idol bound to this player.
 */
export async function getIdolByPlayer(leagueId: string, playerId: string): Promise<{ id: string; rosterId: string } | null> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return null
  const idol = await prisma.survivorIdol.findFirst({
    where: { leagueId, configId: config.configId, playerId, status: { in: ['hidden', 'revealed'] } },
    select: { id: true, rosterId: true },
  })
  return idol
}

/**
 * Validate and apply idol use. Returns ok and optional error.
 */
export async function useIdol(
  leagueId: string,
  idolId: string,
  rosterId: string,
  context?: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const idol = await prisma.survivorIdol.findFirst({
    where: { id: idolId, leagueId, configId: config.configId },
  })
  if (!idol) return { ok: false, error: 'Idol not found' }
  if (idol.rosterId !== rosterId) return { ok: false, error: 'Not your idol' }
  if (idol.status !== 'hidden' && idol.status !== 'revealed') return { ok: false, error: 'Idol already used or expired' }

  await prisma.survivorIdol.update({
    where: { id: idolId },
    data: { status: 'used', usedAt: new Date() },
  })
  await prisma.survivorIdolLedgerEntry.create({
    data: {
      leagueId,
      idolId,
      eventType: 'used',
      fromRosterId: rosterId,
      metadata: context ?? {},
    },
  })
  await appendSurvivorAudit(leagueId, config.configId, 'idol_used', {
    idolId,
    rosterId,
    powerType: idol.powerType,
  })
  return { ok: true }
}

/**
 * Mark idol expired (e.g. valid until merge and we merged).
 */
export async function expireIdol(leagueId: string, idolId: string): Promise<{ ok: boolean; error?: string }> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const idol = await prisma.survivorIdol.findFirst({
    where: { id: idolId, leagueId, configId: config.configId },
  })
  if (!idol) return { ok: false, error: 'Idol not found' }
  if (idol.status === 'used' || idol.status === 'expired') return { ok: true }

  await prisma.survivorIdol.update({
    where: { id: idolId },
    data: { status: 'expired', expiredAt: new Date() },
  })
  await prisma.survivorIdolLedgerEntry.create({
    data: { leagueId, idolId, eventType: 'expired', fromRosterId: idol.rosterId, metadata: {} },
  })
  await appendSurvivorAudit(leagueId, config.configId, 'idol_expired', { idolId })
  return { ok: true }
}

/**
 * Get all active idols for a roster.
 */
export async function getActiveIdolsForRoster(leagueId: string, rosterId: string): Promise<{ id: string; playerId: string; powerType: string }[]> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return []
  const idols = await prisma.survivorIdol.findMany({
    where: { leagueId, configId: config.configId, rosterId, status: { in: ['hidden', 'revealed'] } },
    select: { id: true, playerId: true, powerType: true },
  })
  return idols
}

/**
 * Get chain-of-custody for an idol.
 */
export async function getIdolLedger(idolId: string): Promise<{ eventType: string; fromRosterId: string | null; toRosterId: string | null; metadata: unknown; createdAt: Date }[]> {
  const rows = await prisma.survivorIdolLedgerEntry.findMany({
    where: { idolId },
    orderBy: { createdAt: 'asc' },
    select: { eventType: true, fromRosterId: true, toRosterId: true, metadata: true, createdAt: true },
  })
  return rows
}
