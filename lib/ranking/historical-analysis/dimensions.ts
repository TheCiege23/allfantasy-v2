/**
 * Phase 2C — Historical Analysis Dimensions
 *
 * Each dimension is a pure function over `LegacyLeagueHistoryRow[]` (same
 * shape already produced by `computeAndSaveRank`). Returning small,
 * predictable structures keeps tests stable across future weight tuning.
 */

import type { LegacyLeagueHistoryRow } from "@/lib/ranking/computeLegacyRank"

export type ChampionshipsAnalysis = {
  count: number
  byFormat: Record<string, number>
  /** Sum of (1 / (currentYear - season + 1)) — biases toward recent titles. */
  recencyWeighted: number
}

export type PlayoffAnalysis = {
  /** appearances / seasons; null when no seasons */
  rate: number | null
  /** longest consecutive playoff streak */
  streak: number
}

export type LongevityAnalysis = {
  seasons: number
  formats: number
  sports: number
}

export type DynastyAnalysis = {
  dynastyLeagues: number
  avgFinalStanding: number | null
  championshipsInDynasty: number
}

export type ConsistencyAnalysis = {
  /** Population stdev of per-league win% (0..1). null when <2 leagues. */
  winPctStdev: number | null
  /** Share of leagues finishing top 3 (champion or playoff seed proxy). */
  top3Rate: number | null
}

export type ScoringComplexityAnalysis = {
  /** Average complexity score across leagues (0..1 scale). */
  avgComplexityScore: number
}

export type CommissionerAnalysis = {
  /** Placeholder until LegacyLeague.commissionerId / activity wires in. */
  leaguesAsCommish: number
  leagueLongevityAsCommish: number
}

export type ActivityQualityAnalysis = {
  /** Placeholder (0..1) until transaction-log integration in Batch 3. */
  score: number
}

const CURRENT_YEAR_FALLBACK = new Date().getUTCFullYear()

export function analyzeChampionships(
  rows: LegacyLeagueHistoryRow[],
  currentYear: number = CURRENT_YEAR_FALLBACK
): ChampionshipsAnalysis {
  const byFormat: Record<string, number> = {}
  let count = 0
  let recencyWeighted = 0
  for (const r of rows) {
    if (!r.is_champion) continue
    count += 1
    const fmt = (r.type || "redraft").toLowerCase()
    byFormat[fmt] = (byFormat[fmt] || 0) + 1
    const age = Math.max(0, currentYear - r.season) + 1
    recencyWeighted += 1 / age
  }
  return { count, byFormat, recencyWeighted: Number(recencyWeighted.toFixed(3)) }
}

export function analyzePlayoffs(rows: LegacyLeagueHistoryRow[]): PlayoffAnalysis {
  if (rows.length === 0) return { rate: null, streak: 0 }
  const apps = rows.filter((r) => r.made_playoffs).length
  const rate = rows.length > 0 ? apps / rows.length : null

  // Streak: by season ascending, count longest consecutive run of made_playoffs.
  const sorted = [...rows].sort((a, b) => a.season - b.season)
  let current = 0
  let best = 0
  for (const r of sorted) {
    if (r.made_playoffs) {
      current += 1
      if (current > best) best = current
    } else {
      current = 0
    }
  }
  return { rate: rate == null ? null : Number(rate.toFixed(3)), streak: best }
}

export function analyzeLongevity(rows: LegacyLeagueHistoryRow[]): LongevityAnalysis {
  const seasons = new Set<number>()
  const formats = new Set<string>()
  const sports = new Set<string>()
  for (const r of rows) {
    seasons.add(r.season)
    if (r.type) formats.add(r.type.toLowerCase())
    if (r.sport) sports.add(r.sport.toLowerCase())
  }
  return { seasons: seasons.size, formats: formats.size, sports: sports.size }
}

export function analyzeDynasty(rows: LegacyLeagueHistoryRow[]): DynastyAnalysis {
  const dyn = rows.filter((r) => (r.type || "").toLowerCase().includes("dynasty"))
  if (dyn.length === 0) {
    return { dynastyLeagues: 0, avgFinalStanding: null, championshipsInDynasty: 0 }
  }
  const champs = dyn.filter((r) => r.is_champion).length
  // No direct final-standing in LegacyLeagueHistoryRow; use win-% as proxy:
  const winPcts = dyn.map((r) => {
    const tot = r.wins + r.losses + r.ties
    return tot > 0 ? r.wins / tot : 0
  })
  const avgWinPct = winPcts.reduce((s, v) => s + v, 0) / winPcts.length
  return {
    dynastyLeagues: dyn.length,
    avgFinalStanding: Number((1 - avgWinPct).toFixed(3)), // lower = better; proxy in absence of standing data
    championshipsInDynasty: champs,
  }
}

export function analyzeConsistency(rows: LegacyLeagueHistoryRow[]): ConsistencyAnalysis {
  if (rows.length < 2) return { winPctStdev: null, top3Rate: rows.length === 0 ? null : null }
  const wps = rows.map((r) => {
    const tot = r.wins + r.losses + r.ties
    return tot > 0 ? r.wins / tot : 0
  })
  const mean = wps.reduce((s, v) => s + v, 0) / wps.length
  const variance = wps.reduce((s, v) => s + (v - mean) ** 2, 0) / wps.length
  const stdev = Math.sqrt(variance)
  const top3 = rows.filter((r) => r.is_champion || r.made_playoffs).length
  return {
    winPctStdev: Number(stdev.toFixed(3)),
    top3Rate: Number((top3 / rows.length).toFixed(3)),
  }
}

export function analyzeScoringComplexity(rows: LegacyLeagueHistoryRow[]): ScoringComplexityAnalysis {
  if (rows.length === 0) return { avgComplexityScore: 0 }
  const total = rows.reduce((s, r) => s + scoringComplexityScore(r.scoring), 0)
  return { avgComplexityScore: Number((total / rows.length).toFixed(3)) }
}

function scoringComplexityScore(scoring?: string | null): number {
  const s = (scoring || "").toLowerCase()
  if (!s) return 0
  let score = 0
  if (s.includes("ppr") && !s.includes("half")) score += 0.2
  if (s.includes("half")) score += 0.1
  if (s.includes("superflex") || s.includes("2qb")) score += 0.3
  if (s.includes("te-premium") || s.includes("te premium")) score += 0.15
  if (s.includes("idp")) score += 0.3
  if (s.includes("custom")) score += 0.2
  return Math.min(1, score)
}

export function analyzeCommissioner(_rows: LegacyLeagueHistoryRow[]): CommissionerAnalysis {
  // Placeholder until LegacyLeague carries a commissioner indicator the
  // history row exposes. Returns 0 to keep summaries honest.
  return { leaguesAsCommish: 0, leagueLongevityAsCommish: 0 }
}

export function analyzeActivityQuality(_rows: LegacyLeagueHistoryRow[]): ActivityQualityAnalysis {
  // Placeholder; real signal arrives with transaction-log integration.
  return { score: 0 }
}
