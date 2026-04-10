/**
 * Real-Time Draft Value Assessment Engine
 *
 * Highlights overvalued vs undervalued players during a live draft.
 * Calculates value relative to ADP, positional scarcity, and draft context.
 *
 * From PDF: "Essential AI Feature #2 — Real-Time Value Assessment"
 */

export type PlayerValueAssessment = {
  playerId: string
  playerName: string
  position: string
  team: string | null
  adp: number
  currentPick: number
  valueDelta: number // positive = value (falling below ADP), negative = reach
  valueLabel: 'steal' | 'great_value' | 'fair' | 'slight_reach' | 'reach' | 'major_reach'
  positionalScarcityScore: number // 0-100, higher = more scarce
  tierDropAlert: boolean // true if next tier is far away
  contextNote: string
}

/**
 * Assess value of all available players at a given pick.
 */
export function assessDraftValues(
  availablePlayers: Array<{
    playerId: string
    playerName: string
    position: string
    team: string | null
    adp: number
    projectedPoints: number
    tier: number
  }>,
  currentPick: number,
  draftedByPosition: Record<string, number>,
  totalRosterSlots: Record<string, number>,
): PlayerValueAssessment[] {
  // Calculate positional scarcity
  const positionScarcity = calculatePositionalScarcity(
    availablePlayers,
    draftedByPosition,
    totalRosterSlots,
  )

  return availablePlayers.map((player) => {
    const valueDelta = player.adp - currentPick
    const scarcity = positionScarcity[player.position] ?? 50

    // Determine value label
    let valueLabel: PlayerValueAssessment['valueLabel']
    if (valueDelta > 20) valueLabel = 'steal'
    else if (valueDelta > 10) valueLabel = 'great_value'
    else if (valueDelta >= -5) valueLabel = 'fair'
    else if (valueDelta >= -12) valueLabel = 'slight_reach'
    else if (valueDelta >= -25) valueLabel = 'reach'
    else valueLabel = 'major_reach'

    // Check for tier drops
    const samePosition = availablePlayers.filter((p) => p.position === player.position)
    const sameTier = samePosition.filter((p) => p.tier === player.tier)
    const nextTier = samePosition.filter((p) => p.tier === player.tier + 1)
    const tierDropAlert = sameTier.length <= 2 && nextTier.length > 0

    // Context note
    let contextNote = ''
    if (scarcity > 80) contextNote = `${player.position} is scarce — premium value`
    else if (valueDelta > 15) contextNote = `Falling ${valueDelta.toFixed(0)} picks below ADP`
    else if (valueDelta < -15) contextNote = `Significant reach — ${Math.abs(valueDelta).toFixed(0)} picks above ADP`
    else if (tierDropAlert) contextNote = `Last in tier — next tier is a drop-off`

    return {
      playerId: player.playerId,
      playerName: player.playerName,
      position: player.position,
      team: player.team,
      adp: player.adp,
      currentPick,
      valueDelta,
      valueLabel,
      positionalScarcityScore: scarcity,
      tierDropAlert,
      contextNote,
    }
  })
}

/**
 * Calculate positional scarcity for remaining available players.
 * Returns 0-100 score per position (higher = more scarce).
 */
function calculatePositionalScarcity(
  available: Array<{ position: string; adp: number }>,
  draftedByPosition: Record<string, number>,
  totalSlots: Record<string, number>,
): Record<string, number> {
  const scarcity: Record<string, number> = {}
  const positions = [...new Set(available.map((p) => p.position))]

  for (const pos of positions) {
    const remainingAtPos = available.filter((p) => p.position === pos).length
    const slotsNeeded = (totalSlots[pos] ?? 2) - (draftedByPosition[pos] ?? 0)
    const totalPool = available.length

    if (totalPool === 0 || remainingAtPos === 0) {
      scarcity[pos] = 100
      continue
    }

    // Scarcity = how few good options remain relative to need
    const ratio = slotsNeeded > 0 ? remainingAtPos / slotsNeeded : remainingAtPos / 2
    const base = ratio < 1 ? 95 : ratio < 2 ? 80 : ratio < 4 ? 60 : ratio < 8 ? 40 : 20

    // Boost scarcity if top available at this position have high ADP (fallen far)
    const topAvail = available.filter((p) => p.position === pos).sort((a, b) => a.adp - b.adp)
    const topAdpDelta = topAvail[0] ? Math.max(0, topAvail[0].adp - (draftedByPosition[pos] ?? 0) * 12) : 0
    const adpBoost = Math.min(15, topAdpDelta / 3)

    scarcity[pos] = Math.min(100, Math.round(base + adpBoost))
  }

  return scarcity
}

/**
 * Get the top N best values available at a given pick.
 */
export function getTopValues(
  assessments: PlayerValueAssessment[],
  limit: number = 10,
): PlayerValueAssessment[] {
  return [...assessments]
    .sort((a, b) => b.valueDelta - a.valueDelta)
    .slice(0, limit)
}

/**
 * Get players with tier drop alerts (last in their tier).
 */
export function getTierDropAlerts(
  assessments: PlayerValueAssessment[],
): PlayerValueAssessment[] {
  return assessments.filter((a) => a.tierDropAlert)
}
