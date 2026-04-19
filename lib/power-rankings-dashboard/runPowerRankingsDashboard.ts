import 'server-only'

import type { LeagueTeam } from '@prisma/client'
import { computePowerRankings } from '@/lib/league-power-rankings'
import type { PowerRankingTeam, PowerRankingsOutput } from '@/lib/league-power-rankings/types'
import { leagueToolAccessUserMessage } from '@/lib/ai-tools/league-tool-access-messages'
import type { LeagueToolAccessErrorCode } from '@/lib/ai-tools/league-tool-context-types'
import { assertLeagueMemberWithCode } from '@/lib/league/league-access'
import { openaiChatText } from '@/lib/openai-client'
import { prisma } from '@/lib/prisma'
import { attachIntelligenceToChimmyPayload, buildAiToolPayload } from '@/lib/intelligence'
import { resolveNormalizedLeagueContext } from '@/lib/league-context-engine'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { buildAfLeaguePowerRankingsOutput } from '@/lib/power-rankings-dashboard/afLeaguePowerTruth'
import type {
  ContenderFactors,
  ContenderSignal,
  EnrichedTeamRow,
  PlayoffFieldStatus,
  PowerRankingsDashboardInput,
  PowerRankingsDashboardOutput,
  PowerRankingsDashboardResult,
  PowerRankingsSourceFlags,
  ProjectionTruthSource,
  RankThirdLabel,
  RankingModeId,
} from './types'

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function rankThird(rank: number, teamCount: number): RankThirdLabel {
  if (teamCount <= 1) return 'upper_third'
  const t = Math.ceil(teamCount / 3)
  if (rank <= t) return 'upper_third'
  if (rank <= 2 * t) return 'middle_third'
  return 'lower_third'
}

function tierLabelFromThird(r: RankThirdLabel): string {
  switch (r) {
    case 'upper_third':
      return 'Upper third (by rank)'
    case 'middle_third':
      return 'Middle third (by rank)'
    default:
      return 'Lower third (by rank)'
  }
}

function playoffFieldStatusForTeam(
  rank: number,
  teamCount: number,
  playoffTeams: number | null,
): PlayoffFieldStatus {
  if (playoffTeams == null || playoffTeams <= 0 || teamCount < 2) return 'unknown'
  const cut = clamp(playoffTeams, 1, teamCount)
  if (rank <= cut) return 'inside'
  if (rank <= cut + 2) return 'bubble'
  return 'outside'
}

function contenderSignal(rank: number, teamCount: number): ContenderSignal {
  const t = Math.ceil(teamCount / 3)
  if (rank <= t) return 'firm'
  if (rank <= 2 * t) return 'bubble'
  return 'longshot'
}

/**
 * Data-derived contender factors — Pythagorean luck, SOS, roster strength percentile.
 * All values are null when inputs are missing; we never fabricate.
 */
function buildContenderFactors(
  team: PowerRankingTeam,
  rosterStrengthPct: number | null,
): ContenderFactors {
  const wins = team.record.wins
  const losses = team.record.losses
  const ties = team.record.ties
  const games = wins + losses + ties
  const actualWinPct = games > 0 ? (wins + ties * 0.5) / games : null
  const pf = team.pointsFor
  const pa = team.pointsAgainst
  // Pythagorean expectation (exponent 2.37 is the fantasy-football fit; NBA/MLB vary
  // but 2.37 works reasonably as a generic proxy).
  let luckFactor: number | null = null
  if (pf > 0 && pa > 0 && actualWinPct != null) {
    const pyth = Math.pow(pf, 2.37) / (Math.pow(pf, 2.37) + Math.pow(pa, 2.37))
    if (pyth > 0.01) luckFactor = Math.round((actualWinPct / pyth) * 100) / 100
  }
  const remainingSosHigh =
    typeof team.strengthOfSchedule === 'number'
      ? team.strengthOfSchedule > 0.55
      : null
  const bits: string[] = []
  if (luckFactor != null) {
    if (luckFactor >= 1.15) bits.push(`overperforming record (luck ${luckFactor.toFixed(2)})`)
    else if (luckFactor <= 0.85) bits.push(`underperforming record (luck ${luckFactor.toFixed(2)})`)
    else bits.push(`record in line with PF/PA (luck ${luckFactor.toFixed(2)})`)
  }
  if (rosterStrengthPct != null) bits.push(`roster strength P${rosterStrengthPct}`)
  if (remainingSosHigh === true) bits.push('tough remaining SOS')
  else if (remainingSosHigh === false) bits.push('soft remaining SOS')
  return {
    luckFactor,
    remainingSosHigh,
    rosterStrengthPct,
    rationale: bits.length ? bits.join(' · ') : 'Limited data — classified by rank tier only.',
  }
}

