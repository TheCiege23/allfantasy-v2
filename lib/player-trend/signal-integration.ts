import { prisma } from '@/lib/prisma'
import { resolveSportForTrend } from './SportTrendContextResolver'
import { recordTrendSignalsAndUpdate, recordTrendSignal } from './PlayerTrendUpdater'
import type { TrendSignalType } from './types'

interface RecordByNameInput {
  playerNames: string[]
  sport: string | null | undefined
  signalType: TrendSignalType
  leagueId?: string
  value?: number
}

/**
 * Resolve players by name for a sport and record trend signals in one batch update.
 * Best effort only: unknown names are skipped.
 */
export async function recordTrendSignalsByPlayerNames(
  input: RecordByNameInput
): Promise<number> {
  const names = [...new Set(input.playerNames.map((n) => String(n || '').trim()).filter(Boolean))]
  if (names.length === 0) return 0

  const sport = resolveSportForTrend(input.sport)
  const rows = await prisma.player.findMany({
    where: {
      sport,
      OR: names.map((name) => ({
        name: { equals: name, mode: 'insensitive' },
      })),
    },
    select: { id: true },
  })
  if (rows.length === 0) return 0

  await recordTrendSignalsAndUpdate(
    rows.map((p) => ({
      playerId: p.id,
      sport,
      signalType: input.signalType,
      leagueId: input.leagueId,
      value: input.value,
    }))
  )
  return rows.length
}

interface RecordByIdInput {
  playerId: string | null | undefined
  sport: string | null | undefined
  signalType: TrendSignalType
  leagueId?: string
  value?: number
  updateAfter?: boolean
}

/**
 * Record a signal for a known player ID, with optional trend recompute.
 */
export async function recordTrendSignalByPlayerId(input: RecordByIdInput): Promise<void> {
  if (!input.playerId) return
  const sport = resolveSportForTrend(input.sport)

  if (input.updateAfter) {
    await recordTrendSignalsAndUpdate([
      {
        playerId: input.playerId,
        sport,
        signalType: input.signalType,
        leagueId: input.leagueId,
        value: input.value,
      },
    ])
    return
  }

  await recordTrendSignal(input.playerId, sport, input.signalType, {
    leagueId: input.leagueId,
    value: input.value,
  })
}
