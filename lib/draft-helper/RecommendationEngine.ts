/**
 * Deterministic draft recommendation: best available, best fit, reach/value/scarcity/bye.
 * Uses only provided player pool and draft state; no invented players or stats.
 */

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

const POSITION_TARGETS: Record<string, { starter: number; ideal: number }> = {
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
  teamRoster: { position: string }[]
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
  byeNote: string | null
  explanation: string
  caveats: string[]
}

function getAdp(p: RecommendationPlayer, overall: number, aiAdpByKey?: Record<string, number>, key?: string): number {
  if (key && aiAdpByKey && aiAdpByKey[key] != null) return aiAdpByKey[key]
  return p.adp != null ? Number(p.adp) : overall + 20
}

function defaultTargetsForSport(sport: string): Record<string, { starter: number; ideal: number }> {
  switch (sport.toUpperCase()) {
    case 'NBA':
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
    default:
      return POSITION_TARGETS
  }
}

function normalizeSlot(slot: string, sport: string): string {
  const normalized = String(slot || '').toUpperCase().trim()
  if (!normalized) return ''
  if (normalized === 'SUPERFLEX') return 'SUPER_FLEX'
  if (sport.toUpperCase() === 'NFL' && (normalized === 'DST' || normalized === 'D/ST')) return 'DEF'
  if (sport.toUpperCase() === 'MLB' && ['SP', 'RP'].includes(normalized)) return 'P'
  if (sport.toUpperCase() === 'MLB' && ['LF', 'CF', 'RF'].includes(normalized)) return 'OF'
  return normalized
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
      byeNote: null,
      explanation: 'No available players in pool.',
      caveats: ['No players available.'],
    }
  }

  const normalizedSport = sport.toUpperCase()
  const needs = computeNeeds(teamRoster, rosterSlots, isSF, available, normalizedSport)
  const overall = (round - 1) * totalTeams + pick
  const playerKey = (p: RecommendationPlayer) =>
    `${(p.name || '').toLowerCase()}|${(p.position || '').toLowerCase()}|${(p.team || '').toLowerCase()}`

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
      byeNote: null,
      explanation: 'Could not rank available players.',
      caveats,
    }
  }

  let reachWarning: string | null = null
  let valueWarning: string | null = null
  if (best.adp > overall + 2) reachWarning = `${best.player.name} is typically drafted later (ADP ~${Math.round(best.adp)}). This is a reach at pick ${overall}.`
  else if (best.adp < overall - 3) valueWarning = `Strong value: ${best.player.name} usually goes before pick ${overall} (ADP ~${Math.round(best.adp)}).`

  const pos = String(best.player.position || '').toUpperCase()
  const samePosCount = available.filter((a) => String(a.position || '').toUpperCase() === pos).length
  let scarcityInsight: string | null = null
  if (samePosCount <= 3 && (best.needScore ?? 0) > 50) scarcityInsight = `Few ${pos}s left in pool; consider securing one.`

  let byeNote: string | null = null
  if (normalizedSport === 'NFL') {
    const bye = best.player.byeWeek ?? (byeByKey ? byeByKey[playerKey(best.player)] : null)
    if (bye != null) byeNote = `Bye week ${bye}; plan coverage if needed.`
  }

  const reasonParts: string[] = []
  if ((needs[pos] ?? 0) >= 70) reasonParts.push(`fills critical ${pos} need`)
  else if ((needs[pos] ?? 0) >= 40) reasonParts.push(`improves ${pos} depth`)
  if (best.adpEdge > 5) reasonParts.push('good value vs ADP')
  if (normalizedSport === 'NFL' && isSF && pos === 'QB') reasonParts.push('Superflex QB premium')
  const reason = reasonParts.length ? reasonParts.join('; ') : 'Best fit for roster and draft position'

  const alternatives = scored.slice(1, 4).map((item, idx) => ({
    player: item.player,
    reason: idx === 0 ? 'Strong alternative if primary is taken' : 'Fallback option',
    confidence: item.confidence,
  }))

  const explanation = `Recommend ${best.player.name} (${pos}): ${reason}. ${reachWarning ? ' ' + reachWarning : ''} ${valueWarning ? ' ' + valueWarning : ''}`.trim()

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
    byeNote,
    explanation,
    caveats,
  }
}
