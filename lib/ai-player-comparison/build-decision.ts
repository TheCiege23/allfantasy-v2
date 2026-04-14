import type {
  DeterministicStatComparisonRow,
  PlayerComparisonResult,
  ResolvedPlayerStats,
  ScoringFormat,
  TwoPlayerComparisonEngineResult,
} from '@/lib/player-comparison-lab/types'
import type {
  AiCategoryBattle,
  AiPlayerComparisonPlayerBlock,
  AiPlayerComparisonResponse,
  AiScenarioAdviceBlock,
  AiPlayerComparisonStrategyMode,
} from './types'
import {
  confidenceFromScore,
  resolveRecommendedSideFromScore,
  scoreRowsForStrategyMode,
} from './strategy-weights'

function rowById(rows: DeterministicStatComparisonRow[], id: string) {
  return rows.find((r) => r.metricId === id) ?? null
}

function winnerCounts(
  rows: DeterministicStatComparisonRow[],
  ids: string[]
): { a: number; b: number; ties: number } {
  let a = 0
  let b = 0
  let ties = 0
  for (const id of ids) {
    const r = rowById(rows, id)
    if (!r || r.winner === 'none') continue
    if (r.winner === 'playerA') a++
    else if (r.winner === 'playerB') b++
    else ties++
  }
  return { a, b, ties }
}

function pickCategoryWinner(
  aCount: number,
  bCount: number,
  tieBreakEdge: number | null
): 'playerA' | 'playerB' | 'tie' {
  if (aCount > bCount) return 'playerA'
  if (bCount > aCount) return 'playerB'
  if (tieBreakEdge != null) {
    if (tieBreakEdge > 0.02) return 'playerA'
    if (tieBreakEdge < -0.02) return 'playerB'
  }
  return 'tie'
}

function avgEdge(rows: DeterministicStatComparisonRow[], ids: string[]): number | null {
  const edges = ids
    .map((id) => rowById(rows, id)?.edgeScore)
    .filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  if (edges.length === 0) return null
  return edges.reduce((s, x) => s + x, 0) / edges.length
}

function buildCategoryBattles(
  rows: DeterministicStatComparisonRow[],
  playerAName: string,
  playerBName: string
): AiPlayerComparisonResponse['categories'] {
  const proj = winnerCounts(rows, ['projection_points', 'internal_adp'])
  const projEdge = avgEdge(rows, ['projection_points', 'internal_adp'])
  const matchup = winnerCounts(rows, ['schedule_difficulty'])
  const matchupEdge = avgEdge(rows, ['schedule_difficulty'])
  const usage = winnerCounts(rows, ['overall_rank', 'trend_30_day', 'dynasty_value'])
  const usageEdge = avgEdge(rows, ['trend_30_day', 'dynasty_value'])
  const floorIds = ['last_season_fp_per_game', 'volatility']
  const floor = winnerCounts(rows, floorIds)
  const floorEdge = avgEdge(rows, floorIds)
  const ceilIds = ['trend_30_day', 'volatility']
  const ceiling = winnerCounts(rows, ceilIds)
  const ceilingEdge = avgEdge(rows, ceilIds)
  const riskIds = ['injury_risk', 'volatility']
  const risk = winnerCounts(rows, riskIds)
  const riskEdge = avgEdge(rows, riskIds)

  const c = (
    id: AiCategoryBattle['id'],
    label: string,
    counts: { a: number; b: number; ties: number },
    edge: number | null,
    detailFn: (w: 'playerA' | 'playerB' | 'tie') => string
  ): AiCategoryBattle => {
    const w = pickCategoryWinner(counts.a, counts.b, edge)
    return {
      id,
      label,
      winner: w,
      detail: detailFn(w),
      edgeSignal: edge,
    }
  }

  return {
    projection: c('projection', 'Projection & value', proj, projEdge, (w) => {
      if (w === 'tie') return 'Essentially even on projection and ADP-style signals.'
      return w === 'playerA'
        ? `${playerAName} has the stronger projection / value signals.`
        : `${playerBName} has the stronger projection / value signals.`
    }),
    matchup: c('matchup', 'Schedule / matchup', matchup, matchupEdge, (w) => {
      if (w === 'tie') return 'Matchup difficulty is a wash with available data.'
      return w === 'playerA'
        ? `${playerAName} draws the more favorable schedule difficulty signal.`
        : `${playerBName} draws the more favorable schedule difficulty signal.`
    }),
    usage: c('usage', 'Role & opportunity', usage, usageEdge, (w) => {
      if (w === 'tie') return 'Opportunity and rank signals are close.'
      return w === 'playerA'
        ? `${playerAName} edges rank/trend/momentum signals for opportunity.`
        : `${playerBName} edges rank/trend/momentum signals for opportunity.`
    }),
    floor: c('floor', 'Floor / stability', floor, floorEdge, (w) => {
      if (w === 'tie') return 'Floor profile is tight — neither is a clear “safe” auto-win.'
      return w === 'playerA'
        ? `${playerAName} projects the steadier floor using recent FP/game and volatility signals.`
        : `${playerBName} projects the steadier floor using recent FP/game and volatility signals.`
    }),
    ceiling: c('ceiling', 'Ceiling / upside', ceiling, ceilingEdge, (w) => {
      if (w === 'tie') return 'Upside is similar — game script could swing it.'
      return w === 'playerA'
        ? `${playerAName} carries more spike-week traits from trend + volatility.`
        : `${playerBName} carries more spike-week traits from trend + volatility.`
    }),
    risk: c('risk', 'Injury & volatility risk', risk, riskEdge, (w) => {
      if (w === 'tie') return 'Risk profile is comparable — monitor late-week reports.'
      return w === 'playerA'
        ? `${playerAName} is the cleaner risk profile between the two (lower injury/volatility signals).`
        : `${playerBName} is the cleaner risk profile between the two (lower injury/volatility signals).`
    }),
  }
}

