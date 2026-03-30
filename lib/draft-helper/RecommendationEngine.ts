/**
 * Deterministic draft recommendation: best available, best fit, reach/value/scarcity/bye.
 * Uses only provided player pool and draft state; no invented players or stats.
 */

import { normalizeToSupportedSport } from '@/lib/sport-scope'

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

const FOOTBALL_POSITION_TARGETS: Record<string, { starter: number; ideal: number }> = {
  QB: { starter: 1, ideal: 2 }, RB: { starter: 2, ideal: 5 }, WR: { starter: 2, ideal: 5 },
  TE: { starter: 1, ideal: 2 }, K: { starter: 1, ideal: 1 }, DEF: { starter: 1, ideal: 1 },
}

const FLEX_SLOT_NAMES = new Set(['FLEX', 'SUPER_FLEX', 'OP', 'UTIL', 'BENCH', 'BN', 'IR', 'G', 'F'])

export interface RecommendationPlayer {
  name: string
  position: string
  team?: string | null
  adp?: number | null
  byeWeek?: number | null
}

export interface RecommendationInput {
  available: RecommendationPlayer[]
  teamRoster: Array<{ position: string; team?: string | null; byeWeek?: number | null }>
  rosterSlots?: string[]
  round: number
  pick: number
  totalTeams: number
  sport: string
  isDynasty?: boolean
  isSF?: boolean
  mode?: 'needs' | 'bpa'
  /** Optional AI-adjusted ADP by player key (e.g. "name|position|team") */
  aiAdpByKey?: Record<string, number>
  /** Optional bye weeks by player key (NFL) */
  byeByKey?: Record<string, number>
}

export interface RecommendationResult {
  recommendation: {
    player: RecommendationPlayer
    reason: string
    confidence: number
    needScore: number
    adpEdge: number
  } | null
  alternatives: Array<{ player: RecommendationPlayer; reason: string; confidence: number }>
  reachWarning: string | null
  valueWarning: string | null
  scarcityInsight: string | null
  stackInsight: string | null
  correlationInsight: string | null
  formatInsight: string | null
  byeNote: string | null
  explanation: string
  evidence: string[]
  caveats: string[]
  uncertainty: string | null
}

function getAdp(p: RecommendationPlayer, overall: number, aiAdpByKey?: Record<string, number>, key?: string): number {
  if (key && aiAdpByKey && aiAdpByKey[key] != null) return aiAdpByKey[key]
  return p.adp != null ? Number(p.adp) : overall + 20
}

function defaultTargetsForSport(sport: string): Record<string, { starter: number; ideal: number }> {
  switch (normalizeToSupportedSport(sport)) {
    case 'NBA':
    case 'NCAAB':
      return {
        PG: { starter: 1, ideal: 2 },
        SG: { starter: 1, ideal: 2 },
        SF: { starter: 1, ideal: 2 },
        PF: { starter: 1, ideal: 2 },
        C: { starter: 1, ideal: 2 },
      }
    case 'MLB':
      return {
        C: { starter: 1, ideal: 1 },
        '1B': { starter: 1, ideal: 2 },
        '2B': { starter: 1, ideal: 2 },
        '3B': { starter: 1, ideal: 2 },
        SS: { starter: 1, ideal: 2 },
        OF: { starter: 3, ideal: 5 },
        P: { starter: 3, ideal: 6 },
      }
    case 'NHL':
      return {
        C: { starter: 2, ideal: 3 },
        LW: { starter: 2, ideal: 3 },
        RW: { starter: 2, ideal: 3 },
        D: { starter: 2, ideal: 4 },
        G: { starter: 1, ideal: 2 },
      }
    case 'SOCCER':
      return {
        GKP: { starter: 1, ideal: 1 },
        DEF: { starter: 3, ideal: 5 },
        MID: { starter: 3, ideal: 5 },
        FWD: { starter: 2, ideal: 4 },
      }
    default:
      return FOOTBALL_POSITION_TARGETS
  }
}

function normalizeSlot(slot: string, sport: string): string {
  const normalized = String(slot || '').toUpperCase().trim()
  const normalizedSport = normalizeToSupportedSport(sport)
  if (!normalized) return ''
  if (normalized === 'SUPERFLEX') return 'SUPER_FLEX'
  if ((normalizedSport === 'NFL' || normalizedSport === 'NCAAF') && (normalized === 'DST' || normalized === 'D/ST')) return 'DEF'
  if (normalizedSport === 'MLB' && ['SP', 'RP'].includes(normalized)) return 'P'
  if (normalizedSport === 'MLB' && ['LF', 'CF', 'RF'].includes(normalized)) return 'OF'
  if (normalizedSport === 'SOCCER' && normalized === 'GK') return 'GKP'
  if (normalizedSport === 'SOCCER' && (normalized === 'ST' || normalized === 'FW')) return 'FWD'
  if (normalizedSport === 'SOCCER' && normalized === 'MF') return 'MID'
  if (normalizedSport === 'SOCCER' && normalized === 'DF') return 'DEF'
  return normalized
}