/**
 * Blend tertile signal with luck + roster strength so a "firm contender" on a lucky
 * record gets demoted to 'bubble' and a "longshot" with strong roster gets promoted.
 */
function refineContenderSignal(base: ContenderSignal, f: ContenderFactors): ContenderSignal {
  const luck = f.luckFactor
  const rosterPct = f.rosterStrengthPct
  if (base === 'firm' && luck != null && luck >= 1.2 && (rosterPct == null || rosterPct < 50)) {
    return 'bubble'
  }
  if (base === 'longshot' && luck != null && luck <= 0.82 && rosterPct != null && rosterPct >= 55) {
    return 'bubble'
  }
  if (base === 'bubble' && luck != null && luck >= 1.25 && rosterPct != null && rosterPct < 30) {
    return 'longshot'
  }
  return base
}

function momentumFrom(team: PowerRankingTeam): EnrichedTeamRow['momentumLabel'] {
  const rd = team.rankDelta ?? 0
  const recent = team.recentPerformanceScore ?? 50
  if (rd >= 2 && recent >= 58) return 'surging'
  if (rd >= 1 || recent >= 62) return 'hot'
  if (rd <= -2 && recent <= 42) return 'fading'
  if (rd <= -1 || recent <= 38) return 'cold'
  return 'stable'
}

function snippetFor(team: PowerRankingTeam, mode: RankingModeId): string {
  const parts: string[] = []
  parts.push(`PF ${team.pointsFor.toFixed(1)} · PA ${team.pointsAgainst.toFixed(1)}`)
  if (team.rankDelta != null && team.rankDelta !== 0) {
    parts.push(team.rankDelta > 0 ? `↑${team.rankDelta} vs prior rank` : `↓${Math.abs(team.rankDelta)} vs prior rank`)
  }
  parts.push(`SOS proxy ${(team.strengthOfSchedule * 100).toFixed(0)} (opp win% strength)`)
  if (mode === 'weekly_power') parts.push(`Recent form index ${team.recentPerformanceScore.toFixed(0)}`)
  if (mode === 'rest_of_season') parts.push(`Projection layer ${team.projectionStrengthScore.toFixed(0)}`)
  return parts.join(' · ')
}

function modeSortScore(team: PowerRankingTeam, mode: RankingModeId): number {
  switch (mode) {
    case 'weekly_power':
      return team.recentPerformanceScore * 0.55 + team.powerScore * 0.45
    case 'rest_of_season':
      return team.projectionStrengthScore * 0.55 + team.powerScore * 0.45
    case 'dynasty_power':
      return team.rosterStrengthScore * 0.6 + team.powerScore * 0.4
    case 'momentum':
      return (team.rankDelta ?? 0) * 8 + team.recentPerformanceScore * 0.7 + team.powerScore * 0.25
    case 'rebuild_index':
      return 100 - team.rosterStrengthScore + (team.projectionStrengthScore ?? 0) * 0.1
    case 'contender_index':
      return team.powerScore * 0.55 + team.recentPerformanceScore * 0.25 + team.rosterStrengthScore * 0.2
    case 'playoff_odds':
    case 'championship_odds':
      return team.powerScore * 0.65 + team.projectionStrengthScore * 0.35
    case 'all_around':
      return (
        team.powerScore * 0.35 +
        team.recentPerformanceScore * 0.25 +
        team.rosterStrengthScore * 0.25 +
        team.projectionStrengthScore * 0.15
      )
    default:
      return team.powerScore
  }
}

