/**
 * Deterministic post-draft scoring: value vs ADP, positional balance, bench depth.
 * value_score = ADP - actual_pick (positive = value, negative = reach).
 */

import type { SlotOrderEntry, DraftPickSnapshot } from '@/lib/live-draft-engine/types'
import { getAdpMapForLeague, getAdpForPick } from './adpResolver'
import { scoreToLetterGrade } from './gradeMapper'
import type { PickScoreEntry, ManagerRankingEntry, DraftResultsPayload } from './types'

export interface ScoringInput {
  leagueId: string
  leagueName: string | null
  sport: string
  draftType: string
  season: string
  status: string
  rounds: number
  teamCount: number
  slotOrder: SlotOrderEntry[]
  picks: DraftPickSnapshot[]
  isDynasty: boolean
  formatKey?: string
}

/**
 * Score each pick: valueScore = adp - actual_pick.
 * When ADP is missing, use actual_pick as neutral (valueScore = 0).
 */
function scorePicks(
  picks: DraftPickSnapshot[],
  adpMap: Map<string, number>
): PickScoreEntry[] {
  return picks.map((p) => {
    const adp = getAdpForPick(adpMap, p.playerName, p.position, p.team ?? null, p.overall)
    const valueScore = adp - p.overall
    return {
      id: p.id,
      overall: p.overall,
      round: p.round,
      slot: p.slot,
      rosterId: p.rosterId,
      displayName: p.displayName ?? null,
      playerName: p.playerName,
      position: p.position,
      team: p.team ?? null,
      adp,
      valueScore,
    }
  })
}

/**
 * Positional score: reward having required positions filled without huge overreach.
 * Simple: count positions, penalize duplicate-heavy builds. 0–25 scale.
 */
function positionalScore(picks: PickScoreEntry[], rosterId: string): number {
  const teamPicks = picks.filter((p) => p.rosterId === rosterId)
  const byPos: Record<string, number> = {}
  for (const p of teamPicks) {
    const pos = p.position || 'OTHER'
    byPos[pos] = (byPos[pos] ?? 0) + 1
  }
  const posCount = Object.keys(byPos).length
  const total = teamPicks.length
  if (total === 0) return 0
  const spread = posCount / Math.max(1, total)
  const score = Math.min(25, spread * 20 + 5)
  return Math.round(score * 10) / 10
}

/**
 * Bench depth: value of picks in later rounds (e.g. round > 10). 0–25 scale.
 */
function benchScore(picks: PickScoreEntry[], rosterId: string, rounds: number): number {
  const teamPicks = picks.filter((p) => p.rosterId === rosterId)
  const benchRounds = Math.max(0, rounds - 10)
  if (benchRounds <= 0) return 12.5
  const benchPicks = teamPicks.filter((p) => p.round > 10)
  const totalValue = benchPicks.reduce((s, p) => s + p.valueScore, 0)
  const avg = benchPicks.length ? totalValue / benchPicks.length : 0
  const normalized = Math.max(-2, Math.min(2, avg / 15))
  const score = 12.5 + normalized * 6.25
  return Math.round(Math.max(0, Math.min(25, score)) * 10) / 10
}

/**
 * Roster balance: low variance in valueScore across picks (consistent value). 0–25 scale.
 */
function balanceScore(picks: PickScoreEntry[], rosterId: string): number {
  const teamPicks = picks.filter((p) => p.rosterId === rosterId)
  if (teamPicks.length < 2) return 12.5
  const mean = teamPicks.reduce((s, p) => s + p.valueScore, 0) / teamPicks.length
  const variance =
    teamPicks.reduce((s, p) => s + (p.valueScore - mean) ** 2, 0) / teamPicks.length
  const std = Math.sqrt(variance)
  const penalty = Math.min(25, std * 2)
  const score = Math.max(0, 25 - penalty)
  return Math.round(score * 10) / 10
}