function resolveFormatInsight(input: {
  sport: string
  isDynasty: boolean
  isSF: boolean
  rosterSlots: string[]
  recommendationPosition: string
}): string | null {
  const normalizedSport = normalizeToSupportedSport(input.sport)
  const recommendationPosition = normalizeSlot(input.recommendationPosition, normalizedSport)
  const normalizedSlots = input.rosterSlots.map((s) => normalizeSlot(s, normalizedSport))
  const notes: string[] = []
  if ((normalizedSport === 'NFL' || normalizedSport === 'NCAAF') && input.isSF && recommendationPosition === 'QB') {
    notes.push('Superflex increases QB urgency at this stage')
  }
  if (normalizedSlots.includes('FLEX') && ['RB', 'WR', 'TE'].includes(recommendationPosition)) {
    notes.push('FLEX lineup structure supports this position')
  }
  if ((normalizedSport === 'NBA' || normalizedSport === 'NCAAB') && normalizedSlots.includes('UTIL')) {
    notes.push('UTIL slot keeps this pick flexible for rotations')
  }
  if (input.isDynasty) {
    notes.push('Dynasty context favors multi-year value over one-week variance')
  }
  return notes.length > 0 ? `${notes.slice(0, 2).join('. ')}.` : null
}

function resolveCorrelationInsights(input: {
  sport: string
  recommendation: RecommendationPlayer
  teamRoster: Array<{ position: string; team?: string | null }>
}): { stackInsight: string | null; correlationInsight: string | null } {
  const normalizedSport = normalizeToSupportedSport(input.sport)
  const recommendedTeam = String(input.recommendation.team || '').toUpperCase()
  if (!recommendedTeam) return { stackInsight: null, correlationInsight: null }

  const sameTeamRoster = input.teamRoster.filter((p) => String(p.team || '').toUpperCase() === recommendedTeam)
  const sameTeamCount = sameTeamRoster.length
  const recommendationPos = normalizeSlot(input.recommendation.position, normalizedSport)

  let stackInsight: string | null = null
  if (normalizedSport === 'NFL' || normalizedSport === 'NCAAF') {
    const hasTeamQb = sameTeamRoster.some((p) => normalizeSlot(p.position, normalizedSport) === 'QB')
    const hasTeamPassCatcher = sameTeamRoster.some((p) => ['WR', 'TE', 'RB'].includes(normalizeSlot(p.position, normalizedSport)))
    if (recommendationPos === 'QB' && hasTeamPassCatcher) {
      stackInsight = `Stack path: ${input.recommendation.name} pairs with your existing ${recommendedTeam} skill position player(s).`
    } else if (['WR', 'TE', 'RB'].includes(recommendationPos) && hasTeamQb) {
      stackInsight = `Stack path: ${input.recommendation.name} correlates with your ${recommendedTeam} QB.`
    }
  }

  let correlationInsight: string | null = null
  if (sameTeamCount >= 2) {
    correlationInsight = `Correlation watch: you already roster ${sameTeamCount} players from ${recommendedTeam}; balance upside with diversification.`
  } else if (sameTeamCount === 1 && ['NFL', 'NCAAF', 'NHL', 'SOCCER'].includes(normalizedSport)) {
    correlationInsight = `${input.recommendation.name} creates mild same-team correlation with your current build.`
  }

  return { stackInsight, correlationInsight }
}

function buildPositionTargets(
  rosterSlots: string[],
  available: RecommendationPlayer[],
  sport: string,
): Record<string, { starter: number; ideal: number }> {
  const defaults = defaultTargetsForSport(sport)
  const targets: Record<string, { starter: number; ideal: number }> = {}

  for (const rawSlot of rosterSlots || []) {
    const slot = normalizeSlot(rawSlot, sport)
    if (!slot || FLEX_SLOT_NAMES.has(slot)) continue
    const existing = targets[slot] || { starter: 0, ideal: 0 }
    existing.starter += 1
    existing.ideal = Math.max(existing.starter + 1, defaults[slot]?.ideal ?? existing.ideal ?? 0)
    targets[slot] = existing
  }

  if (Object.keys(targets).length === 0) {
    for (const [position, config] of Object.entries(defaults)) {
      targets[position] = { ...config }
    }
  }

  if (Object.keys(targets).length === 0) {
    for (const player of available) {
      const position = normalizeSlot(player.position, sport)
      if (!position || FLEX_SLOT_NAMES.has(position) || targets[position]) continue
      targets[position] = { starter: 1, ideal: 2 }
    }
  }

  return targets
}