function rowConfidence(
  team: PowerRankingTeam,
  truth: ProjectionTruthSource,
  projectionToggle: boolean,
): number {
  let c = 55
  if (truth === 'sleeper_engine') c += 22
  if (truth === 'af_normalized') c += 18
  if (truth === 'standings_only') c += 5
  if (team.powerScoreBreakdown.projectionStrength > 5 && projectionToggle) c += 8
  if (team.pointsFor > 0) c += 5
  return clamp(Math.round(c), 22, 96)
}

function enrichRow(
  team: PowerRankingTeam,
  meta: {
    teamName: string
    avatarUrl: string | null
    externalId: string | null
    isCurrentUser: boolean
    teamCount: number
    playoffTeams: number | null
  },
  mode: RankingModeId,
  truth: ProjectionTruthSource,
  projectionToggle: boolean,
): EnrichedTeamRow {
  const r3 = rankThird(team.rank, meta.teamCount)
  return {
    ...team,
    teamName: meta.teamName,
    avatarUrl: meta.avatarUrl,
    externalId: meta.externalId,
    isCurrentUser: meta.isCurrentUser,
    tierLabel: tierLabelFromThird(r3),
    rankThird: r3,
    momentumLabel: momentumFrom(team),
    snippet: snippetFor(team, mode),
    playoffOddsPct: null,
    championshipOddsPct: null,
    playoffFieldStatus: playoffFieldStatusForTeam(team.rank, meta.teamCount, meta.playoffTeams),
    contenderSignal: contenderSignal(team.rank, meta.teamCount),
    rowConfidence: rowConfidence(team, truth, projectionToggle),
  }
}

async function fallbackRankingsFromDbTeams(
  leagueId: string,
  week: number | null | undefined,
): Promise<PowerRankingsOutput | null> {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    include: { teams: true },
  })
  if (!league?.teams?.length) return null

  const sorted = [...league.teams].sort((a, b) => {
    const ag = a.wins + a.losses + a.ties
    const bg = b.wins + b.losses + b.ties
    const aw = ag > 0 ? a.wins / ag : 0
    const bw = bg > 0 ? b.wins / bg : 0
    if (bw !== aw) return bw - aw
    return b.pointsFor - a.pointsFor
  })

  const teams: PowerRankingTeam[] = sorted.map((t, index) => {
    const rank = index + 1
    const wins = t.wins
    const losses = t.losses
    const ties = t.ties
    const g = Math.max(1, wins + losses + ties)
    const winPct = wins / g
    const pf = t.pointsFor
    const pa = t.pointsAgainst
    const recordScore = clamp(winPct * 100 + clamp((pf - pa) / g / 3, -10, 10), 0, 100)
    const powerScore = Math.round(recordScore * 10) / 10
    return {
      rosterId: Number.parseInt(String(t.externalId).replace(/\D/g, ''), 10) || index + 1,
      ownerId: t.platformUserId ?? t.claimedByUserId ?? t.externalId,
      displayName: t.teamName,
      username: t.ownerName,
      rank,
      prevRank: t.currentRank ?? null,
      rankDelta: t.currentRank != null ? t.currentRank - rank : null,
      record: { wins, losses, ties },
      pointsFor: pf,
      pointsAgainst: pa,
      strengthOfSchedule: 0.5,
      recentPerformanceScore: powerScore,
      rosterStrengthScore: t.aiPowerScore ?? powerScore * 0.95,
      projectionStrengthScore: t.projectedWins != null ? clamp((t.projectedWins / g) * 100, 0, 100) : powerScore * 0.92,
      rosterValue: 0,
      expectedWins: t.projectedWins ?? wins,
      composite: t.aiPowerScore ?? powerScore,
      powerScore,
      powerScoreBreakdown: {
        record: recordScore,
        recentPerformance: powerScore,
        rosterStrength: t.aiPowerScore ?? powerScore * 0.95,
        projectionStrength: t.projectedWins != null ? (t.projectedWins / g) * 100 : powerScore * 0.92,
        weightedScore: powerScore,
      },
    }
  })

  return {
    leagueId,
    leagueName: league.name ?? 'League',
    season: String(league.season),
    week: typeof week === 'number' && Number.isFinite(week) ? week : 1,
    teams,
    computedAt: Date.now(),
    formula: {
      recordWeight: 1,
      recentPerformanceWeight: 0,
      rosterStrengthWeight: 0,
      projectionStrengthWeight: 0,
    },
  }
}

