/**
 * REDRAFT LINEUP / START-SIT ENGINE — pure, deterministic. No AI, no fabrication.
 *
 * Greedy slot assignment that ranks eligible players by the BEST AVAILABLE value
 * signal (current-week projection → season-to-date actual average). When no signal
 * exists, it still fills slots structurally but flags the output as low-confidence
 * and surfaces a missing-data flag instead of inventing projections.
 *
 * Honours dedicated, FLEX, and SUPERFLEX slot eligibility from the resolved roster
 * template. Redraft-only (no taxi/devy slots are treated as startable).
 */

import type { RedraftLineupSlot, RedraftPlayerFact, RedraftWarRoomContext } from './types'

export interface LineupAssignment {
  slotName: string
  playerId: string | null
  playerName: string | null
  position: string | null
  valueUsed: number | null
  valueSource: 'projection' | 'season_avg' | 'none'
  reason: string
}

export interface StartSitQuestion {
  position: string
  starter: { playerId: string; playerName: string; value: number | null }
  bench: { playerId: string; playerName: string; value: number | null }
  note: string
}

export interface LineupResult {
  rosterId: string
  suggestedStarters: LineupAssignment[]
  suggestedBench: Array<{ playerId: string; playerName: string; position: string; value: number | null }>
  startSitQuestions: StartSitQuestion[]
  /** 'high' | 'medium' | 'low' | 'none' based on the value signal backing the ranking. */
  confidence: 'high' | 'medium' | 'low' | 'none'
  projectedStartersPoints: number | null
  missingDataFlags: string[]
}

interface Ranked {
  player: RedraftPlayerFact
  value: number
  source: 'projection' | 'season_avg' | 'none'
}

function rankValue(p: RedraftPlayerFact): Ranked {
  if (p.weekProjection != null) return { player: p, value: p.weekProjection, source: 'projection' }
  if (p.seasonAvgActual != null) return { player: p, value: p.seasonAvgActual, source: 'season_avg' }
  return { player: p, value: 0, source: 'none' }
}

function slotEligible(slot: RedraftLineupSlot, pos: string): boolean {
  if (slot.allowedPositions.length === 0) return true
  return slot.allowedPositions.includes(pos.toUpperCase())
}

/** Expand starter slots (starterCount may be > 1) into individual fillable rows. */
function expandSlots(slots: RedraftLineupSlot[]): RedraftLineupSlot[] {
  const rows: RedraftLineupSlot[] = []
  for (const s of slots) {
    for (let i = 0; i < (s.starterCount ?? 0); i++) {
      rows.push({ ...s, starterCount: 1 })
    }
  }
  // Fill dedicated/strict slots before flex/superflex so flex picks from leftovers.
  return rows.sort((a, b) => {
    const aFlex = a.isSuperflex ? 2 : a.isFlex ? 1 : 0
    const bFlex = b.isSuperflex ? 2 : b.isFlex ? 1 : 0
    return aFlex - bFlex
  })
}

export function buildLineupRecommendation(
  context: RedraftWarRoomContext,
  rosterId: string,
): LineupResult {
  const team = context.teams.find((t) => t.rosterId === rosterId)
  const missingDataFlags = [...context.missingDataFlags]
  if (!team) {
    return {
      rosterId,
      suggestedStarters: [],
      suggestedBench: [],
      startSitQuestions: [],
      confidence: 'none',
      projectedStartersPoints: null,
      missingDataFlags: ['Roster not found in this season.'],
    }
  }

  const ranked = team.players.map(rankValue).sort((a, b) => b.value - a.value)
  const usedPlayerIds = new Set<string>()
  const rows = expandSlots(context.roster.lineupSlots)
  const starters: LineupAssignment[] = []

  const anySignal = ranked.some((r) => r.source !== 'none')

  for (const slot of rows) {
    // Prefer non-injured eligible players; injury only breaks ties downward.
    const candidate = ranked.find(
      (r) =>
        !usedPlayerIds.has(r.player.playerId) &&
        slotEligible(slot, r.player.position),
    )
    if (!candidate) {
      starters.push({
        slotName: slot.slotName,
        playerId: null,
        playerName: null,
        position: null,
        valueUsed: null,
        valueSource: 'none',
        reason: `No eligible player available for ${slot.slotName}.`,
      })
      continue
    }
    usedPlayerIds.add(candidate.player.playerId)
    const injuryNote = candidate.player.injuryStatus && !/^(healthy|active|ok)$/i.test(candidate.player.injuryStatus)
      ? ` (listed ${candidate.player.injuryStatus})`
      : ''
    starters.push({
      slotName: slot.slotName,
      playerId: candidate.player.playerId,
      playerName: candidate.player.playerName,
      position: candidate.player.position,
      valueUsed: candidate.source === 'none' ? null : Math.round(candidate.value * 100) / 100,
      valueSource: candidate.source,
      reason:
        candidate.source === 'none'
          ? `Placed by eligibility only — no projection or stat signal${injuryNote}.`
          : `Top available ${candidate.player.position} by ${candidate.source === 'projection' ? 'projection' : 'season average'} (${candidate.value.toFixed(1)})${injuryNote}.`,
    })
  }

  const bench = ranked
    .filter((r) => !usedPlayerIds.has(r.player.playerId))
    .map((r) => ({
      playerId: r.player.playerId,
      playerName: r.player.playerName,
      position: r.player.position,
      value: r.source === 'none' ? null : Math.round(r.value * 100) / 100,
    }))

  // Start/sit questions: a benched player within 15% of a same-eligible starter's value.
  const startSitQuestions: StartSitQuestion[] = []
  if (anySignal) {
    for (const benchPlayer of ranked.filter((r) => !usedPlayerIds.has(r.player.playerId) && r.source !== 'none')) {
      const rival = starters.find(
        (s) =>
          s.playerId != null &&
          s.valueUsed != null &&
          s.position === benchPlayer.player.position &&
          benchPlayer.value >= s.valueUsed * 0.85 &&
          benchPlayer.value <= s.valueUsed,
      )
      if (rival && rival.playerId && rival.valueUsed != null) {
        startSitQuestions.push({
          position: benchPlayer.player.position,
          starter: { playerId: rival.playerId, playerName: rival.playerName!, value: rival.valueUsed },
          bench: {
            playerId: benchPlayer.player.playerId,
            playerName: benchPlayer.player.playerName,
            value: Math.round(benchPlayer.value * 100) / 100,
          },
          note: `Close call at ${benchPlayer.player.position} — values within 15%.`,
        })
      }
    }
  }

  const projectedStartersPoints =
    context.availability.projections === 'available'
      ? Math.round(
          starters.reduce((sum, s) => sum + (s.valueSource === 'projection' ? (s.valueUsed ?? 0) : 0), 0) * 100,
        ) / 100
      : null

  let confidence: LineupResult['confidence']
  if (!anySignal) confidence = 'none'
  else if (context.availability.projections === 'available') confidence = 'high'
  else if (context.availability.playerStats === 'available') confidence = 'medium'
  else confidence = 'low'

  if (!anySignal) {
    missingDataFlags.push('Start/sit ordering is structural only — no projections or stats to rank starters.')
  }

  return {
    rosterId,
    suggestedStarters: starters,
    suggestedBench: bench,
    startSitQuestions,
    confidence,
    projectedStartersPoints,
    missingDataFlags: [...new Set(missingDataFlags)],
  }
}
