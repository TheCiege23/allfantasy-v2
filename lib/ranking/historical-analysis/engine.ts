/**
 * Phase 2C — Sleeper Historical Analysis Engine
 *
 * Composes per-dimension analyzers into a single report consumed by
 * Chimmy summaries, future ranking weighting, and admin dashboards.
 *
 * Pure compute. Inputs are the same `LegacyLeagueHistoryRow[]` rows
 * already produced by `computeAndSaveRank`, plus optional difficulty
 * effective average from the snapshot engine.
 */

import type { LegacyLeagueHistoryRow } from "@/lib/ranking/computeLegacyRank"
import {
  analyzeActivityQuality,
  analyzeChampionships,
  analyzeCommissioner,
  analyzeConsistency,
  analyzeDynasty,
  analyzeLongevity,
  analyzePlayoffs,
  analyzeScoringComplexity,
  type ActivityQualityAnalysis,
  type ChampionshipsAnalysis,
  type CommissionerAnalysis,
  type ConsistencyAnalysis,
  type DynastyAnalysis,
  type LongevityAnalysis,
  type PlayoffAnalysis,
  type ScoringComplexityAnalysis,
} from "@/lib/ranking/historical-analysis/dimensions"

export type HistoricalAnalysisInput = {
  rows: LegacyLeagueHistoryRow[]
  /** Optional average effective difficulty across the user's leagues. */
  avgLeagueDifficulty?: number | null
  /** Used to keep championship recency weighting deterministic in tests. */
  currentYear?: number
}

export type HistoricalAnalysisReport = {
  championships: ChampionshipsAnalysis
  playoffs: PlayoffAnalysis
  longevity: LongevityAnalysis
  dynasty: DynastyAnalysis
  consistency: ConsistencyAnalysis
  scoringComplexity: ScoringComplexityAnalysis
  commissioner: CommissionerAnalysis
  activity: ActivityQualityAnalysis
  leagueDifficulty: { average: number | null }
  headline: string
}

function buildHeadline(report: Omit<HistoricalAnalysisReport, "headline">): string {
  const champs = report.championships.count
  const seasons = report.longevity.seasons
  const playoffRate = report.playoffs.rate
  const champFragment =
    champs > 0 ? `${champs} championship${champs === 1 ? "" : "s"}` : "no championships yet"
  const playoffFragment =
    playoffRate != null
      ? `${Math.round(playoffRate * 100)}% playoff rate`
      : "no playoff history"
  const seasonFragment = `${seasons} season${seasons === 1 ? "" : "s"} on record`
  return `${seasonFragment}, ${playoffFragment}, ${champFragment}.`
}

export function analyzeSleeperHistory(
  input: HistoricalAnalysisInput
): HistoricalAnalysisReport {
  const rows = input.rows ?? []
  const championships = analyzeChampionships(rows, input.currentYear)
  const playoffs = analyzePlayoffs(rows)
  const longevity = analyzeLongevity(rows)
  const dynasty = analyzeDynasty(rows)
  const consistency = analyzeConsistency(rows)
  const scoringComplexity = analyzeScoringComplexity(rows)
  const commissioner = analyzeCommissioner(rows)
  const activity = analyzeActivityQuality(rows)
  const leagueDifficulty = {
    average:
      input.avgLeagueDifficulty != null && Number.isFinite(input.avgLeagueDifficulty)
        ? Number(input.avgLeagueDifficulty.toFixed(0))
        : null,
  }
  const partial = {
    championships,
    playoffs,
    longevity,
    dynasty,
    consistency,
    scoringComplexity,
    commissioner,
    activity,
    leagueDifficulty,
  }
  return { ...partial, headline: buildHeadline(partial) }
}