function buildTeamLookup(teams: LeagueTeam[]) {
  const m = new Map<string, LeagueTeam>()
  for (const t of teams) {
    m.set(String(t.externalId), t)
    m.set(`rid:${String(t.externalId)}`, t)
    if (t.platformUserId) m.set(`pu:${t.platformUserId}`, t)
  }
  return m
}

function findLeagueTeam(lookup: Map<string, LeagueTeam>, team: PowerRankingTeam) {
  return (
    lookup.get(String(team.rosterId)) ??
    lookup.get(`rid:${String(team.rosterId)}`) ??
    lookup.get(`pu:${team.ownerId}`)
  )
}

export async function runPowerRankingsDashboard(input: PowerRankingsDashboardInput): Promise<PowerRankingsDashboardOutput> {
  const dataGaps: string[] = []
  const engineNotes: string[] = []

  if (!input.leagueId?.trim()) {
    const scopeSport =
      input.sportFilter === 'ALL' ? null : normalizeToSupportedSport(String(input.sportFilter))
    const noLeagueEnvelope = await buildAiToolPayload({
      userId: input.userId,
      tool: 'power_rankings',
      mode: 'global',
      league: null,
      data: { scope: 'none', rankingMode: input.rankingMode, timeWindow: input.timeWindow },
      includeTeamContext: false,
    })
    return {
      ok: true,
      analysisScope: 'none',
      engine: 'none',
      projectionTruth: 'standings_only',
      leagueName: null,
      sport: scopeSport,
      season: null,
      week: null,
      rankingMode: input.rankingMode,
      teams: [],
      raw: null,
      aiNarrative: input.skipAi
        ? null
        : 'Select a league with synced standings. Without a league, there is no league-specific power ranking — pick a league above.',
      chimmyPayload: attachIntelligenceToChimmyPayload(
        {
          tool: 'power_rankings',
          leagueContextEngine: null,
          scope: 'none',
          sportFilter: input.sportFilter,
          rankingMode: input.rankingMode,
          timeWindow: input.timeWindow,
          note: 'no_league_selected',
        },
        noLeagueEnvelope
      ),
      dataGaps: [
        'No league selected — power rankings require a league with synced team data (standings / roster sync).',
      ],
      degraded: true,
      computedAt: new Date().toISOString(),
      scoringSummary: null,
      timeContext: null,
      aggregateConfidence: 0,
      engineNotes: [],
      sourceFlags: {
        standingsReady: false,
        rostersReady: false,
        projectionLayerReady: false,
        injuryNewsLayerReady: false,
        priorSnapshotReady: false,
        leagueScoringApplied: false,
        aiEnvelopeReady: false,
      },
    }
  }

  const access = await assertLeagueMemberWithCode(input.leagueId.trim(), input.userId)
  if (!access.ok) {
    const code = access.code
    const msg = leagueToolAccessUserMessage(code)
    return { ok: false, error: msg, code, userMessage: msg }
  }

  const leagueRow = await prisma.league.findFirst({
    where: { id: input.leagueId.trim() },
    include: {
      teams: true,
    },
  })
  if (!leagueRow) {
    const code: LeagueToolAccessErrorCode = 'LEAGUE_NOT_FOUND'
    const msg = leagueToolAccessUserMessage(code)
    return { ok: false, error: msg, code, userMessage: msg }
  }

  const sport = normalizeToSupportedSport(String(leagueRow.sport))
  if (input.sportFilter !== 'ALL' && input.sportFilter.toUpperCase() !== String(leagueRow.sport).toUpperCase()) {
    dataGaps.push('Sport filter does not match selected league sport — showing league data anyway.')
  }

  const prLce = await resolveNormalizedLeagueContext({
    userId: input.userId,
    leagueId: input.leagueId.trim(),
  })

  const weekResolved =
    typeof input.week === 'number' && Number.isFinite(input.week) && input.week > 0
      ? Math.floor(input.week)
      : prLce.ok
        ? prLce.context.matchupPeriod.currentPeriod
        : 1

  let raw: PowerRankingsOutput | null = null
  let engine: PowerRankingsDashboardResult['engine'] = 'league_team_fallback'
  let projectionTruth: ProjectionTruthSource = 'standings_only'

  const sleeperKey =
    leagueRow.platform?.toLowerCase() === 'sleeper' && leagueRow.platformLeagueId?.trim()
      ? leagueRow.platformLeagueId.trim()
      : null

  if (sleeperKey) {
    try {
      raw = await computePowerRankings(sleeperKey, weekResolved)
      if (raw) {
        engine = 'sleeper_v2'
        projectionTruth = 'sleeper_engine'
      }
    } catch (e) {
      console.warn('[power-rankings-dashboard] computePowerRankings failed', e)
      dataGaps.push('Sleeper rankings engine failed this run — trying AllFantasy projection path.')
    }
  }

  if (!raw && prLce.ok) {
    const af = await buildAfLeaguePowerRankingsOutput({
      leagueId: input.leagueId.trim(),
      leagueName: leagueRow.name ?? 'League',
      season: leagueRow.season,
      week: weekResolved,
      sport,
      leagueSport: leagueRow.sport,
      scoring: prLce.context.scoring,
      includeProjectionLayer: input.toggles.includeProjections !== false,
    })
    if (af) {
      raw = af.output
      engine = 'af_projection_truth'
      projectionTruth = input.toggles.includeProjections !== false ? 'af_normalized' : 'standings_only'
      engineNotes.push(...af.notes)
      dataGaps.push(...af.notes)
    }
  }

  if (!raw) {
    raw = await fallbackRankingsFromDbTeams(input.leagueId.trim(), weekResolved)
    engine = 'league_team_fallback'
    projectionTruth = 'standings_only'
    if (sleeperKey) {
      dataGaps.push('Using standings-only fallback — enable imports or check Sleeper connectivity.')
    }
  }

  if (!raw || raw.teams.length === 0) {
    return {
      ok: false,
      error: 'No team or standings data for this league yet. Sync your league or check imports.',
      code: 'VALIDATION',
    }
  }

  const byLookup = buildTeamLookup(leagueRow.teams)
  const currentUserTeam = leagueRow.teams.find((t) => t.claimedByUserId === input.userId)

  if (input.teamContext === 'division') {
    dataGaps.push('Division filter: showing full league until division mapping is synced for this league.')
  }

  let teamsWorking = [...raw.teams].map((t) => ({ ...t }))
  teamsWorking.sort((a, b) => modeSortScore(b, input.rankingMode) - modeSortScore(a, input.rankingMode))
  teamsWorking = teamsWorking.map((t, i) => ({ ...t, rank: i + 1 }))

  const teamCount = teamsWorking.length
  const playoffTeams = prLce.ok ? prLce.context.playoff.playoffTeams : null

  const rosterStrengthSorted = [...teamsWorking]
    .map((t) => t.rosterStrengthScore)
    .filter((s): s is number => typeof s === 'number' && Number.isFinite(s))
    .sort((a, b) => a - b)
  const rosterStrengthPctFor = (score: number): number | null => {
    if (!Number.isFinite(score) || rosterStrengthSorted.length === 0) return null
    const below = rosterStrengthSorted.filter((s) => s < score).length
    return Math.round((below / rosterStrengthSorted.length) * 100)
  }

  const enriched: EnrichedTeamRow[] = teamsWorking.map((team) => {
    const lt = findLeagueTeam(byLookup, team)
    const teamName = lt?.teamName?.trim() || team.displayName || lt?.ownerName || 'Team'
    const avatarUrl = lt?.avatarUrl ?? null
    const externalId = lt?.externalId ?? String(team.rosterId)
    const isCurrentUser = !!lt && currentUserTeam != null && lt.id === currentUserTeam.id
    const row = enrichRow(
      team,
      { teamName, avatarUrl, externalId, isCurrentUser, teamCount, playoffTeams },
      input.rankingMode,
      projectionTruth,
      input.toggles.includeProjections,
    )
    const factors = buildContenderFactors(team, rosterStrengthPctFor(team.rosterStrengthScore))
    const refined = refineContenderSignal(row.contenderSignal, factors)
    return { ...row, contenderFactors: factors, contenderSignal: refined }
  })

  let filtered = enriched
  if (input.teamContext === 'my_team') {
    filtered = enriched.filter((t) => t.isCurrentUser)
  }
  if (input.teamContext === 'playoff_teams') {
    const cut = Math.max(1, Math.ceil(teamCount * 0.5))
    filtered = enriched.filter((t) => t.rank <= cut)
  }
  if (input.teamContext === 'bubble') {
    const low = Math.ceil(teamCount * 0.35)
    const high = Math.ceil(teamCount * 0.65)
    filtered = enriched.filter((t) => t.rank >= low && t.rank <= high)
  }
  if (input.teamContext === 'bottom') {
    filtered = enriched.filter((t) => t.rank > Math.floor(teamCount * 0.65))
  }
  if (input.teamContext === 'specific_team' && input.specificTeamExternalId) {
    filtered = enriched.filter((t) => t.externalId === input.specificTeamExternalId)
  }

  if (!input.toggles.includeProjections) {
    dataGaps.push('Projections de-emphasized in this view (toggle off).')
  }
  if (!input.toggles.includeScheduleStrength) {
    dataGaps.push('Schedule strength narrative uses lighter SOS weight when toggled off.')
  }
  if (input.rankingMode === 'playoff_odds' || input.rankingMode === 'championship_odds') {
    dataGaps.push(
      'Playoff/championship views use standings rank vs configured playoff field — not sportsbook odds.',
    )
  }

  const aggregateConfidence = Math.round(
    clamp(enriched.reduce((s, t) => s + t.rowConfidence, 0) / Math.max(1, enriched.length), 18, 96),
  )

  const leagueEnvelope = await buildAiToolPayload({
    userId: input.userId,
    tool: 'power_rankings',
    mode: 'league',
    league: {
      leagueId: input.leagueId.trim(),
      leagueName: leagueRow.name,
      sport: String(sport),
    },
    data: {
      engine,
      projectionTruth,
      rankingMode: input.rankingMode,
      timeWindow: input.timeWindow,
      teamContext: input.teamContext,
      toggles: input.toggles,
      scoringSummary: prLce.ok
        ? {
            model: prLce.context.scoring.scoringModel,
            receptionFormat: prLce.context.scoring.labels.receptionFormat,
            superflex: prLce.context.scoring.labels.isSuperflex,
            tePremiumExtra: prLce.context.scoring.labels.tePremiumExtra,
          }
        : null,
      matchupPeriod: prLce.ok ? prLce.context.matchupPeriod : null,
      playoffContext: prLce.ok ? prLce.context.playoff : null,
      waiverContext: prLce.ok ? prLce.context.waiver : null,
      standingsHighlights: filtered.slice(0, 14).map((t) => ({
        rank: t.rank,
        team: t.teamName,
        powerScore: t.powerScore,
        record: t.record,
        pointsFor: t.pointsFor,
        pointsAgainst: t.pointsAgainst,
        momentum: t.momentumLabel,
        recentForm: t.recentPerformanceScore,
        rosterStrength: t.rosterStrengthScore,
        projectionStrength: t.projectionStrengthScore,
        sos: t.strengthOfSchedule,
        snippet: t.snippet,
        playoffField: t.playoffFieldStatus,
        contenderSignal: t.contenderSignal,
      })),
    },
    enrichTimeFromLeagueId: input.leagueId.trim(),
    includeTeamContext: true,
    includeStrategicCoaching: true,
  })

  const chimmyBase: Record<string, unknown> = {
    tool: 'power_rankings',
    leagueContextEngine: prLce.ok ? prLce.context : null,
    leagueId: input.leagueId,
    leagueName: leagueRow.name,
    sport,
    rankingMode: input.rankingMode,
    timeWindow: input.timeWindow,
    teamContext: input.teamContext,
    toggles: input.toggles,
    engine,
    projectionTruth,
    season: raw.season,
    week: raw.week,
    teams: filtered.map((t) => ({
      rank: t.rank,
      name: t.teamName,
      powerScore: t.powerScore,
      record: t.record,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      momentum: t.momentumLabel,
      tierLabel: t.tierLabel,
      snippet: t.snippet,
      playoffFieldStatus: t.playoffFieldStatus,
      contenderSignal: t.contenderSignal,
      breakdown: t.powerScoreBreakdown,
    })),
    dataGaps,
    engineNotes,
  }

  const chimmyPayload = attachIntelligenceToChimmyPayload(chimmyBase, leagueEnvelope)

  let aiNarrative: string | null = null
  if (!input.skipAi) {
    try {
      const res = await openaiChatText({
        messages: [
          {
            role: 'system',
            content:
              'You are Chimmy for AllFantasy. Write 4–7 sentences on league power rankings. Use ONLY the JSON facts. Never invent injuries, trades, or betting odds. Playoff field status is from standings vs league playoff settings, not sportsbooks. No markdown.',
          },
          { role: 'user', content: JSON.stringify(chimmyPayload).slice(0, 14000) },
        ],
        temperature: 0.2,
        maxTokens: 520,
        skipCache: true,
      })
      if (res.ok) aiNarrative = res.text.trim() || null
    } catch {
      aiNarrative = null
    }
  }

  const scoringSummary = prLce.ok
    ? {
        scoringModel: prLce.context.scoring.scoringModel,
        receptionFormat: prLce.context.scoring.labels.receptionFormat,
        superflex: prLce.context.scoring.labels.isSuperflex,
      }
    : null

  const degraded =
    (dataGaps.length > 2 && engine === 'league_team_fallback') ||
    (projectionTruth === 'standings_only' && input.toggles.includeProjections)

  const sourceFlags: PowerRankingsSourceFlags = {
    standingsReady: raw.teams.length > 0,
    rostersReady: enriched.some((t) => (t.rosterStrengthScore ?? 0) > 0),
    projectionLayerReady:
      input.toggles.includeProjections &&
      (projectionTruth === 'sleeper_engine' || projectionTruth === 'af_normalized') &&
      enriched.some((t) => (t.projectionStrengthScore ?? 0) > 0),
    injuryNewsLayerReady: prLce.ok && input.toggles.includeInjuries,
    priorSnapshotReady: enriched.some((t) => t.rankDelta != null && t.rankDelta !== 0),
    leagueScoringApplied: prLce.ok,
    aiEnvelopeReady: true,
  }

  const result: PowerRankingsDashboardResult = {
    ok: true,
    analysisScope: 'league',
    engine,
    projectionTruth,
    leagueName: leagueRow.name,
    sport: String(leagueRow.sport),
    season: raw.season,
    week: raw.week,
    rankingMode: input.rankingMode,
    teams: filtered,
    raw,
    aiNarrative,
    chimmyPayload,
    dataGaps,
    degraded,
    computedAt: new Date().toISOString(),
    scoringSummary,
    timeContext: leagueEnvelope.time,
    aggregateConfidence,
    engineNotes,
    sourceFlags,
  }

  try {
    const teamsPayload = enriched.map((t) => ({
      rank: t.rank,
      teamName: t.teamName,
      externalId: t.externalId,
      powerScore: t.powerScore,
      rankDelta: t.rankDelta,
      prevRank: t.prevRank,
      momentumLabel: t.momentumLabel,
      tierLabel: t.tierLabel,
      rankThird: t.rankThird,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      record: t.record,
      isCurrentUser: t.isCurrentUser,
      playoffFieldStatus: t.playoffFieldStatus,
      contenderSignal: t.contenderSignal,
    }))
    await prisma.leaguePowerRankingSnapshot.upsert({
      where: {
        leagueId_season_week_rankingMode: {
          leagueId: input.leagueId.trim(),
          season: leagueRow.season,
          week: raw.week,
          rankingMode: input.rankingMode,
        },
      },
      create: {
        leagueId: input.leagueId.trim(),
        season: leagueRow.season,
        week: raw.week,
        rankingMode: input.rankingMode,
        engine,
        teams: teamsPayload,
      },
      update: {
        engine,
        teams: teamsPayload,
        computedAt: new Date(),
      },
    })
  } catch (e) {
    console.warn('[power-rankings-dashboard] snapshot upsert failed', e)
  }

  return result
}
