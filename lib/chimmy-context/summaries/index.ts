/**
 * Phase 2C — Intelligence Summaries
 *
 * Pure formatters that turn typed slices / engine outputs into compact,
 * Chimmy-ready narrative blocks. Independent of section ordering or
 * token-budget logic — composition lives in `lib/chimmy-context/prompt`.
 *
 * Every function:
 *   - Accepts null inputs and returns "" so callers can compose freely.
 *   - Avoids fabrication: only emits fields present in the source data.
 *   - Never throws.
 */

import type {
  ImportedHistorySlice,
  LeagueDifficultyContextSlice,
  MatchupContextSlice,
  RankingContextSlice,
  RosterContextSlice,
  StandingsContextSlice,
} from "@/lib/chimmy-context/types"
import type { HistoricalAnalysisReport } from "@/lib/ranking/historical-analysis"

function line(label: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number" && !Number.isFinite(value)) return ""
  const str = typeof value === "string" ? value.trim() : String(value)
  if (!str) return ""
  return `- ${label}: ${str}`
}

function nonEmpty(lines: string[]): string {
  return lines.filter((l) => l && l.length > 0).join("\n")
}

// ─── Matchup ──────────────────────────────────────────────────────────────────

export function summarizeMatchup(slice: MatchupContextSlice | null): string {
  if (!slice) return ""
  const yp = slice.yourProjectedPoints
  const op = slice.opponentProjectedPoints
  const margin = yp != null && op != null ? Number((yp - op).toFixed(2)) : null
  const ya = slice.yourActualPoints ?? null
  const oa = slice.opponentActualPoints ?? null
  const actualMargin =
    ya != null && oa != null ? Number((ya - oa).toFixed(2)) : null
  const opponentLabel =
    slice.opponentTeamName ?? slice.opponentTeamId ?? null
  const playoffContext = (() => {
    if (slice.isPlayoffWeek) return "playoff week"
    if (
      slice.weeksUntilPlayoffs != null &&
      slice.weeksUntilPlayoffs >= 0 &&
      slice.playoffStartWeek != null
    ) {
      return `${slice.weeksUntilPlayoffs} week(s) until playoffs (start W${slice.playoffStartWeek})`
    }
    return null
  })()
  return nonEmpty([
    "Matchup analysis:",
    line("Season", slice.season ?? null),
    line("Week", slice.week ?? null),
    line("Status", slice.status),
    line("Opponent", opponentLabel),
    line("Your actual", ya != null ? ya.toFixed(2) : null),
    line("Opponent actual", oa != null ? oa.toFixed(2) : null),
    line("Actual margin", actualMargin),
    line("Your projection", yp != null ? yp.toFixed(2) : null),
    line("Opponent projection", op != null ? op.toFixed(2) : null),
    line("Projected margin", margin),
    line("Playoff context", playoffContext),
  ])
}

// ─── Roster ───────────────────────────────────────────────────────────────────

function positionalCounts(players: RosterContextSlice["starters"]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of players) {
    const pos = (p.position || "UNK").toUpperCase()
    counts[pos] = (counts[pos] || 0) + 1
  }
  return counts
}

export function summarizeRoster(slice: RosterContextSlice | null): string {
  if (!slice) return ""
  const startersByPos = positionalCounts(slice.starters)
  const benchByPos = positionalCounts(slice.bench)
  const fmt = (m: Record<string, number>) =>
    Object.keys(m)
      .sort()
      .map((k) => `${k}:${m[k]}`)
      .join(" ")
  return nonEmpty([
    "Roster analysis:",
    line("Starter count", slice.starters.length),
    line("Bench count", slice.bench.length),
    line("Starter positions", fmt(startersByPos) || null),
    line("Bench positions", fmt(benchByPos) || null),
  ])
}

// ─── Standings ────────────────────────────────────────────────────────────────

export function summarizeStandings(slice: StandingsContextSlice | null): string {
  if (!slice || slice.rows.length === 0) return ""
  const sorted = [...slice.rows].sort((a, b) => {
    const ar = a.rank ?? Number.POSITIVE_INFINITY
    const br = b.rank ?? Number.POSITIVE_INFINITY
    return ar - br
  })
  const top = sorted.slice(0, 5).map((r) => {
    const rec = `${r.wins ?? 0}-${r.losses ?? 0}${(r.ties ?? 0) > 0 ? `-${r.ties}` : ""}`
    const name = r.teamName || r.teamId
    return `${r.rank ?? "?"}. ${name} (${rec})`
  })
  return nonEmpty(["Standings (top 5):", ...top.map((s) => `- ${s}`)])
}

// ─── Imported legacy ──────────────────────────────────────────────────────────

export function summarizeImportedLegacy(slice: ImportedHistorySlice | null): string {
  if (!slice || slice.totalLeagues === 0) return ""
  const recent = (slice.recentLeagues || []).slice(0, 3).map((l) => {
    const rec = l.record ? ` ${l.record}` : ""
    const champ = l.champion ? " 🏆" : ""
    return `- ${l.name} (${l.season})${rec}${champ}`
  })
  return nonEmpty([
    "Imported legacy summary:",
    line("Source", slice.source),
    line("Total leagues", slice.totalLeagues),
    line("Total seasons", slice.totalSeasons),
    line("Career record", slice.careerRecord),
    line("Win %", slice.winPercentage),
    line("Championships", slice.championships),
    line("Archetype", slice.archetype),
    recent.length > 0 ? "Recent leagues:" : "",
    ...recent,
  ])
}

export function summarizeHistoricalAnalysis(
  report: HistoricalAnalysisReport | null
): string {
  if (!report) return ""
  return nonEmpty([
    "Historical analysis:",
    line("Headline", report.headline),
    line("Championships", report.championships.count),
    line("Recency-weighted titles", report.championships.recencyWeighted),
    line("Playoff rate", report.playoffs.rate),
    line("Longest playoff streak", report.playoffs.streak),
    line("Seasons / formats / sports", `${report.longevity.seasons} / ${report.longevity.formats} / ${report.longevity.sports}`),
    line("Dynasty leagues", report.dynasty.dynastyLeagues),
    line("Dynasty championships", report.dynasty.championshipsInDynasty),
    line("Win % stdev", report.consistency.winPctStdev),
    line("Top-3 finish rate", report.consistency.top3Rate),
    line("Scoring complexity avg", report.scoringComplexity.avgComplexityScore),
    line("Avg league difficulty", report.leagueDifficulty.average),
  ])
}

// ─── League difficulty ────────────────────────────────────────────────────────

export function summarizeLeagueDifficulty(
  slice: LeagueDifficultyContextSlice | null
): string {
  const r = slice?.rating
  if (!r) return ""
  return nonEmpty([
    "League difficulty:",
    line("Base", r.base),
    line("Effective", r.effective),
    line("League type ×", r.modifiers.leagueTypeMultiplier),
    line("Scoring ×", r.modifiers.scoringComplexityModifier),
    line("Opponent ×", r.modifiers.opponentStrengthModifier),
    line("Activity ×", r.modifiers.activityModifier),
  ])
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

export function summarizeRanking(slice: RankingContextSlice | null): string {
  const s = slice?.snapshot
  if (!s) return ""
  const lines: string[] = ["AF Ranking snapshot:", line("Overall", s.rating.overall)]
  for (const sport of s.rating.sports) {
    lines.push(line(`${sport.sport} rating`, sport.rating))
  }
  if (s.sources.length > 0) lines.push(line("Sources", s.sources.join(", ")))
  return nonEmpty(lines)
}