function playerBlock(p: ResolvedPlayerStats): AiPlayerComparisonPlayerBlock {
  return {
    name: p.name,
    position: p.position,
    team: p.team,
    projectedPoints: p.internalProjectionPoints,
    rank: p.projection?.rank ?? null,
    volatility: p.projection?.volatility ?? null,
    injuryRisk: p.injury?.riskScore ?? null,
    injuryStatus: p.injury?.status,
  }
}

function dataSourcesFrom(comparison: PlayerComparisonResult): string[] {
  const f = comparison.playerA.sourceFlags
  const out: string[] = []
  if (f.internalProjections) out.push('internal_projections')
  if (f.fantasyCalc) out.push('fantasy_calc')
  if (f.sleeper) out.push('sleeper')
  if (f.espnInjuryFeed) out.push('espn_injury')
  if (f.internalAdp) out.push('internal_adp')
  if (f.leagueScoringSettings) out.push('league_scoring_settings')
  if (out.length === 0) out.push('deterministic_resolver')
  return out
}

function riskNotes(
  a: ResolvedPlayerStats,
  b: ResolvedPlayerStats,
  rows: DeterministicStatComparisonRow[]
): string[] {
  const notes: string[] = []
  const injA = a.injury?.note?.trim()
  const injB = b.injury?.note?.trim()
  if (injA) notes.push(`${a.name}: ${injA}`)
  if (injB) notes.push(`${b.name}: ${injB}`)
  const vol = rowById(rows, 'volatility')
  if (vol?.winner === 'tie' && (vol.playerAValue != null || vol.playerBValue != null)) {
    notes.push('Volatility is close — both have similar week-to-week variance signals.')
  }
  return notes.slice(0, 6)
}

function scenarioBlock(
  mode: AiPlayerComparisonStrategyMode,
  aName: string,
  bName: string,
  rec: string | null,
  categories: AiPlayerComparisonResponse['categories']
): AiScenarioAdviceBlock {
  const other = rec === aName ? bName : aName
  return {
    needUpside:
      mode === 'need_upside'
        ? `Lean ${rec ?? 'the projection'} for spike-week upside; ${other} is the alternative if you need a safer floor.`
        : `If you need ceiling: prioritize ${categories.ceiling.winner === 'tie' ? 'the game environment' : categories.ceiling.winner === 'playerA' ? aName : bName} on trend/volatility signals.`,
    needFloor:
      mode === 'need_floor'
        ? `Safety mode: ${categories.floor.winner === 'tie' ? 'either is viable' : categories.floor.winner === 'playerA' ? aName : bName} maps to the steadier profile.`
        : `Chasing floor: favor ${categories.floor.winner === 'tie' ? 'whoever leads projection' : categories.floor.winner === 'playerA' ? aName : bName} using last-season FP/game + volatility.`,
    needSafety:
      mode === 'need_safety'
        ? `Risk-off: prefer ${categories.risk.winner === 'tie' ? aName : categories.risk.winner === 'playerA' ? bName : aName} — lower injury/volatility risk wins the week.`
        : `Safety: ${categories.risk.winner === 'tie' ? 'monitor injury reports' : categories.risk.winner === 'playerA' ? bName : aName} is the cleaner stability profile on paper.`,
    favored:
      mode === 'favored'
        ? `Favorite build: trust the chalkier projection profile — ${rec ?? aName} is aligned with safer win probability.`
        : `If you’re a big favorite: prioritize reliability (${categories.floor.winner === 'tie' ? 'projection' : categories.floor.winner === 'playerA' ? aName : bName}).`,
    underdog:
      mode === 'underdog'
        ? `Underdog mode: swing for ceiling — ${categories.ceiling.winner === 'tie' ? aName : categories.ceiling.winner === 'playerA' ? aName : bName} has the better boom signals.`
        : `Need variance to catch up: favor ${categories.ceiling.winner === 'tie' ? 'matchup + trend' : categories.ceiling.winner === 'playerA' ? aName : bName}.`,
  }
}

