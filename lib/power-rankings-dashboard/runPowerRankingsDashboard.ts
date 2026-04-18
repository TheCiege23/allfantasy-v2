import 'server-only'

import type { LeagueTeam } from '@prisma/client'
import { computePowerRankings } from '@/lib/league-power-rankings'
import type { PowerRankingTeam, PowerRankingsOutput } from '@/lib/league-power-rankings/types'
import { assertLeagueMember } from '@/lib/league/league-access'
import { openaiChatText } from '@/lib/openai-client'
import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type {
  EnrichedTeamRow,
  PowerRankingsDashboardInput,
  PowerRankingsDashboardOutput,
  PowerRankingsDashboardResult,
  RankingModeId,
} from './types'

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function tierForRank(rank: number, teamCount: number): string {
  if (teamCount <= 1) return 'Playoff Core'
  const pct = rank / teamCount
  if (pct <= 0.125) return 'Elite Contenders'
  if (pct <= 0.35) return 'Strong Contenders'
  if (pct <= 0.55) return 'Playoff Core'
  if (pct <= 0.75) return 'Bubble / Volatile Middle'
  if (pct <= 0.9) return 'Rebuilding / Re-tooling'
  return 'Long-Term Rise / Depth'
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
  parts.push(`SOS ${(team.strengthOfSchedule * 100).toFixed(0)}% scale`)
  if (mode === 'weekly_power') parts.push(`Recent form score ${team.recentPerformanceScore.toFixed(0)}`)
  if (mode === 'rest_of_season') parts.push(`Projection strength ${team.projectionStrengthScore.toFixed(0)}`)
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

function enrichRow(
  team: PowerRankingTeam,
  meta: {
    teamName: string
    avatarUrl: string | null
    externalId: string | null
    isCurrentUser: boolean
    teamCount: number
  },
  mode: RankingModeId,
): EnrichedTeamRow {
  return {
    ...team,
    teamName: meta.teamName,
    avatarUrl: meta.avatarUrl,
    externalId: meta.externalId,
    isCurrentUser: meta.isCurrentUser,
    tier: tierForRank(team.rank, meta.teamCount),
    momentumLabel: momentumFrom(team),
    snippet: snippetFor(team, mode),
    playoffOddsPct: mode === 'playoff_odds' || mode === 'championship_odds' ? clamp(team.projectionStrengthScore, 5, 95) : null,
    championshipOddsPct: mode === 'championship_odds' ? clamp(team.projectionStrengthScore * 0.35, 2, 60) : null,
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
  if (!input.leagueId?.trim()) {
    const scopeSport =
      input.sportFilter === 'ALL' ? null : normalizeToSupportedSport(String(input.sportFilter))
    return {
      ok: true,
      analysisScope: 'none',
      engine: 'none',
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
      chimmyPayload: {
        tool: 'power_rankings',
        scope: 'none',
        sportFilter: input.sportFilter,
        rankingMode: input.rankingMode,
        timeWindow: input.timeWindow,
        note: 'no_league_selected',
      },
      dataGaps: [
        'No league selected — power rankings require a league with synced team data (standings / roster sync).',
      ],
      degraded: true,
      computedAt: new Date().toISOString(),
    }
  }

  const access = await assertLeagueMember(input.leagueId.trim(), input.userId)
  if (!access.ok) {
    return { ok: false, error: 'League not found or access denied', code: 'FORBIDDEN' }
  }

  const leagueRow = await prisma.league.findFirst({
    where: { id: input.leagueId.trim() },
    include: {
      teams: true,
    },
  })
  if (!leagueRow) {
    return { ok: false, error: 'League not found', code: 'FORBIDDEN' }
  }

  const sport = normalizeToSupportedSport(String(leagueRow.sport))
  if (input.sportFilter !== 'ALL' && input.sportFilter.toUpperCase() !== String(leagueRow.sport).toUpperCase()) {
    dataGaps.push('Sport filter does not match selected league sport — showing league data anyway.')
  }

  let raw: PowerRankingsOutput | null = null
  let engine: 'sleeper_v2' | 'league_team_fallback' = 'league_team_fallback'

  const sleeperKey =
    leagueRow.platform?.toLowerCase() === 'sleeper' && leagueRow.platformLeagueId?.trim()
      ? leagueRow.platformLeagueId.trim()
      : null

  if (sleeperKey) {
    try {
      raw = await computePowerRankings(sleeperKey, input.week ?? undefined)
      if (raw) engine = 'sleeper_v2'
    } catch (e) {
      console.warn('[power-rankings-dashboard] computePowerRankings failed', e)
      dataGaps.push('Sleeper power engine unavailable — using database team standings.')
    }
  } else {
    dataGaps.push('Non-Sleeper or missing platform id — rankings use synced league_teams standings only.')
  }

  if (!raw) {
    raw = await fallbackRankingsFromDbTeams(input.leagueId.trim(), input.week ?? undefined)
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
    dataGaps.push('Division filter: use a league with divisions synced — showing full league until division mapping is available.')
  }

  let teamsWorking = [...raw.teams].map((t) => ({ ...t }))
  teamsWorking.sort((a, b) => modeSortScore(b, input.rankingMode) - modeSortScore(a, input.rankingMode))
  teamsWorking = teamsWorking.map((t, i) => ({ ...t, rank: i + 1 }))

  const teamCount = teamsWorking.length
  const enriched: EnrichedTeamRow[] = teamsWorking.map((team) => {
    const lt = findLeagueTeam(byLookup, team)
    const teamName = lt?.teamName?.trim() || team.displayName || lt?.ownerName || 'Team'
    const avatarUrl = lt?.avatarUrl ?? null
    const externalId = lt?.externalId ?? String(team.rosterId)
    const isCurrentUser = !!lt && currentUserTeam != null && lt.id === currentUserTeam.id
    return enrichRow(
      team,
      { teamName, avatarUrl, externalId, isCurrentUser, teamCount },
      input.rankingMode,
    )
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
    dataGaps.push('Schedule strength weighting reduced in narrative.')
  }
  if (input.rankingMode === 'playoff_odds' || input.rankingMode === 'championship_odds') {
    dataGaps.push('Playoff/championship percentages are heuristic projections from power components, not sportsbook odds.')
  }

  const chimmyPayload: Record<string, unknown> = {
    tool: 'power_rankings',
    leagueId: input.leagueId,
    leagueName: leagueRow.name,
    sport,
    rankingMode: input.rankingMode,
    timeWindow: input.timeWindow,
    teamContext: input.teamContext,
    toggles: input.toggles,
    engine,
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
      tier: t.tier,
      snippet: t.snippet,
      breakdown: t.powerScoreBreakdown,
    })),
    dataGaps,
  }

  let aiNarrative: string | null = null
  if (!input.skipAi) {
    try {
      const res = await openaiChatText({
        messages: [
          {
            role: 'system',
            content:
              'You are Chimmy for AllFantasy. Write 4–6 sentences on league power rankings. Use ONLY the JSON facts. Never invent injuries, trades, or records. If something is heuristic or missing, say so. No markdown.',
          },
          { role: 'user', content: JSON.stringify(chimmyPayload).slice(0, 14000) },
        ],
        temperature: 0.2,
        maxTokens: 500,
        skipCache: true,
      })
      if (res.ok) aiNarrative = res.text.trim() || null
    } catch {
      aiNarrative = null
    }
  }

  const result: PowerRankingsDashboardResult = {
    ok: true,
    analysisScope: 'league',
    engine,
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
    degraded: dataGaps.length > 0,
    computedAt: new Date().toISOString(),
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
      tier: t.tier,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      record: t.record,
      isCurrentUser: t.isCurrentUser,
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
