/**
 * DraftAIManager — AI drafting opponents: picks next player using needs, ADP, and meta trends.
 */

import { predictWithMeta } from './MetaDraftPredictor'
import type { DraftPlayer } from './types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

type PositionTargets = Record<string, { starter: number; ideal: number }>

function getPositionTargetsForSport(sport: string): PositionTargets {
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
        DEF: { starter: 4, ideal: 6 },
        MID: { starter: 4, ideal: 6 },
        FWD: { starter: 2, ideal: 4 },
      }
    case 'NCAAF':
    case 'NFL':
    default:
      return {
        QB: { starter: 1, ideal: 2 },
        RB: { starter: 2, ideal: 5 },
        WR: { starter: 2, ideal: 5 },
        TE: { starter: 1, ideal: 2 },
        K: { starter: 1, ideal: 1 },
        DEF: { starter: 1, ideal: 1 },
      }
  }
}

function normalizePositionForSport(position: string, sport: string): string {
  const normalized = String(position || '').toUpperCase().trim()
  const normalizedSport = normalizeToSupportedSport(sport)
  if (!normalized) return ''

  if (['NFL', 'NCAAF'].includes(normalizedSport) && (normalized === 'DST' || normalized === 'D/ST')) {
    return 'DEF'
  }

  if (normalizedSport === 'MLB') {
    if (normalized === 'SP' || normalized === 'RP') return 'P'
    if (normalized === 'LF' || normalized === 'CF' || normalized === 'RF') return 'OF'
  }

  if (normalizedSport === 'SOCCER') {
    if (normalized === 'GK') return 'GKP'
  }

  return normalized
}

function getRosterCounts(roster: { position: string }[], sport: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of roster) {
    const pos = normalizePositionForSport(p.position, sport)
    if (!pos) continue
    counts[pos] = (counts[pos] || 0) + 1
  }
  return counts
}

function getNeedScore(
  position: string,
  counts: Record<string, number>,
  targetsByPosition: PositionTargets,
  isSuperflex: boolean,
  sport: string
): number {
  const normalizedPosition = normalizePositionForSport(position, sport)
  if (!normalizedPosition) return 5

  const targets = targetsByPosition[normalizedPosition]
  if (!targets) {
    // Keep unknown slots draftable (IDP/UTIL/etc), but deprioritize if already filled.
    return counts[normalizedPosition] ? 12 : 28
  }

  const count = counts[normalizedPosition] || 0
  let need = 0
  if (count < targets.starter) need = 80 + (targets.starter - count) * 15
  else if (count < targets.ideal) need = 40 + (targets.ideal - count) * 10
  else need = 10
  if (normalizedPosition === 'QB' && isSuperflex) need = Math.min(100, need + 15)
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
    rosterSoFar,
    availablePlayers,
    round,
    sport,
    isSuperflex = false,
    useMeta = true,
  } = input

  if (availablePlayers.length === 0) return null

  const normalizedSport = normalizeToSupportedSport(sport)
  const positionTargets = getPositionTargetsForSport(normalizedSport)
  const counts = getRosterCounts(rosterSoFar, normalizedSport)
  let scored = availablePlayers.map((p) => {
    const normalizedPosition = normalizePositionForSport(p.position, normalizedSport)
    const need = getNeedScore(normalizedPosition, counts, positionTargets, isSuperflex, normalizedSport)
    const adp = p.adp ?? 999
    const value = adp < 999 ? Math.max(0, 150 - adp) : (p.value ?? 50)
    let needScore = (need / 100) * 60
    const valueScore = (value / 150) * 40

    // Keep low-priority positions later in football drafts unless value is compelling.
    if (['NFL', 'NCAAF'].includes(normalizedSport) && round <= 8 && (normalizedPosition === 'K' || normalizedPosition === 'DEF')) {
      needScore -= 24
    }

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