function reasoningBullets(
  engine: TwoPlayerComparisonEngineResult,
  mode: AiPlayerComparisonStrategyMode,
  recommendedSide: 'playerA' | 'playerB' | 'tie',
  verdictName: string | null
): string[] {
  const lines = engine.comparison.summaryLines.slice(0, 3)
  const bullets: string[] = []
  bullets.push(
    recommendedSide === 'tie'
      ? 'Stat edges are tight — this is a coin-flip week unless you have a clear game-script lean.'
      : `Lean ${verdictName ?? 'one side'} for ${mode === 'balanced' ? 'overall weighted edges' : `your ${mode.replace(/_/g, ' ')} build`}.`
  )
  for (const line of lines) {
    if (line?.trim()) bullets.push(line.trim())
  }
  return bullets.slice(0, 6)
}

export function buildAiPlayerComparisonResponse(args: {
  engine: TwoPlayerComparisonEngineResult
  strategyMode: AiPlayerComparisonStrategyMode
  scoringFormat: ScoringFormat | null
  lineupSlotLabel: string | null
}): AiPlayerComparisonResponse {
  const { engine, strategyMode, scoringFormat, lineupSlotLabel } = args
  const rows = engine.deterministic.statComparisons
  const { score, coverageWeight, totalWeight } = scoreRowsForStrategyMode(rows, strategyMode)
  const coverageRatio = totalWeight > 0 ? coverageWeight / totalWeight : 0
  const normalizedScore = totalWeight > 0 ? score / totalWeight : 0
  const recommendedSide = resolveRecommendedSideFromScore(normalizedScore)
  const aName = engine.comparison.playerA.name
  const bName = engine.comparison.playerB.name
  const recommendedPlayer =
    recommendedSide === 'playerA' ? aName : recommendedSide === 'playerB' ? bName : null
  const confidencePct = confidenceFromScore(normalizedScore, recommendedSide, coverageRatio)

  const categories = buildCategoryBattles(rows, aName, bName)
  const scenarioAdvice = scenarioBlock(strategyMode, aName, bName, recommendedPlayer, categories)

  const verdict =
    recommendedSide === 'tie'
      ? `Too close to call — ${aName} vs ${bName} is within the noise on available signals.`
      : `Start ${recommendedPlayer} — edges line up for ${strategyMode === 'balanced' ? 'this week' : `a ${strategyMode.replace(/_/g, ' ')} build`}.`

  const summary =
    recommendedSide === 'tie'
      ? `Balanced decision: projections and matchup signals are converging. ${engine.deterministic.summary}`
      : `${verdict} Confidence ${confidencePct}%. ${engine.deterministic.summary}`

  return {
    ok: true,
    sport: engine.sport,
    scoringFormat,
    strategyMode,
    lineupSlot: lineupSlotLabel,
    recommendedPlayer,
    recommendedSide,
    confidencePct,
    verdict,
    summary,
    categories,
    scenarioAdvice,
    playerA: playerBlock(engine.comparison.playerA),
    playerB: playerBlock(engine.comparison.playerB),
    reasoningBullets: reasoningBullets(engine, strategyMode, recommendedSide, recommendedPlayer),
    riskNotes: riskNotes(engine.comparison.playerA, engine.comparison.playerB, rows),
    dataSources: dataSourcesFrom(engine.comparison),
    narrative: engine.explanation.text,
    narrativeSource: engine.explanation.source,
    engine: {
      statComparisons: rows,
      comparisonSummaryLines: engine.comparison.summaryLines,
    },
  }
}