function computeNeeds(
  roster: { position: string }[],
  rosterSlots: string[],
  isSF: boolean,
  available: RecommendationPlayer[],
  sport: string,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of roster) {
    const pos = normalizeSlot(p.position, sport)
    counts[pos] = (counts[pos] || 0) + 1
  }

  const targetsByPosition = buildPositionTargets(rosterSlots, available, sport)
  const needs: Record<string, number> = {}
  for (const [pos, targets] of Object.entries(targetsByPosition)) {
    const count = counts[pos] || 0
    if (count < targets.starter) needs[pos] = clamp(88 + (targets.starter - count) * 10, 0, 100)
    else if (count < targets.ideal) needs[pos] = clamp(42 + (targets.ideal - count) * 12, 0, 100)
    else needs[pos] = 10
  }

  if (sport.toUpperCase() === 'NFL' && isSF) {
    needs.QB = clamp((needs.QB || 50) + 18, 0, 100)
  }

  for (const s of rosterSlots || []) {
    const slot = normalizeSlot(s, sport)
    if (slot === 'FLEX') {
      for (const pos of ['RB', 'WR', 'TE']) {
        if (needs[pos] != null) needs[pos] = clamp((needs[pos] || 20) + 8, 0, 100)
      }
    }
    if (slot === 'G') {
      for (const pos of ['PG', 'SG']) {
        if (needs[pos] != null) needs[pos] = clamp((needs[pos] || 20) + 8, 0, 100)
      }
    }
    if (slot === 'F') {
      for (const pos of ['SF', 'PF']) {
        if (needs[pos] != null) needs[pos] = clamp((needs[pos] || 20) + 8, 0, 100)
      }
    }
    if ((slot === 'SUPER_FLEX' || slot === 'OP') && needs.QB != null) {
      needs.QB = clamp((needs.QB || 50) + 12, 0, 100)
    }
  }
  return needs
}

