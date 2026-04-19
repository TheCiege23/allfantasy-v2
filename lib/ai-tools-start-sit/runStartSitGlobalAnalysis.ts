import 'server-only'

import { prisma } from '@/lib/prisma'
import { resolveNormalizedPlayerSportsProfiles } from '@/lib/sports-data-normalization'
import type { NormalizedPlayerSportsProfile } from '@/lib/sports-data-normalization/types'
import { collectProjectionNotes, effectiveFantasyPoints } from '@/lib/projection-engine'
import { attachIntelligenceToChimmyPayload, buildAiToolPayload } from '@/lib/intelligence'
import { resolveMatchupPeriod } from '@/lib/league-context-engine'
import { attachSportsNormalizationToChimmyPayload } from '@/lib/sports-data-normalization'
import { getPlayerNews } from '@/lib/data/players'
import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import type { StartSitAnalyzeResult, StartSitMode, StartSitPlayerRow, StartSitRec, StartSitStructuredDecision } from '@/lib/ai-tools-start-sit/runStartSitAnalysis'
import type { AiTimeContextPayload } from '@/lib/time-engine/types'

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function roundToTenth(n: number): number {
  return Math.round(n * 10) / 10
}

function maxPeriodForSport(sport: SupportedSport): number {
  switch (sport) {
    case 'NFL':
    case 'NCAAF':
      return 18
    case 'NBA':
    case 'NCAAB':
      return 28
    case 'MLB':
      return 32
    case 'NHL':
      return 30
    case 'SOCCER':
      return 40
    default:
      return 24
  }
}

function resolveWeekParam(week: string, sport: SupportedSport, current: number): number {
  const max = maxPeriodForSport(sport)
  if (week === 'current') return Math.min(max, Math.max(1, current))
  if (week === 'next') return Math.min(max, current + 1)
  const n = Number(week)
  if (Number.isFinite(n) && n >= 1) return Math.min(max, n)
  return Math.min(max, Math.max(1, current))
}

function volFromInjury(status: string | null | undefined): number {
  if (!status) return 0.22
  const s = status.toLowerCase()
  if (s.includes('out') || s.includes('ir')) return 0.45
  if (s.includes('doubt')) return 0.4
  if (s.includes('quest')) return 0.32
  if (s.includes('prob')) return 0.26
  return 0.24
}

function pickRec(p: StartSitPlayerRow, reason: string, confidence: number): StartSitRec {
  return { player: p, reason, confidence: Math.round(clamp(confidence, 0, 100)) }
}

