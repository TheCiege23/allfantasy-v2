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

function computeNeeds(roster: { position: string }[], rosterSlots: string[], isSF: boolean): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of roster) {
    const pos = String(p.position || '').toUpperCase()
    counts[pos] = (counts[pos] || 0) + 1
  }
  const needs: Record<string, number> = {}
  for (const [pos, targets] of Object.entries(POSITION_TARGETS)) {
    const count = counts[pos] || 0
    if (count < targets.starter) needs[pos] = clamp(88 + (targets.starter - count) * 10, 0, 100)
    else if (count < targets.ideal) needs[pos] = clamp(42 + (targets.ideal - count) * 12, 0, 100)
    else needs[pos] = 10
  }
  if (isSF) needs.QB = clamp((needs.QB || 50) + 18, 0, 100)
  for (const s of rosterSlots || []) {
    if (s === 'FLEX') {
      needs.RB = clamp((needs.RB || 20) + 8, 0, 100)
      needs.WR = clamp((needs.WR || 20) + 8, 0, 100)
      needs.TE = clamp((needs.TE || 20) + 4, 0, 100)
    }
    if (s === 'SUPER_FLEX' || s === 'OP') needs.QB = clamp((needs.QB || 50) + 12, 0, 100)
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

  const needs = computeNeeds(teamRoster, rosterSlots, isSF)
  const overall = (round - 1) * totalTeams + pick
  const playerKey = (p: RecommendationPlayer) =>
    `${(p.name || '').toLowerCase()}|${(p.position || '').toLowerCase()}|${(p.team || '').toLowerCase()}`

  const scored = available.slice(0, 80).map((p) => {
    const pos = String(p.position || '').toUpperCase()
    const needScore = needs[pos] ?? 20
    const key = playerKey(p)
    const adp = getAdp(p, overall, aiAdpByKey, key)
    const adpEdge = clamp((overall - adp) * 1.4, -20, 25)
    let formatBoost = 0
    if (isSF && pos === 'QB') formatBoost += 14
    if (pos === 'TE' && (rosterSlots.includes('TE') || rosterSlots.some((s) => s?.includes('TE')))) formatBoost += 4
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
  if (sport.toUpperCase() === 'NFL') {
    const bye = best.player.byeWeek ?? (byeByKey ? byeByKey[playerKey(best.player)] : null)
    if (bye != null) byeNote = `Bye week ${bye}; plan coverage if needed.`
  }

  const reasonParts: string[] = []
  if ((needs[pos] ?? 0) >= 70) reasonParts.push(`fills critical ${pos} need`)
  else if ((needs[pos] ?? 0) >= 40) reasonParts.push(`improves ${pos} depth`)
  if (best.adpEdge > 5) reasonParts.push('good value vs ADP')
  if (isSF && pos === 'QB') reasonParts.push('Superflex QB premium')
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