/**
 * Composite team score: totalValueScore (normalized) + positional + bench + balance.
 * totalValueScore normalized to ~0–50 so overall is 0–100 scale.
 */
function compositeScore(
  picks: PickScoreEntry[],
  rosterId: string,
  rounds: number,
  totalPicksInDraft: number
): number {
  const teamPicks = picks.filter((p) => p.rosterId === rosterId)
  const totalValueScore = teamPicks.reduce((s, p) => s + p.valueScore, 0)
  const maxPossibleValue = totalPicksInDraft * 0.5
  const normalizedValue = Math.max(-25, Math.min(50, (totalValueScore / Math.max(1, maxPossibleValue)) * 25 + 25))
  const pos = positionalScore(picks, rosterId)
  const bench = benchScore(picks, rosterId, rounds)
  const balance = balanceScore(picks, rosterId)
  return Math.round((normalizedValue + pos + bench + balance) * 10) / 10
}

export async function computeDraftResults(input: ScoringInput): Promise<DraftResultsPayload> {
  const { leagueId, leagueName, sport, draftType, season, status, rounds, teamCount, slotOrder, picks, isDynasty, formatKey } = input
  const adpMap = await getAdpMapForLeague(sport, isDynasty, formatKey)
  const scoredPicks = scorePicks(picks, adpMap)
  const totalPicks = rounds * teamCount

  const pickLog = scoredPicks.map((p) => ({
    id: p.id,
    overall: p.overall,
    round: p.round,
    slot: p.slot,
    rosterId: p.rosterId,
    displayName: p.displayName,
    playerName: p.playerName,
    position: p.position,
    team: p.team,
    valueScore: p.valueScore,
    adp: p.adp,
  }))

  const bestPickOfDraft =
    scoredPicks.length > 0
      ? scoredPicks.reduce((a, b) => (a.valueScore >= b.valueScore ? a : b))
      : null
  const worstReachOfDraft =
    scoredPicks.length > 0
      ? scoredPicks.reduce((a, b) => (a.valueScore <= b.valueScore ? a : b))
      : null
  const stealOfDraft = bestPickOfDraft

  const managerRankings: ManagerRankingEntry[] = slotOrder.map((slot) => {
    const rosterId = slot.rosterId
    const teamPicks = scoredPicks.filter((p) => p.rosterId === rosterId)
    const totalValueScore = teamPicks.reduce((s, p) => s + p.valueScore, 0)
    const posScore = positionalScore(scoredPicks, rosterId)
    const benchSc = benchScore(scoredPicks, rosterId, rounds)
    const balanceSc = balanceScore(scoredPicks, rosterId)
    const score = compositeScore(scoredPicks, rosterId, rounds, totalPicks)
    const grade = scoreToLetterGrade(score)
    const bestPick =
      teamPicks.length > 0 ? teamPicks.reduce((a, b) => (a.valueScore >= b.valueScore ? a : b)) : null
    const worstReach =
      teamPicks.length > 0 ? teamPicks.reduce((a, b) => (a.valueScore <= b.valueScore ? a : b)) : null
    return {
      rank: 0,
      rosterId,
      displayName: slot.displayName ?? `Team ${slot.slot}`,
      slot: slot.slot,
      grade,
      score,
      totalValueScore,
      positionalScore: posScore,
      benchScore: benchSc,
      balanceScore: balanceSc,
      pickCount: teamPicks.length,
      picks: teamPicks,
      bestPick,
      worstReach,
    }
  })

  managerRankings.sort((a, b) => b.score - a.score)
  managerRankings.forEach((m, i) => {
    m.rank = i + 1
  })

  return {
    leagueId,
    leagueName,
    sport,
    draftType,
    season,
    status,
    rounds,
    teamCount,
    totalPicks,
    pickLog,
    managerRankings,
    bestPickOfDraft,
    worstReachOfDraft,
    stealOfDraft,
  }
}
