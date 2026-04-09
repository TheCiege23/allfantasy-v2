/**
 * Survivor idol registry: assignment, transfer, use, expiry (PROMPT 346). Deterministic.
 * Player-bound; one per user at initial assignment; full chain-of-custody in SurvivorIdolLedgerEntry.
 */

import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { appendSurvivorAudit } from './SurvivorAuditLog'
import { DEFAULT_IDOL_POWER_POOL, IDOL_DISTRIBUTION_PERCENT, IDOL_POWER_DESCRIPTIONS } from './constants'
import { getEligibleRosterIdsForCouncil } from './SurvivorCouncilEligibility'
import { applyIdolPowerEffect } from './SurvivorEffectEngine'
import { getFinaleState } from './SurvivorFinaleEngine'
import { getCouncil } from './SurvivorTribalCouncilService'
import { resolveSurvivorCurrentWeek } from './SurvivorTimelineResolver'
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

  // Calculate idol count: 30-35% of league (configurable, capped by pool size)
  const autoCount = Math.max(1, Math.round(playerRosterPairs.length * IDOL_DISTRIBUTION_PERCENT))
  const count = Math.min(config.idolCount || autoCount, playerRosterPairs.length)

  // Calculate expiry week from commissioner config or default (Final 5 = playerCount - 5 + 2)
  const leagueForExpiry = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { survivorPlayerCount: true, settings: true },
  })
  const playerCount = leagueForExpiry?.survivorPlayerCount ?? playerRosterPairs.length
  const settingsJson = (leagueForExpiry?.settings ?? {}) as Record<string, unknown>
  const expiryWeek = typeof settingsJson.survivorIdolExpiryWeek === 'number'
    ? settingsJson.survivorIdolExpiryWeek
    : Math.max(8, playerCount - 5 + 2)
  if (count <= 0) return { ok: true, assigned: 0 }

  // Build power pool — each idol gets a UNIQUE type (no duplicates)
  const pool = config.idolPowerPool?.length ? [...config.idolPowerPool] : [...DEFAULT_IDOL_POWER_POOL]
  const rng = seededRandom(options?.seed ?? Date.now())

  // Shuffle pool so idol types are randomized
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  // Shuffle player-roster pairs to randomize who gets idols
  const usedRosterIds = new Set<string>()
  const shuffled = [...playerRosterPairs]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  let assigned = 0
  for (let i = 0; i < count && i < pool.length; i++) {
    const pair = shuffled[i]
    if (!pair || usedRosterIds.has(pair.rosterId)) continue
    usedRosterIds.add(pair.rosterId)
    const powerType = pool[i] ?? 'protect_self'
    const powerLabel = powerType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    const powerDesc = IDOL_POWER_DESCRIPTIONS[powerType] ?? ''
    const idol = await prisma.survivorIdol.create({
      data: {
        leagueId,
        configId: config.configId,
        rosterId: pair.rosterId,
        playerId: pair.playerId,   // Idol is BOUND to this player, not the manager
        powerType,
        powerLabel,
        powerDesc,
        powerCategory: getIdolCategory(powerType),
        currentOwnerUserId: null,  // Will be set when bootstrap DMs the holder
        originalOwnerUserId: null,
        isSecret: true,
        isTradable: true,          // Idol transfers with player on trade/waiver
        expiresAtWeek: expiryWeek,
        status: 'hidden',
        assignedAt: new Date(),
      },
    })
    await prisma.survivorIdolLedgerEntry.create({
      data: {
        leagueId,
        idolId: idol.id,
        eventType: 'assigned',
        toRosterId: pair.rosterId,
        metadata: { playerId: pair.playerId, powerType, powerLabel, boundToPlayer: true },
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

  const councilId = typeof context?.councilId === 'string' ? context.councilId : null
  const councilWeekRaw = context?.week ?? context?.currentWeek
  const councilWeek =
    typeof councilWeekRaw === 'number'
      ? councilWeekRaw
      : typeof councilWeekRaw === 'string' && councilWeekRaw.trim()
        ? Number.parseInt(councilWeekRaw, 10)
        : null
  const council = councilId
    ? await prisma.survivorTribalCouncil.findUnique({ where: { id: councilId } })
    : councilWeek != null
      ? await getCouncil(leagueId, councilWeek)
      : null
  const finaleOnlyPower = idol.powerType === 'jury_influence' || idol.powerType === 'finale_advantage'
  if (!council && !finaleOnlyPower) return { ok: false, error: 'Idols can only be played during an active Tribal Council' }

  if (council) {
    if (council.closedAt) return { ok: false, error: 'This Tribal Council is already closed' }
    if (new Date() > council.voteDeadlineAt) return { ok: false, error: 'The Tribal Council deadline has passed' }

    const eligibleRosterIds = await getEligibleRosterIdsForCouncil(council.id)
    if (!eligibleRosterIds.includes(rosterId)) {
      return { ok: false, error: 'You are not eligible to play an idol in this council' }
    }
    if (idol.powerType === 'protect_self' || idol.powerType === 'protect_self_plus_one') {
      const protectedRosterId =
        typeof context?.protectedRosterId === 'string' ? context.protectedRosterId.trim() : ''
      if (protectedRosterId && !eligibleRosterIds.includes(protectedRosterId)) {
        return { ok: false, error: 'That manager is not eligible to receive idol protection in this council' }
      }
    }
    if (idol.powerType === 'vote_nullifier') {
      const nullifiedVoterRosterId =
        typeof context?.nullifiedVoterRosterId === 'string' ? context.nullifiedVoterRosterId.trim() : ''
      if (nullifiedVoterRosterId && !eligibleRosterIds.includes(nullifiedVoterRosterId)) {
        return { ok: false, error: 'That manager is not eligible to have their vote nullified in this council' }
      }
    }
  } else if (finaleOnlyPower) {
    const finaleWeek = councilWeek ?? (await resolveSurvivorCurrentWeek(leagueId))
    const finaleState = await getFinaleState(leagueId, finaleWeek)
    if (!finaleState.open) {
      return { ok: false, error: 'This idol can only be played while the Survivor finale is open' }
    }
    if (idol.powerType === 'jury_influence' && !finaleState.juryRosterIds.includes(rosterId)) {
      return { ok: false, error: 'Only jury members can use jury influence in the finale' }
    }
    const finalistTarget =
      typeof context?.targetRosterId === 'string' && context.targetRosterId.trim()
        ? context.targetRosterId.trim()
        : rosterId
    if (idol.powerType === 'finale_advantage' && !finaleState.finalists.includes(finalistTarget)) {
      return { ok: false, error: 'Finale advantage must target an active finalist' }
    }
    if (idol.powerType === 'finale_advantage') {
      context = {
        ...(context ?? {}),
        targetRosterId: finalistTarget,
      }
    }
  }

  const effectResult = await applyIdolPowerEffect({
    leagueId,
    idolId,
    rosterId,
    powerType: idol.powerType,
    context,
  })
  if (!effectResult.ok) {
    return { ok: false, error: effectResult.error ?? 'Unable to apply this idol power right now' }
  }

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
      metadata: {
        ...(context ?? {}),
        powerType: idol.powerType,
        appliedEffect: effectResult.effect ?? null,
      },
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
 * Expire all idols past their expiry week. Called by automation cron each cycle.
 */
export async function expireIdolsByWeek(leagueId: string, currentWeek: number): Promise<number> {
  const idolsDue = await prisma.survivorIdol.findMany({
    where: {
      leagueId,
      status: { in: ['hidden', 'revealed'] },
      isUsed: false,
      expiresAtWeek: { lte: currentWeek },
    },
    select: { id: true },
  })
  let expired = 0
  for (const idol of idolsDue) {
    const result = await expireIdol(leagueId, idol.id)
    if (result.ok) expired++
  }
  return expired
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

/** Categorize an idol power type for balance tracking. */
function getIdolCategory(powerType: string): string {
  if (powerType.startsWith('protect_')) return 'immunity'
  if (['extra_vote', 'double_vote', 'vote_nullifier', 'vote_steal'].includes(powerType)) return 'vote_control'
  if (powerType.startsWith('score_') || powerType.startsWith('rival_')) return 'score'
  if (powerType.startsWith('steal_') || powerType === 'swap_starter') return 'roster_movement'
  if (powerType.startsWith('waiver_') || powerType === 'faab_bonus') return 'waiver_faab'
  if (['tribe_immunity_modifier', 'secret_tribe_power', 'force_tribe_shuffle'].includes(powerType)) return 'tribe_control'
  if (['idol_sniffer', 'reveal_tribe_powers'].includes(powerType)) return 'information'
  if (['jury_influence', 'finale_advantage'].includes(powerType)) return 'endgame'
  return 'other'
}

/**
 * Handle @Chimmy idol play request. Validates ownership, status, and timing.
 * Returns a response message for Chimmy to send back to the user.
 */
export async function handleChimmyIdolPlayRequest(
  leagueId: string,
  userId: string,
  idolIdOrAuto?: string,
): Promise<{ ok: boolean; message: string; idolUsed?: boolean; announcement?: string }> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return { ok: false, message: 'This is not a Survivor league.' }

  // Find user's roster
  const roster = await prisma.roster.findFirst({
    where: { leagueId, platformUserId: userId },
    select: { id: true },
  })
  if (!roster) return { ok: false, message: 'You are not in this league.' }

  // Find user's active idols
  const idols = await prisma.survivorIdol.findMany({
    where: {
      leagueId,
      rosterId: roster.id,
      status: { in: ['hidden', 'revealed'] },
      isUsed: false,
    },
    select: { id: true, powerType: true, powerLabel: true, powerDesc: true },
  })

  if (idols.length === 0) {
    return { ok: false, message: 'You have no idol to play. You either never received one, or it has already been used.' }
  }

  // Pick which idol (auto = first, or by ID if specified)
  const idol = idolIdOrAuto
    ? idols.find((i) => i.id === idolIdOrAuto) ?? idols[0]!
    : idols[0]!

  // Check if there's an active council that hasn't been counted yet
  const council = await prisma.survivorTribalCouncil.findFirst({
    where: {
      leagueId,
      status: { in: ['pending', 'voting_open', 'voting_in_progress', 'votes_locked'] },
      closedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, week: true },
  })

  if (!council) {
    return { ok: false, message: 'There is no active Tribal Council right now. Idols can only be played before votes are counted.' }
  }

  if (council.status === 'reveal_in_progress' || council.status === 'completed') {
    return { ok: false, message: 'Votes have already been counted. It is too late to play your idol.' }
  }

  // Use the idol
  const result = await useIdol(leagueId, idol.id, roster.id, { councilId: council.id, week: council.week })
  if (!result.ok) {
    return { ok: false, message: result.error ?? 'Could not play idol.' }
  }

  const powerName = idol.powerLabel ?? idol.powerType.replace(/_/g, ' ')
  const announcement = `An idol has been played! ${powerName} — ${idol.powerDesc ?? 'Power activated.'}`

  return {
    ok: true,
    idolUsed: true,
    message: `Your idol has been played: **${powerName}**. ${idol.powerDesc ?? ''} The tribe will be notified.`,
    announcement,
  }
}

/**
 * Auto-transfer idols when a player moves between rosters (trade or waiver pickup).
 * Idols are bound to PLAYERS, not managers. When a player changes teams,
 * the idol goes with them.
 */
export async function transferIdolOnPlayerMovement(
  leagueId: string,
  playerId: string,
  fromRosterId: string,
  toRosterId: string,
  reason: 'trade' | 'waiver_claim',
): Promise<{ transferred: boolean; idolId?: string; powerType?: string }> {
  const idol = await getIdolByPlayer(leagueId, playerId)
  if (!idol) return { transferred: false }

  await transferIdol(leagueId, idol.id, toRosterId, reason)

  // Notify the new owner privately via @Chimmy
  const newOwnerRoster = await prisma.roster.findUnique({
    where: { id: toRosterId },
    select: { platformUserId: true },
  })
  const idolDetails = await prisma.survivorIdol.findUnique({
    where: { id: idol.id },
    select: { powerType: true, powerLabel: true, powerDesc: true },
  })

  if (newOwnerRoster?.platformUserId && idolDetails) {
    await prisma.survivorChatMessage.create({
      data: {
        leagueId,
        channelId: `chimmy:${newOwnerRoster.platformUserId}`,
        channelType: 'private_ai',
        senderUserId: 'system',
        senderName: '@Chimmy',
        senderIsHost: true,
        isSystemMessage: true,
        content: `You picked up a player carrying a hidden power! You now hold: **${idolDetails.powerLabel ?? idolDetails.powerType}**\n\n${idolDetails.powerDesc ?? 'Use it wisely.'}\n\nMessage me to play it before tribal votes are counted.`,
        contentType: 'card',
        cardData: {
          type: 'idol_transferred',
          powerType: idolDetails.powerType,
          powerLabel: idolDetails.powerLabel,
          reason,
        },
      },
    }).catch(() => {})
  }

  return { transferred: true, idolId: idol.id, powerType: idolDetails?.powerType }
}
