import type { AIContextEnvelope } from '@/lib/unified-ai/types'
import type { ChimmyDeterministicLayer, DeterministicSectionKey } from './types'

function toObjectOrNull(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickFirstObject(
  sources: Array<Record<string, unknown> | null>,
  keys: string[]
): Record<string, unknown> | null {
  for (const source of sources) {
    if (!source) continue
    for (const key of keys) {
      const picked = toObjectOrNull(source[key])
      if (picked) return picked
    }
  }
  return null
}

function toKeyList(value: Record<string, unknown> | null): string {
  if (!value) return 'missing'
  const keys = Object.keys(value).slice(0, 4)
  return keys.length > 0 ? keys.join(', ') : 'available'
}

export function buildDeterministicLayer(envelope: AIContextEnvelope): ChimmyDeterministicLayer {
  const deterministic = toObjectOrNull(envelope.deterministicPayload)
  const stats = toObjectOrNull(envelope.statisticsPayload)
  const simulation = toObjectOrNull(envelope.simulationPayload)
  const rankingsPayload = toObjectOrNull(envelope.rankingsPayload)

  const sources = [deterministic, stats, simulation, rankingsPayload]

  const projections = pickFirstObject(sources, [
    'projections',
    'projectionOutputs',
    'projectionData',
    'projectedPoints',
    'projectionSummary',
  ])

  const matchupData = pickFirstObject(sources, [
    'matchupData',
    'matchups',
    'matchup',
    'scheduleMatchups',
    'opponentMatchups',
  ])

  const rosterNeeds = pickFirstObject(sources, [
    'rosterNeeds',
    'needs',
    'positionNeeds',
    'rosterGaps',
    'lineupNeeds',
  ])

  const adpComparisons = pickFirstObject(sources, [
    'adpComparisons',
    'adpComparison',
    'adpDelta',
    'adp',
  ])

  const rankings = pickFirstObject(sources, [
    'rankings',
    'ranking',
    'leagueRankings',
    'playerRanks',
  ])

  const scoringOutputs = pickFirstObject(sources, [
    'scoringOutputs',
    'scoring',
    'scoreOutputs',
    'valueScores',
    'scoringResults',
  ])

  const sections: Array<[DeterministicSectionKey, Record<string, unknown> | null]> = [
    ['projections', projections],
    ['matchupData', matchupData],
    ['rosterNeeds', rosterNeeds],
    ['adpComparisons', adpComparisons],
    ['rankings', rankings],
    ['scoringOutputs', scoringOutputs],
  ]

  const missingSections = sections.filter(([, value]) => value == null).map(([key]) => key)
  const presentCount = sections.length - missingSections.length
  const completenessPct = Math.round((presentCount / sections.length) * 100)

  return {
    projections,
    matchupData,
    rosterNeeds,
    adpComparisons,
    rankings,
    scoringOutputs,
    missingSections,
    completenessPct,
  }
}

export function buildDeterministicSummaryLine(layer: ChimmyDeterministicLayer): string {
  return [
    `projections: ${toKeyList(layer.projections)}`,
    `matchups: ${toKeyList(layer.matchupData)}`,
    `roster needs: ${toKeyList(layer.rosterNeeds)}`,
    `adp: ${toKeyList(layer.adpComparisons)}`,
    `rankings: ${toKeyList(layer.rankings)}`,
    `scoring: ${toKeyList(layer.scoringOutputs)}`,
  ].join(' | ')
}