export function computeDraftRecommendation(input: RecommendationInput): RecommendationResult {
  const {
    available,
    teamRoster,
    rosterSlots = [],
    round,
    pick,
    totalTeams,
    sport,
    isDynasty = false,
    isSF = false,
    mode = 'needs',
    aiAdpByKey,
    byeByKey,
  } = input
  const caveats: string[] = []
  if (available.length < 10) caveats.push('Player pool is small; recommendation may be limited.')
  if (available.length === 0) {
    return {
      recommendation: null,
      alternatives: [],
      reachWarning: null,
      valueWarning: null,
      scarcityInsight: null,
      stackInsight: null,
      correlationInsight: null,
      formatInsight: null,
      byeNote: null,
      explanation: 'No available players in pool.',
      evidence: [],
      caveats: ['No players available.'],
      uncertainty: 'High uncertainty: no available players in the deterministic pool.',
    }
  }

  const normalizedSport = normalizeToSupportedSport(sport)
  const needs = computeNeeds(teamRoster, rosterSlots, isSF, available, normalizedSport)
  const overall = (round - 1) * totalTeams + pick
  const playerKey = (p: RecommendationPlayer) =>
    `${(p.name || '').toLowerCase()}|${(p.position || '').toLowerCase()}|${(p.team || '').toLowerCase()}`

  const withAdpCount = available.filter((p) => {
    const key = playerKey(p)
    return p.adp != null || (aiAdpByKey != null && aiAdpByKey[key] != null)
  }).length
  if (withAdpCount < Math.max(6, Math.ceil(Math.min(available.length, 30) * 0.4))) {
    caveats.push('Limited ADP coverage in this pool; confidence is reduced.')
  }

  const scored = available.slice(0, 80).map((p) => {
    const pos = normalizeSlot(p.position, normalizedSport)
    const needScore = needs[pos] ?? 20
    const key = playerKey(p)
    const adp = getAdp(p, overall, aiAdpByKey, key)
    const adpEdge = clamp((overall - adp) * 1.4, -20, 25)
    let formatBoost = 0
    if (normalizedSport === 'NFL' && isSF && pos === 'QB') formatBoost += 14
    if (normalizedSport === 'NFL' && pos === 'TE' && (rosterSlots.includes('TE') || rosterSlots.some((s) => s?.includes('TE')))) formatBoost += 4
    const modeAdjustment = mode === 'bpa' ? 0 : needScore * 0.55
    const totalScore = modeAdjustment + adpEdge * 0.9 + formatBoost
    const confidence = clamp(Math.round(55 + totalScore * 0.6), 40, 92)
    return {
      player: p,
      totalScore,
      needScore,
      adpEdge,
      adp,
      confidence,
    }
  })

  scored.sort((a, b) => b.totalScore - a.totalScore)
  const best = scored[0]
  if (!best) {
    return {
      recommendation: null,
      alternatives: [],
      reachWarning: null,
      valueWarning: null,
      scarcityInsight: null,
      stackInsight: null,
      correlationInsight: null,
      formatInsight: null,
      byeNote: null,
      explanation: 'Could not rank available players.',
      evidence: [],
      caveats,
      uncertainty: 'High uncertainty: deterministic ranking failed for this board state.',
    }
  }

  let reachWarning: string | null = null
  let valueWarning: string | null = null
  if (best.adp > overall + 4) reachWarning = `${best.player.name} is typically drafted later (ADP ~${Math.round(best.adp)}). This is a reach at pick ${overall}.`
  else if (best.adp < overall - 4) valueWarning = `Strong value: ${best.player.name} usually goes before pick ${overall} (ADP ~${Math.round(best.adp)}).`

  const pos = String(best.player.position || '').toUpperCase()
  const samePosCount = available.filter((a) => String(a.position || '').toUpperCase() === pos).length
  let scarcityInsight: string | null = null
  const scarcityThreshold = Math.max(3, Math.ceil(totalTeams * 0.35))
  if (samePosCount <= scarcityThreshold && (best.needScore ?? 0) > 45) {
    scarcityInsight = `Positional scarcity: only ${samePosCount} ${pos} options remain in your visible pool.`
  }

  const { stackInsight, correlationInsight } = resolveCorrelationInsights({
    sport: normalizedSport,
    recommendation: best.player,
    teamRoster,
  })
  const formatInsight = resolveFormatInsight({
    sport: normalizedSport,
    isDynasty,
    isSF,
    rosterSlots,
    recommendationPosition: pos,
  })

  let byeNote: string | null = null
  if (normalizedSport === 'NFL' || normalizedSport === 'NCAAF') {
    const bye = best.player.byeWeek ?? (byeByKey ? byeByKey[playerKey(best.player)] : null)
    if (bye != null) {
      const sameByeCount = teamRoster.filter((p) => p.byeWeek != null && Number(p.byeWeek) === Number(bye)).length
      byeNote = sameByeCount >= 2
        ? `Bye week ${bye}; you already have ${sameByeCount} players on that bye, so add coverage depth.`
        : `Bye week ${bye}; plan coverage if needed.`
    }
  }

  const reasonParts: string[] = []
  if ((needs[pos] ?? 0) >= 70) reasonParts.push(`fills critical ${pos} need`)
  else if ((needs[pos] ?? 0) >= 40) reasonParts.push(`improves ${pos} depth`)
  if (best.adpEdge > 5) reasonParts.push('good value vs ADP')
  if ((normalizedSport === 'NFL' || normalizedSport === 'NCAAF') && isSF && pos === 'QB') reasonParts.push('Superflex QB premium')
  const reason = reasonParts.length ? reasonParts.join('; ') : 'Best fit for roster and draft position'

  const alternatives = scored.slice(1, 4).map((item, idx) => ({
    player: item.player,
    reason: idx === 0 ? 'Strong alternative if primary is taken' : 'Fallback option',
    confidence: item.confidence,
  }))

  const explanation = `Recommend ${best.player.name} (${pos}): ${reason}.${formatInsight ? ` ${formatInsight}` : ''}${reachWarning ? ` ${reachWarning}` : ''}${valueWarning ? ` ${valueWarning}` : ''}`.trim()
  const adpDelta = Number((overall - best.adp).toFixed(1))
  const evidence = [
    `Context: Round ${round}, Pick ${pick} (overall ${overall}).`,
    `Need score (${pos}): ${Math.round(best.needScore)}/100.`,
    `Market edge: ${adpDelta >= 0 ? '+' : ''}${adpDelta} picks vs ADP.`,
    `Position supply in pool: ${samePosCount} ${pos} candidates.`,
  ]
  if (stackInsight) evidence.push(`Stack signal: ${stackInsight}`)
  if (formatInsight) evidence.push(`Format signal: ${formatInsight}`)
  const uncertainty =
    caveats.length > 0
      ? `Uncertainty: ${caveats[0]}`
      : withAdpCount < 12
        ? 'Uncertainty: moderate due to limited market samples.'
        : null

  return {
    recommendation: {
      player: best.player,
      reason,
      confidence: best.confidence,
      needScore: best.needScore,
      adpEdge: best.adpEdge,
    },
    alternatives,
    reachWarning,
    valueWarning,
    scarcityInsight,
    stackInsight,
    correlationInsight,
    formatInsight,
    byeNote,
    explanation,
    evidence,
    caveats,
    uncertainty,
  }
}
