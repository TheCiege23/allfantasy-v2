import { prisma } from '@/lib/prisma'
import { handleInvalidationTrigger } from '@/lib/trade-engine/caching'
import { appendSurvivorAudit } from './SurvivorAuditLog'
import { getSurvivorConfig } from './SurvivorLeagueConfig'

interface MutableRosterData {
  mode: 'array' | 'object'
  rawObject: Record<string, unknown>
  players: string[]
  starters: string[]
}

interface TransferLog {
  idolId: string
  playerId: string
  fromRosterId: string
  toRosterId: string
}

function dedupePlayerIds(playerIds: string[]): string[] {
  return [...new Set(playerIds.map((playerId) => playerId?.trim()).filter((playerId): playerId is string => Boolean(playerId)))]
}

function getRawPlayerIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return dedupePlayerIds(
    value.map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object') {
        const objectEntry = entry as Record<string, unknown>
        return typeof objectEntry.id === 'string'
          ? objectEntry.id
          : typeof objectEntry.player_id === 'string'
            ? objectEntry.player_id
            : ''
      }
      return ''
    })
  )
}

function normalizeRosterData(playerData: unknown): MutableRosterData {
  if (Array.isArray(playerData)) {
    return {
      mode: 'array',
      rawObject: {},
      players: getRawPlayerIds(playerData),
      starters: [],
    }
  }

  const rawObject =
    playerData && typeof playerData === 'object' && !Array.isArray(playerData)
      ? { ...(playerData as Record<string, unknown>) }
      : {}

  const players = Array.isArray(rawObject.players)
    ? getRawPlayerIds(rawObject.players)
    : Array.isArray(rawObject.roster)
      ? getRawPlayerIds(rawObject.roster)
      : []
  const starters = Array.isArray(rawObject.starters) ? getRawPlayerIds(rawObject.starters) : []

  return {
    mode: 'object',
    rawObject,
    players,
    starters,
  }
}

function serializeRosterData(data: MutableRosterData): unknown {
  const players = dedupePlayerIds(data.players)
  const starters = dedupePlayerIds(data.starters)

  if (data.mode === 'array') {
    return players
  }

  const next: Record<string, unknown> = { ...data.rawObject, players }
  if (Array.isArray(data.rawObject.roster)) {
    next.roster = players
  }
  if (Array.isArray(data.rawObject.starters)) {
    next.starters = starters
  }
  return next
}

export async function stealPlayerForSurvivor(args: {
  leagueId: string
  fromRosterId: string
  toRosterId: string
  playerId: string
}): Promise<{ ok: boolean; error?: string }> {
  const { leagueId, fromRosterId, toRosterId, playerId } = args
  if (fromRosterId === toRosterId) {
    return { ok: false, error: 'Choose another manager to steal a player from' }
  }

  let transferLog: TransferLog | null = null

  try {
    transferLog = await prisma.$transaction(async (tx): Promise<TransferLog | null> => {
      const [fromRoster, toRoster] = await Promise.all([
        tx.roster.findFirst({
          where: { id: fromRosterId, leagueId },
          select: { id: true, playerData: true },
        }),
        tx.roster.findFirst({
          where: { id: toRosterId, leagueId },
          select: { id: true, playerData: true },
        }),
      ])

      if (!fromRoster || !toRoster) {
        throw new Error('Roster not found for this Survivor league')
      }

      const sourceData = normalizeRosterData(fromRoster.playerData)
      const targetData = normalizeRosterData(toRoster.playerData)

      if (!targetData.players.includes(playerId)) {
        throw new Error('That manager does not currently roster this player')
      }
      if (sourceData.players.includes(playerId)) {
        throw new Error('Your roster already has this player')
      }

      sourceData.players = [...sourceData.players, playerId]
      targetData.players = targetData.players.filter((currentPlayerId) => currentPlayerId !== playerId)
      targetData.starters = targetData.starters.filter((currentPlayerId) => currentPlayerId !== playerId)

      await Promise.all([
        tx.roster.update({
          where: { id: fromRoster.id },
          data: { playerData: serializeRosterData(sourceData) as any },
        }),
        tx.roster.update({
          where: { id: toRoster.id },
          data: { playerData: serializeRosterData(targetData) as any },
        }),
      ])

      const boundIdol = await tx.survivorIdol.findFirst({
        where: {
          leagueId,
          playerId,
          status: { in: ['hidden', 'revealed'] },
        },
        select: {
          id: true,
          rosterId: true,
        },
      })

      if (boundIdol && boundIdol.rosterId !== fromRosterId) {
        const nextTransferLog: TransferLog = {
          idolId: boundIdol.id,
          playerId,
          fromRosterId: boundIdol.rosterId,
          toRosterId: fromRosterId,
        }

        await tx.survivorIdol.update({
          where: { id: boundIdol.id },
          data: { rosterId: fromRosterId },
        })
        await tx.survivorIdolLedgerEntry.create({
          data: {
            leagueId,
            idolId: boundIdol.id,
            eventType: 'transferred',
            fromRosterId: boundIdol.rosterId,
            toRosterId: fromRosterId,
            metadata: { reason: 'stolen_player', playerId },
          },
        })

        return nextTransferLog
      }

      return null
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to steal player right now',
    }
  }

  if (transferLog) {
    const config = await getSurvivorConfig(leagueId)
    if (config) {
      await appendSurvivorAudit(leagueId, config.configId, 'idol_transferred', {
        idolId: transferLog.idolId,
        fromRosterId: transferLog.fromRosterId,
        toRosterId: transferLog.toRosterId,
        playerId: transferLog.playerId,
        reason: 'stolen_player',
      })
    }
  }

  handleInvalidationTrigger('roster_change', leagueId)
  return { ok: true }
}

export async function swapStarterForSurvivor(args: {
  leagueId: string
  rosterId: string
  starterPlayerId: string
  benchPlayerId: string
}): Promise<{ ok: boolean; error?: string }> {
  const { leagueId, rosterId, starterPlayerId, benchPlayerId } = args
  if (starterPlayerId === benchPlayerId) {
    return { ok: false, error: 'Choose two different players for a starter swap' }
  }

  const roster = await prisma.roster.findFirst({
    where: { id: rosterId, leagueId },
    select: { id: true, playerData: true },
  })
  if (!roster) {
    return { ok: false, error: 'Roster not found for this Survivor league' }
  }

  const rosterData = normalizeRosterData(roster.playerData)
  if (rosterData.starters.length === 0) {
    return { ok: false, error: 'This roster does not have editable starter slots' }
  }
  if (!rosterData.players.includes(benchPlayerId)) {
    return { ok: false, error: 'That bench player is not on the selected roster' }
  }
  if (!rosterData.starters.includes(starterPlayerId)) {
    return { ok: false, error: 'That starter is not currently in the active lineup' }
  }
  if (rosterData.starters.includes(benchPlayerId)) {
    return { ok: false, error: 'That player is already in the active lineup' }
  }

  const starterIndex = rosterData.starters.findIndex((playerId) => playerId === starterPlayerId)
  if (starterIndex < 0) {
    return { ok: false, error: 'Unable to find the starter slot to swap' }
  }

  rosterData.starters = [...rosterData.starters]
  rosterData.starters[starterIndex] = benchPlayerId

  await prisma.roster.update({
    where: { id: roster.id },
    data: { playerData: serializeRosterData(rosterData) as any },
  })

  handleInvalidationTrigger('roster_change', leagueId)
  return { ok: true }
}
