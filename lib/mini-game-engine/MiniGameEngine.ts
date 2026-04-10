/**
 * Mini-Game Engine — Core Resolution Engine
 *
 * Resolves mini-game outcomes from participant inputs using
 * configurable scoring rules, weighted formulas, and tiebreakers.
 * Reusable across all league formats.
 */

import type {
  MiniGameDefinition,
  MiniGameInstance,
  MiniGameResult,
  MiniGameParticipantInput,
  MiniGameScoringRule,
  MiniGameTiebreaker,
  MiniGameState,
} from './types'

/**
 * Resolve a mini-game instance from participant inputs.
 * Returns ranked results with scores and winner(s).
 */
export function resolveMiniGame(
  definition: MiniGameDefinition,
  participants: MiniGameParticipantInput[],
  randomSeed?: string,
): MiniGameResult[] {
  if (participants.length === 0) return []

  // Step 1: Calculate raw scores for each participant
  const scored = participants.map((p) => {
    const breakdown = definition.scoringRules.map((rule) => {
      const raw = extractMetricValue(p.inputs, rule)
      const weighted = raw * rule.weight
      return { metric: rule.metric, value: raw, weight: rule.weight, weighted }
    })

    // Add random modifier if allowed
    let randomBonus = 0
    if (definition.allowsRandomModifier && definition.randomWeight > 0) {
      randomBonus = seededRandom(randomSeed ?? '', p.participantId) * definition.randomWeight
      breakdown.push({ metric: 'random_modifier', value: randomBonus, weight: 1, weighted: randomBonus })
    }

    const totalScore = breakdown.reduce((sum, b) => sum + b.weighted, 0)

    return {
      participantId: p.participantId,
      displayName: p.displayName,
      score: Math.round(totalScore * 100) / 100,
      rank: 0,
      isWinner: false,
      isSafe: false,
      breakdown,
      tiebrokenBy: null as string | null,
    }
  })

  // Step 2: Sort by total score (highest first by default)
  scored.sort((a, b) => b.score - a.score)

  // Step 3: Apply tiebreakers where scores are equal
  for (let i = 0; i < scored.length - 1; i++) {
    if (Math.abs(scored[i].score - scored[i + 1].score) < 0.001) {
      const tieResult = resolveTiebreak(
        scored[i],
        scored[i + 1],
        participants,
        definition.tiebreakers,
        randomSeed,
      )
      if (tieResult < 0) {
        // scored[i] stays ahead — already correct
        scored[i].tiebrokenBy = definition.tiebreakers[0]?.metric ?? 'score'
        scored[i + 1].tiebrokenBy = definition.tiebreakers[0]?.metric ?? 'score'
      } else if (tieResult > 0) {
        // Swap
        const temp = scored[i]
        scored[i] = scored[i + 1]
        scored[i + 1] = temp
        scored[i].tiebrokenBy = definition.tiebreakers[0]?.metric ?? 'tiebreak'
        scored[i + 1].tiebrokenBy = definition.tiebreakers[0]?.metric ?? 'tiebreak'
      }
    }
  }

  // Step 4: Assign ranks and winners
  scored.forEach((s, i) => {
    s.rank = i + 1
  })

  switch (definition.resultType) {
    case 'single_winner':
      if (scored[0]) scored[0].isWinner = true
      break
    case 'multiple_winners': {
      const topScore = scored[0]?.score ?? 0
      scored.forEach((s) => {
        if (Math.abs(s.score - topScore) < 0.001) s.isWinner = true
      })
      break
    }
    case 'ranked':
      if (scored[0]) scored[0].isWinner = true
      break
    case 'pass_fail': {
      const median = scored.length > 0 ? scored[Math.floor(scored.length / 2)]?.score ?? 0 : 0
      scored.forEach((s) => {
        s.isSafe = s.score >= median
        s.isWinner = s.rank === 1
      })
      break
    }
    case 'safe_unsafe': {
      // Bottom performer is unsafe, rest are safe
      scored.forEach((s, i) => {
        s.isSafe = i < scored.length - 1
        s.isWinner = i === 0
      })
      break
    }
  }

  return scored
}

/**
 * Extract a metric value from participant inputs based on a scoring rule.
 */
function extractMetricValue(inputs: Record<string, number | string>, rule: MiniGameScoringRule): number {
  const raw = inputs[rule.metric]
  if (raw == null) return 0
  const numVal = typeof raw === 'number' ? raw : parseFloat(String(raw))
  if (!Number.isFinite(numVal)) return 0

  if (rule.direction === 'closest_to' && rule.targetValue != null) {
    return Math.max(0, 100 - Math.abs(numVal - rule.targetValue))
  }
  if (rule.direction === 'lowest') {
    return -numVal // Invert so lower = higher score
  }
  return numVal
}

/**
 * Resolve a tiebreak between two participants.
 * Returns negative if a wins, positive if b wins, 0 if still tied.
 */
function resolveTiebreak(
  a: MiniGameResult,
  b: MiniGameResult,
  participants: MiniGameParticipantInput[],
  tiebreakers: MiniGameTiebreaker[],
  randomSeed?: string,
): number {
  for (const tb of tiebreakers) {
    const pA = participants.find((p) => p.participantId === a.participantId)
    const pB = participants.find((p) => p.participantId === b.participantId)
    if (!pA || !pB) continue

    if (tb.direction === 'random') {
      const rA = seededRandom(randomSeed ?? '', a.participantId + '_tb')
      const rB = seededRandom(randomSeed ?? '', b.participantId + '_tb')
      if (rA !== rB) return rB - rA
      continue
    }

    const valA = typeof pA.inputs[tb.metric] === 'number' ? (pA.inputs[tb.metric] as number) : 0
    const valB = typeof pB.inputs[tb.metric] === 'number' ? (pB.inputs[tb.metric] as number) : 0

    if (valA === valB) continue

    if (tb.direction === 'highest') return valB - valA
    if (tb.direction === 'lowest') return valA - valB
    return valB - valA
  }
  return 0
}

/**
 * Deterministic seeded random (0-1) for fair randomization.
 */
function seededRandom(seed: string, key: string): number {
  const str = seed + ':' + key
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    hash = ((hash << 5) - hash + ch) | 0
  }
  return Math.abs(hash % 10000) / 10000
}

/**
 * Validate that a mini-game instance can transition to a new state.
 */
export function canTransitionState(current: MiniGameState, target: MiniGameState): boolean {
  const transitions: Record<MiniGameState, MiniGameState[]> = {
    draft: ['scheduled', 'active', 'archived'],
    scheduled: ['pending_data', 'active', 'archived'],
    pending_data: ['active', 'archived'],
    active: ['resolving', 'overridden', 'archived'],
    resolving: ['completed', 'overridden'],
    completed: ['locked', 'overridden', 'archived'],
    locked: ['archived'],
    overridden: ['locked', 'archived'],
    archived: [],
  }
  return transitions[current]?.includes(target) ?? false
}

/**
 * Create a mini-game instance from a definition.
 */
export function createMiniGameInstance(
  definition: MiniGameDefinition,
  leagueId: string,
  week: number,
  participantIds: string[],
  phase?: string,
): Omit<MiniGameInstance, 'id'> {
  return {
    definitionId: definition.id,
    leagueId,
    week,
    phase: phase ?? null,
    state: 'scheduled',
    participantIds,
    startedAt: null,
    resolvedAt: null,
    lockedAt: null,
    results: [],
    winnerId: null,
    winnerIds: [],
    metadata: {},
    overrideReason: null,
    overrideBy: null,
  }
}