function recentFpgFromStats(stats: unknown): number | null {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return null
  const o = stats as Record<string, unknown>
  for (const k of ['fantasyPointsPerGame', 'fppg', 'avgPoints', 'avg_fp']) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

/**
 * Sport-level snapshot — not a user roster. Uses real `sports_players` rows + normalization without league scoring.
 */
export async function runStartSitGlobalAnalysis(input: {
  userId: string
  sport: SupportedSport
  week: string
  mode: StartSitMode
}): Promise<StartSitAnalyzeResult> {
  const dataGaps: string[] = []
  const now = new Date().toISOString()
  const sport = normalizeToSupportedSport(input.sport)
  const nowYear = new Date().getUTCFullYear()
  let currentPeriod = 1
  try {
    const mp = await resolveMatchupPeriod({ sport, leagueSeason: nowYear })
    currentPeriod = mp.currentPeriod
  } catch {
    dataGaps.push('Current-period lookup failed — defaulting to period 1.')
  }
  const weekNum = resolveWeekParam(input.week, sport, currentPeriod)
  const weekLabel =
    sport === 'NFL' || sport === 'NCAAF' ? `Week ${weekNum}` : `${sport} period ${weekNum}`

  dataGaps.push(
    'Global mode: projections use sport defaults — not your league scoring, roster, or locks. Select a league for personalized Start/Sit.',
  )

  const rows = await prisma.sportsPlayerRecord.findMany({
    where: { sport },
    take: 140,
    orderBy: { lastUpdated: 'desc' },
  })

  if (rows.length === 0) {
    dataGaps.push('No sports_players rows found for this sport — sync sports data first.')
  }

  const pending = rows.slice(0, 90).map((row) => ({
    rawId: `global-${row.id}`,
    row,
  }))

  let sportsNormBatch: Awaited<ReturnType<typeof resolveNormalizedPlayerSportsProfiles>> | null = null
  if (pending.length > 0) {
    try {
      sportsNormBatch = await resolveNormalizedPlayerSportsProfiles({
        prisma,
        sport,
        players: pending.map((p) => ({
          name: p.row.name,
          rosterPlayerId: p.rawId,
          sportsPlayerRow: {
            name: p.row.name,
            position: p.row.position,
            team: p.row.team,
            injuryStatus: p.row.injuryStatus,
            projections: p.row.projections,
            stats: p.row.stats,
            externalId: p.row.id,
          },
        })),
        leagueScoring: null,
        includeClearSportsProjections: pending.length <= 48,
      })
      dataGaps.push(...sportsNormBatch.batchDataGaps)
    } catch (e) {
      console.warn('[start-sit global] normalization failed', e)
      dataGaps.push('Sports normalization failed for global snapshot.')
    }
  }

  const byNormName = new Map<string, NormalizedPlayerSportsProfile>(
    (sportsNormBatch?.players ?? []).map((p) => [p.player.name.toLowerCase(), p]),
  )

  const players: StartSitPlayerRow[] = []
  for (const { rawId, row } of pending) {
    const prof = byNormName.get(row.name.toLowerCase())
    const displayProj = effectiveFantasyPoints(prof) ?? null
    const wxAdj = prof?.projection.weatherAdjustedProjection ?? null
    const injAdj = prof?.projection.injuryNews?.adjustedPoints ?? null
    const scoreAdj = prof?.projection.scoringRuleAdjustedProjection ?? null
    const schedAdj = prof?.projection.scheduleAdjustedProjection ?? null
    const trendAdj = prof?.projection.recentTrendAdjustedProjection ?? null
    const floor = prof?.projection.projectedFantasyPointsRange.low ?? null
    const ceiling = prof?.projection.projectedFantasyPointsRange.high ?? null
    const vol = volFromInjury(row.injuryStatus)
    const floorFallback =
      floor ?? (displayProj != null ? roundToTenth(displayProj * (1 - 0.35 * vol)) : null)
    const ceilingFallback =
      ceiling ?? (displayProj != null ? roundToTenth(displayProj * (1 + 0.45 * vol)) : null)
    const notes = collectProjectionNotes(prof)
    const injSummary = prof?.injuryNewsLayer?.playerNewsSummary ?? prof?.injuryNewsLayer?.sources?.[0]?.detail ?? null

    players.push({
      playerId: rawId,
      recordId: row.id,
      name: row.name,
      position: row.position,
      team: row.team,
      projectedPoints: displayProj != null ? roundToTenth(displayProj) : null,
      floor: floor ?? floorFallback,
      ceiling: ceiling ?? ceilingFallback,
      recentFantasyAvg: prof?.actualPerformance?.fantasyPointsPerGame ?? recentFpgFromStats(row.stats),
      injuryStatus: row.injuryStatus,
      rollingFppg: prof?.trendUsage?.rollingFppg ?? prof?.actualPerformance?.fantasyPointsPerGame ?? null,
      headshotUrl: row.headshotUrlLg ?? row.headshotUrlSm ?? row.headshotUrl,
      weatherAdjustedPoints: wxAdj != null ? roundToTenth(wxAdj) : null,
      weatherRiskLevel: prof?.projection.weatherRiskLevel ?? null,
      weatherSummary: prof?.projection.weatherSummary ?? null,
      injuryNewsAdjustedPoints: injAdj != null ? roundToTenth(injAdj) : null,
      scoringRuleAdjustedProjection: scoreAdj != null ? roundToTenth(scoreAdj) : null,
      scheduleAdjustedProjection: schedAdj != null ? roundToTenth(schedAdj) : null,
      matchupAdjustedProjection: trendAdj != null ? roundToTenth(trendAdj) : null,
      projectionConfidence: prof?.projection.projectionConfidence ?? null,
      injuryNewsFreshnessAt: prof?.injuryNewsLayer?.primarySourceAt ?? prof?.injury?.updatedAt ?? null,
      projectionNotes: notes,
      injuryNewsSummary: injSummary,
    })
  }

  players.sort((a, b) => (b.projectedPoints ?? -1) - (a.projectedPoints ?? -1))
  const trimmed = players.slice(0, 48)

  const injuryNewsNotes: string[] = []
  for (const p of trimmed.slice(0, 8)) {
    if (!p.recordId) continue
    try {
      const news = await getPlayerNews(p.recordId, 2)
      for (const n of news) {
        const line = `${p.name}: ${n.headline}`.slice(0, 200)
        if (!injuryNewsNotes.includes(line)) injuryNewsNotes.push(line)
      }
    } catch {
      /* skip */
    }
  }
  for (const p of trimmed) {
    if (p.injuryStatus && /out|ir|doubt|quest/i.test(p.injuryStatus)) {
      injuryNewsNotes.unshift(`${p.name}: ${p.injuryStatus}`)
    }
  }

  const withProj = trimmed.filter((p): p is StartSitPlayerRow & { projectedPoints: number } => p.projectedPoints != null)
  const sortable = [...withProj].sort((a, b) => b.projectedPoints - a.projectedPoints)
  const byFloor = [...trimmed].filter((p) => p.floor != null).sort((a, b) => (b.floor ?? 0) - (a.floor ?? 0))
  const byCeil = [...trimmed].filter((p) => p.ceiling != null).sort((a, b) => (b.ceiling ?? 0) - (a.ceiling ?? 0))

  const confBase = 38

  const bestStart = sortable[0]
    ? pickRec(
        sortable[0],
        'Top effective projection in this sport snapshot (not league-scored).',
        confBase + Math.min(12, sortable.length),
      )
    : null
  const worst = sortable.length >= 2 ? sortable[sortable.length - 1] : null
  const bestSit = worst
    ? pickRec(worst, 'Lowest projected in snapshot — illustrative only without your roster.', confBase - 6)
    : null
  const safest = byFloor[0]
    ? pickRec(byFloor[0], 'Highest floor in snapshot — global mode; confidence capped.', confBase + 4)
    : null
  const upside = byCeil[0]
    ? pickRec(byCeil[0], 'Highest ceiling in snapshot — boom/bust.', confBase + 2)
    : null
  const fallback = sortable.length >= 2 ? pickRec(sortable[1], 'Secondary option in snapshot.', confBase) : null

  let primaryStart: StartSitRec | null = bestStart
  if (input.mode === 'safe' && safest) primaryStart = safest
  if (input.mode === 'upside' && upside) primaryStart = upside

  const recommendations = {
    bestStart: primaryStart,
    bestSit,
    safest,
    upside,
    floorOption: safest,
    fallback,
  }

  const aiEnvelope = await buildAiToolPayload({
    userId: input.userId,
    tool: 'start_sit',
    mode: 'global',
    league: null,
    data: { sport: String(sport), week: weekNum, snapshot: 'sport_projection_sample' },
    enrichTimeFromLeagueId: null,
    includeHealth: false,
    includeTeamContext: false,
  })

  const timeCtx: AiTimeContextPayload = aiEnvelope.time

  const leagueSettingsSnapshot: Record<string, unknown> = {
    mode: 'global',
    sport,
    week: weekNum,
    weekLabel,
    note: 'No league — sport-level projection sample from sports_players.',
  }

  const structuredDecision: StartSitStructuredDecision = {
    bestStart: {
      name: recommendations.bestStart?.player.name ?? '—',
      why: recommendations.bestStart?.reason ?? 'No projection-backed row.',
      confidence: recommendations.bestStart?.confidence ?? 0,
    },
    safest: {
      name: recommendations.safest?.player.name ?? '—',
      why: recommendations.safest?.reason ?? '—',
      confidence: recommendations.safest?.confidence ?? 0,
    },
    highestUpside: {
      name: recommendations.upside?.player.name ?? '—',
      why: recommendations.upside?.reason ?? '—',
      confidence: recommendations.upside?.confidence ?? 0,
    },
    fallback: {
      name: recommendations.fallback?.player.name ?? '—',
      why: recommendations.fallback?.reason ?? '—',
    },
    weatherNote: trimmed.some((p) => p.weatherSummary)
      ? trimmed
          .map((p) => p.weatherSummary)
          .filter((x): x is string => Boolean(x))
          .slice(0, 2)
          .join(' | ')
      : null,
    scoringRuleNote: 'League scoring not applied in global mode.',
    lockTimeNote: timeCtx.nextLockTimeUTC ? `Next lock (UTC): ${timeCtx.nextLockTimeUTC}` : null,
    lineupBehaviorNote: 'No league roster — compare players in abstract; connect a league for real lineup slots.',
  }

  const projCoverage = withProj.length / Math.max(1, trimmed.length)
  const confidenceScore = Math.round(
    clamp(28 + projCoverage * 22 - dataGaps.length * 2, 12, 58),
  )

  const chimmyPayloadBase = attachIntelligenceToChimmyPayload(
    {
      tool: 'start_sit',
      leagueContextEngine: null,
      sport,
      leagueId: null,
      leagueName: null,
      week: weekNum,
      mode: input.mode,
      afTimeContext: timeCtx,
      leagueSettingsSnapshot,
      analysisMode: 'global',
      teamContext: null,
      opponent: null,
      structuredDecision,
      lineupSlotAnalysis: [],
      recommendations: {
        bestStart: recommendations.bestStart?.player.name,
        bestSit: recommendations.bestSit?.player.name,
        safest: recommendations.safest?.player.name,
        upside: recommendations.upside?.player.name,
        floorOption: recommendations.floorOption?.player.name,
        fallback: recommendations.fallback?.player.name,
      },
      players: trimmed.slice(0, 36).map((p) => ({
        name: p.name,
        position: p.position,
        team: p.team,
        proj: p.projectedPoints,
        injuryNewsAdj: p.injuryNewsAdjustedPoints,
        scoringAdj: p.scoringRuleAdjustedProjection,
        scheduleAdj: p.scheduleAdjustedProjection,
        matchupAdj: p.matchupAdjustedProjection,
        floor: p.floor,
        ceiling: p.ceiling,
        injury: p.injuryStatus,
        injuryNews: p.injuryNewsSummary,
        rollingFppg: p.rollingFppg,
        weather: p.weatherSummary,
        weatherRisk: p.weatherRiskLevel,
        projectionNotes: p.projectionNotes.slice(0, 4),
      })),
      matchupNotes: [],
      injuryNewsNotes: injuryNewsNotes.slice(0, 12),
      dataGaps,
      dataFreshness: now,
      standardAiPayload: aiEnvelope.standard,
    },
    aiEnvelope,
  )

  const chimmyPayload =
    sportsNormBatch != null
      ? attachSportsNormalizationToChimmyPayload(chimmyPayloadBase, sportsNormBatch)
      : chimmyPayloadBase

  const sportsDataReady = trimmed.length > 0 && sportsNormBatch != null
  const injuryNewsLayerReady = trimmed.some((p) => p.injuryNewsSummary)
  const weatherLayerReady = trimmed.some((p) => p.weatherSummary)
  const validation = {
    leagueContextResolved: false,
    scoringRulesPresent: false,
    rosterLoaded: false,
    lineupTemplateResolved: false,
    timeContextPresent: true,
    projectionBatchPresent: sportsNormBatch != null,
  }

  return {
    ok: true,
    analysisMode: 'global',
    sport,
    leagueId: null,
    teamId: null,
    leagueName: `${sport} · global snapshot`,
    week: weekNum,
    weekLabel,
    generalAnalysis: true,
    mode: input.mode,
    leagueSettingsSnapshot,
    teamContext: {
      teamName: null,
      record: null,
      rank: null,
      pointsFor: null,
    },
    opponent: null,
    recommendations,
    structuredDecision,
    lineupSlotAnalysis: [],
    matchupNotes: [
      'Global mode ranks real players from the sports database — not your fantasy roster or league scoring.',
    ],
    injuryNewsNotes: injuryNewsNotes.slice(0, 15),
    reasoning: {
      league: 'No league: using sport-level projections without custom scoring weights.',
      team: 'Connect a league to anchor Start/Sit to your roster and scoring.',
    },
    confidenceScore,
    players: trimmed,
    dataGaps,
    dataFreshness: now,
    chimmyPayload,
    timeContext: timeCtx,
    validation,
    sourceFlags: {
      sportsDataReady,
      injuryNewsLayerReady,
      weatherLayerReady,
      leagueScoringApplied: false,
      aiEnvelopeReady: true,
      // Global mode can't produce league-bound strategic coaching.
      strategicCoachingReady: null,
    },
    summary:
      'Sport-level projection snapshot — select a league for roster-aware, scoring-aware recommendations.',
    unresolvedDecisions: [],
    bestBallInformational: false,
    lockStatusLabel: null,
    dataQuality: sportsDataReady ? 'partial' : 'degraded',
  }
}
