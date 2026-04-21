import type { LeagueSport } from '@prisma/client'
import { optimizeLineupDeterministic } from '@/lib/lineup-optimizer-engine/LineupOptimizerEngine'
import { getBestBallSportProfile } from '@/lib/bestball/rules'
import { optimizeSoccerFormation } from '@/lib/bestball/soccerFormationOptimizer'
import type { OptimizerPlayer } from '@/lib/bestball/types'

export type BestBallOptimizerPlayer = {
  playerId: string
  playerName: string
  position: string
  team?: string | null
  points: number
}

export type BestBallOptimizerResult = {
  starterIds: string[]
  totalPoints: number
  starters: Array<{
    playerId: string
    playerName: string
    position: string
    slot: string
    points: number
  }>
  benchIds: string[]
  notes: string[]
}

function normalizeSoccerPosition(raw: string): 'GK' | 'DEF' | 'MID' | 'FWD' | null {
  const value = String(raw ?? '').trim().toUpperCase()
  if (!value) return null
  if (['GK', 'GKP'].includes(value)) return 'GK'
  if (['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'].includes(value)) return 'DEF'
  if (['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM', 'AM'].includes(value)) return 'MID'
  if (['FWD', 'ST', 'CF', 'LW', 'RW', 'SS'].includes(value)) return 'FWD'
  return null
}

export function optimizeBestBallLeagueLineup(
  sport: LeagueSport | string,
  players: BestBallOptimizerPlayer[],
): BestBallOptimizerResult {
  const profile = getBestBallSportProfile(sport)
  const safePlayers = players
    .filter((player) => player.playerId)
    .map((player) => ({
      ...player,
      position: String(player.position ?? 'UTIL').trim().toUpperCase() || 'UTIL',
      points: Number.isFinite(player.points) ? player.points : 0,
    }))

  if (profile.sport === 'SOCCER') {
    const soccerPlayers: OptimizerPlayer[] = []
    for (const player of safePlayers) {
      const normalized = normalizeSoccerPosition(player.position)
      if (!normalized) continue
      soccerPlayers.push({
        playerId: player.playerId,
        playerName: player.playerName,
        position: normalized,
        points: player.points,
      })
    }

    const optimized = optimizeSoccerFormation(
      soccerPlayers.sort((a, b) => b.points - a.points),
      { lineupSlots: profile.lineupSlots },
    )
    const starterIds = optimized.assignments.map((assignment) => assignment.player.playerId)
    const starterIdSet = new Set(starterIds)
    return {
      starterIds,
      totalPoints: optimized.totalPoints,
      starters: optimized.assignments.map((assignment) => ({
        playerId: assignment.player.playerId,
        playerName: assignment.player.playerName,
        position: assignment.player.position,
        slot: assignment.slot,
        points: assignment.player.points,
      })),
      benchIds: safePlayers.map((player) => player.playerId).filter((playerId) => !starterIdSet.has(playerId)),
      notes: [optimized.log ?? `Valid soccer formation ${optimized.formation}`],
    }
  }

  const optimized = optimizeLineupDeterministic({
    sport: profile.sport,
    players: safePlayers.map((player) => ({
      id: player.playerId,
      name: player.playerName,
      positions: [player.position],
      projectedPoints: player.points,
      team: player.team ?? undefined,
    })),
    slots: profile.lineupSlots.flatMap((slot) =>
      Array.from({ length: slot.count }, (_, index) => ({
        id: `${slot.code}-${index + 1}`,
        code: slot.code,
        label: slot.code,
        allowedPositions: slot.allowedPositions,
      })),
    ),
  })

  const starterIds = optimized.starters.map((starter) => starter.playerId)
  return {
    starterIds,
    totalPoints: optimized.totalProjectedPoints,
    starters: optimized.starters.map((starter) => ({
      playerId: starter.playerId,
      playerName: starter.playerName,
      position: starter.selectedPosition,
      slot: starter.slotCode,
      points: starter.projectedPoints,
    })),
    benchIds: optimized.bench.map((bench) => bench.playerId),
    notes: optimized.deterministicNotes,
  }
}
