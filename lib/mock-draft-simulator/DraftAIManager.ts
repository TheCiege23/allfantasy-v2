/**
 * DraftAIManager — AI drafting opponents: picks next player using needs, ADP, and meta trends.
 */

import { predictWithMeta } from './MetaDraftPredictor'
import type { DraftPlayer, DraftPickResult } from './types'

const POSITION_TARGETS: Record<string, { starter: number; ideal: number }> = {
  QB: { starter: 1, ideal: 2 },
  RB: { starter: 2, ideal: 5 },
  WR: { starter: 2, ideal: 5 },
  TE: { starter: 1, ideal: 2 },
  K: { starter: 1, ideal: 1 },
  DEF: { starter: 1, ideal: 1 },
}

function getRosterCounts(roster: { position: string }[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of roster) {
    const pos = String(p.position || '').toUpperCase()
    if (POSITION_TARGETS[pos]) counts[pos] = (counts[pos] || 0) + 1
  }
  return counts
}

function getNeedScore(position: string, counts: Record<string, number>, isSuperflex: boolean): number {
  const targets = POSITION_TARGETS[position]
  if (!targets) return 20
  const count = counts[position] || 0
  let need = 0
  if (count < targets.starter) need = 80 + (targets.starter - count) * 15
  else if (count < targets.ideal) need = 40 + (targets.ideal - count) * 10
  else need = 10
  if (position === 'QB' && isSuperflex) need = Math.min(100, need + 15)
  return need
}

export interface DraftAIManagerInput {
  sport: string
  managerName: string
  rosterSoFar: { position: string }[]
  availablePlayers: DraftPlayer[]
  round: number
  overall: number
  slot: number
  numTeams: number
  draftType: 'snake' | 'linear'
  isSuperflex?: boolean
  useMeta?: boolean
}

/**
 * Choose one player for this pick: need-based + ADP value + optional meta adjustment.
 */
export async function makeAIPick(input: DraftAIManagerInput): Promise<DraftPlayer | null> {
  const {
    managerName,
    rosterSoFar,
    availablePlayers,
    round,
    sport,
    isSuperflex = false,
    useMeta = true,
  } = input

  if (availablePlayers.length === 0) return null

  const counts = getRosterCounts(rosterSoFar)
  let scored = availablePlayers.map((p) => {
    const need = getNeedScore(p.position, counts, isSuperflex)
    const adp = p.adp ?? 999
    const value = adp < 999 ? Math.max(0, 150 - adp) : (p.value ?? 50)
    const needScore = (need / 100) * 60
    const valueScore = (value / 150) * 40
    return { player: p, score: needScore + valueScore, need, value }
  })

  if (useMeta) {
    try {
      const meta = await predictWithMeta({ sport, available: availablePlayers, round })
      const metaByKey = new Map(meta.playerScores.map((s) => [`${s.name}|${s.position}`, s]))
      scored = scored.map(({ player, score, need, value }) => {
        const m = metaByKey.get(`${player.name}|${player.position}`)
        const boost = m?.metaBoost ?? 0
        return { player, score: score + boost * 0.1, need, value }
      })
    } catch {
      // ignore meta failure
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]?.player ?? null
  return best
}
