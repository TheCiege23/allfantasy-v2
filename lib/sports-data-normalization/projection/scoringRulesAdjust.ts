import type { SupportedSport } from '@/lib/sport-scope'
import type { NormalizedScoringRules } from '@/lib/league-context-engine/types'

function posGroup(position: string | null | undefined): 'qb' | 'rb' | 'wr' | 'te' | 'k' | 'dst' | 'flexish' | 'other' {
  const p = (position ?? '').toUpperCase()
  if (p === 'QB') return 'qb'
  if (p === 'RB') return 'rb'
  if (p === 'WR') return 'wr'
  if (p === 'TE') return 'te'
  if (p === 'K') return 'k'
  if (p.includes('DEF') || p === 'DST') return 'dst'
  if (p === 'FLEX' || p === 'SUPER_FLEX' || p === 'SFLX') return 'flexish'
  return 'other'
}

/**
 * Deterministic adjustment from a provider baseline (here: DraftKings-style season FPPG for NFL when that is the basis)
 * to an approximate league scoring expectation using reception format + TE premium hints.
 * This does not invent stats — it uses receptions/game when available to shift PPR deltas; otherwise returns null with a note.
 */
export function adjustProjectionForLeagueScoring(args: {
  sport: SupportedSport
  position: string | null
  basePoints: number
  basis: 'draftkings_fppg' | 'provider_total' | 'unknown'
  rules: NormalizedScoringRules | null | undefined
  receptionsPerGame: number | null | undefined
}): { value: number | null; notes: string[] } {
  const notes: string[] = []
  const rules = args.rules
  if (!rules || args.basis === 'unknown') {
    notes.push('No league scoring rules or unknown projection basis — skipping scoring-rule adjustment.')
    return { value: null, notes }
  }

  if (args.sport !== 'NFL') {
    notes.push('Scoring-rule numeric adjustment is implemented for NFL PPR/TE shifts only; other sports: pass-through null.')
    return { value: null, notes }
  }

  const group = posGroup(args.position)
  if (group === 'dst' || group === 'k' || group === 'qb') {
    notes.push('Position uses minimal reception-based shift; baseline treated as unadjusted without stat breakdown.')
    return { value: null, notes }
  }

  if (args.basis !== 'draftkings_fppg') {
    notes.push('Scoring-rule adjustment for NFL expects DraftKings-style FPPG as baseline when applying PPR deltas.')
    return { value: null, notes }
  }

  const rpg = args.receptionsPerGame
  if (rpg == null || !Number.isFinite(rpg)) {
    notes.push('Receptions per game unavailable — cannot apply PPR delta from DraftKings-style FPPG.')
    return { value: null, notes }
  }

  const fmt = rules.labels.receptionFormat
  let targetPpr = 1.0
  if (fmt === 'standard') targetPpr = 0
  else if (fmt === 'half_ppr') targetPpr = 0.5
  else if (fmt === 'ppr' || fmt === 'custom') targetPpr = 1.0
  else {
    notes.push('Reception format unknown — skipping PPR delta.')
    return { value: null, notes }
  }

  // DraftKings NFL classic is full PPR for RB/WR/TE — treat baseline as 1.0 PPR equivalent.
  const dkPpr = 1.0
  const deltaPpr = targetPpr - dkPpr
  let adjusted = args.basePoints + deltaPpr * rpg

  const teExtra = rules.labels.tePremiumExtra
  if (teExtra != null && teExtra > 0 && group === 'te') {
    adjusted += teExtra * rpg
    notes.push(`Applied TE premium hint (+${teExtra} per reception × ${rpg.toFixed(2)} rec/g).`)
  }

  notes.push(`Applied PPR format shift (${fmt}): Δ=${deltaPpr} × ${rpg.toFixed(2)} rec/g vs DraftKings-style baseline.`)

  if (!Number.isFinite(adjusted)) return { value: null, notes: [...notes, 'Adjusted value non-finite.'] }
  return { value: round3(adjusted), notes }
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}
