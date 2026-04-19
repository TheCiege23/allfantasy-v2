import 'server-only'

import type { LeagueSport, SportsPlayerRecord } from '@prisma/client'
import { effectiveFantasyPoints } from '@/lib/ai-tools-start-sit/effectiveProjection'
import type { NormalizedScoringRules } from '@/lib/league-context-engine/types'
import { prisma } from '@/lib/prisma'
import { resolveNormalizedPlayerSportsProfiles } from '@/lib/sports-data-normalization'
import type { PowerRankingsOutput, PowerRankingTeam } from '@/lib/league-power-rankings/types'
import type { SupportedSport } from '@/lib/sport-scope'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'

const FORMULA = {
  recordWeight: 0.35,
  recentPerformanceWeight: 0.25,
  rosterStrengthWeight: 0.25,
  projectionStrengthWeight: 0.15,
} as const

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function percentileRank(value: number, values: number[]): number {
  if (values.length < 2) return 50
  const sorted = [...values].sort((a, b) => a - b)
  let below = 0
  let equal = 0
  for (const v of sorted) {
    if (v < value) below += 1
    else if (v === value) equal += 1
  }
  return clamp(((below + 0.5 * equal) / sorted.length) * 100, 0, 100)
}

async function resolveRecord(sport: string, rawId: string): Promise<SportsPlayerRecord | null> {
  const direct = await prisma.sportsPlayerRecord.findUnique({ where: { id: rawId } })
  if (direct) return direct
  const sp = await prisma.sportsPlayer.findFirst({
    where: { sport, OR: [{ externalId: rawId }, { sleeperId: rawId }, { id: rawId }] },
    select: { name: true },
  })
  if (!sp) return null
  return prisma.sportsPlayerRecord.findFirst({
    where: { sport, name: { equals: sp.name, mode: 'insensitive' } },
  })
}

function rosterIdNumeric(externalId: string, fallback: number): number {
  const n = Number.parseInt(String(externalId).replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/**
 * AllFantasy-native + imported leagues: power rankings from DB standings, `team_performances`
 * (recent form + SOS), and the same normalized projection stack as Start/Sit / Trade tools.
 */
export async function buildAfLeaguePowerRankingsOutput(args: {
  leagueId: string
  leagueName: string
  season: number
  week: number
  sport: SupportedSport
  leagueSport: LeagueSport
  scoring: NormalizedScoringRules
  includeProjectionLayer: boolean
}): Promise<{ output: PowerRankingsOutput; notes: string[] } | null> {
  const notes: string[] = []

  const league = await prisma.league.findFirst({
    where: { id: args.leagueId },
    include: { teams: true },
  })
  if (!league?.teams?.length) return null

  const teams = league.teams
  const nameToTeam = new Map<string, (typeof teams)[0]>()
  for (const t of teams) {
    if (t.teamName?.trim()) nameToTeam.set(t.teamName.trim().toLowerCase(), t)
  }

  const rosters = await prisma.roster.findMany({
    where: { leagueId: args.leagueId },
    select: { platformUserId: true, playerData: true },
  })
  const rosterByOwner = new Map<string, (typeof rosters)[0]>()
  for (const r of rosters) {
    if (r.platformUserId) rosterByOwner.set(r.platformUserId.trim(), r)
  }

  const teamIds = teams.map((t) => t.id)
  const perfs = await prisma.teamPerformance.findMany({
    where: { teamId: { in: teamIds }, season: args.season },
    select: { teamId: true, week: true, points: true, opponent: true },
    orderBy: [{ week: 'asc' }],
  })

  const weeklyByTeam = new Map<string, number[]>()
  for (const p of perfs) {
    const list = weeklyByTeam.get(p.teamId) ?? []
    list.push(p.points)
    weeklyByTeam.set(p.teamId, list)
  }

  const recentAvgs: number[] = []
  const recentByTeamId = new Map<string, number>()
  for (const t of teams) {
    const wk = weeklyByTeam.get(t.id) ?? []
    const last4 = wk.slice(-4).filter((x) => Number.isFinite(x))
    const ra = average(last4)
    recentByTeamId.set(t.id, ra)
    recentAvgs.push(ra)
  }

  const winPctByTeamId = new Map<string, number>()
  for (const t of teams) {
    const g = Math.max(1, t.wins + t.losses + t.ties)
    winPctByTeamId.set(t.id, t.wins / g)
  }

  /** Opponents' win% averaged per game (0.5 if opponent not resolved). */
  const sosByTeamId = new Map<string, number>()
  for (const t of teams) {
    const mine = perfs.filter((p) => p.teamId === t.id)
    if (mine.length === 0) {
      sosByTeamId.set(t.id, 0.5)
      continue
    }
    let acc = 0
    let n = 0
    for (const row of mine) {
      const label = row.opponent?.trim()
      if (!label) {
        acc += 0.5
        n += 1
        continue
      }
      const opp =
        nameToTeam.get(label.toLowerCase()) ??
        [...nameToTeam.values()].find((tm) => label.toLowerCase().includes((tm.teamName ?? '').toLowerCase()))
      if (opp) {
        acc += winPctByTeamId.get(opp.id) ?? 0.5
      } else {
        acc += 0.5
      }
      n += 1
    }
    sosByTeamId.set(t.id, n > 0 ? acc / n : 0.5)
  }

  type TeamWork = {
    team: (typeof teams)[0]
    recordScore: number
    recentScore: number
    rosterStrengthScore: number
    projectionStrengthScore: number
    sos: number
    powerScore: number
    breakdown: PowerRankingTeam['powerScoreBreakdown']
    rosterProjSum: number
  }

  const baseRows: Array<{
    team: (typeof teams)[0]
    recordScore: number
    recentScore: number
    sos: number
    rosterProjSum: number
    projFromDb: number
  }> = []

  for (const t of teams) {
    const g = Math.max(1, t.wins + t.losses + t.ties)
    const winPct = t.wins / g
    const pf = t.pointsFor
    const pa = t.pointsAgainst
    const diffPg = (pf - pa) / g
    const sos = clamp(sosByTeamId.get(t.id) ?? 0.5, 0, 1)
    const sosMultiplier = 1 + (sos - 0.5) * 0.28
    const recordRaw = clamp(winPct * 100 + clamp(diffPg / 3, -10, 10), 0, 100)
    const recordScore = clamp(recordRaw * sosMultiplier, 0, 100)

    const ra = recentByTeamId.get(t.id) ?? 0
    const recentScore = percentileRank(ra, recentAvgs)

    let rosterProjSum = 0
    const ownerPid = t.platformUserId?.trim()
    const roster = ownerPid ? rosterByOwner.get(ownerPid) : undefined
    if (args.includeProjectionLayer && roster?.playerData) {
      const ids = getRosterPlayerIds(roster.playerData).slice(0, 36)
      const pending: Array<{ rawId: string; row: SportsPlayerRecord }> = []
      for (const rawId of ids) {
        const row = await resolveRecord(String(args.leagueSport), rawId)
        if (row) pending.push({ rawId, row })
      }
      if (pending.length > 0) {
        try {
          const batch = await resolveNormalizedPlayerSportsProfiles({
            prisma,
            sport: args.sport,
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
            leagueScoring: args.scoring,
          })
          const pts = batch.players
            .map((prof) => effectiveFantasyPoints(prof))
            .filter((x): x is number => x != null && Number.isFinite(x))
            .sort((a, b) => b - a)
          const top = pts.slice(0, 9)
          rosterProjSum = top.reduce((s, x) => s + x, 0)
        } catch {
          notes.push(`Projection batch failed for ${t.teamName ?? t.externalId}.`)
        }
      }
    }

    const projFromDb =
      t.projectedWins != null ? clamp((t.projectedWins / g) * 100, 0, 100) : recordScore * 0.92

    baseRows.push({ team: t, recordScore, recentScore, sos, rosterProjSum, projFromDb })
  }

  const maxProj = Math.max(0, ...baseRows.map((r) => r.rosterProjSum))

  const working: TeamWork[] = baseRows.map((row) => {
    const t = row.team
    const g = Math.max(1, t.wins + t.losses + t.ties)
    let rosterStrengthScore = clamp(t.aiPowerScore ?? row.recordScore * 0.96, 0, 100)
    let projectionStrengthScore = row.projFromDb

    if (args.includeProjectionLayer && maxProj > 0 && row.rosterProjSum > 0) {
      rosterStrengthScore = clamp((row.rosterProjSum / maxProj) * 100, 0, 100)
      projectionStrengthScore = clamp(0.55 * (row.rosterProjSum / maxProj) * 100 + 0.45 * row.projFromDb, 0, 100)
    }

    const weightedScore =
      FORMULA.recordWeight * row.recordScore +
      FORMULA.recentPerformanceWeight * row.recentScore +
      FORMULA.rosterStrengthWeight * rosterStrengthScore +
      FORMULA.projectionStrengthWeight * projectionStrengthScore

    return {
      team: t,
      recordScore: row.recordScore,
      recentScore: row.recentScore,
      rosterStrengthScore,
      projectionStrengthScore,
      sos: row.sos,
      powerScore: Math.round(weightedScore * 10) / 10,
      breakdown: {
        record: Math.round(row.recordScore * 10) / 10,
        recentPerformance: Math.round(row.recentScore * 10) / 10,
        rosterStrength: Math.round(rosterStrengthScore * 10) / 10,
        projectionStrength: Math.round(projectionStrengthScore * 10) / 10,
        weightedScore: Math.round(weightedScore * 10) / 10,
      },
      rosterProjSum: row.rosterProjSum,
    }
  })

  working.sort((a, b) => {
    if (b.powerScore !== a.powerScore) return b.powerScore - a.powerScore
    return b.team.pointsFor - a.team.pointsFor
  })

  const outTeams: PowerRankingTeam[] = working.map((w, index) => {
    const rank = index + 1
    const t = w.team
    const prev = t.currentRank ?? null
    return {
      rosterId: rosterIdNumeric(t.externalId, rank + 100),
      ownerId: t.platformUserId ?? t.claimedByUserId ?? t.externalId,
      displayName: t.teamName,
      username: t.ownerName,
      rank,
      prevRank: prev,
      rankDelta: prev != null ? prev - rank : null,
      record: { wins: t.wins, losses: t.losses, ties: t.ties },
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      strengthOfSchedule: w.sos,
      recentPerformanceScore: Math.round(w.recentScore * 10) / 10,
      rosterStrengthScore: Math.round(w.rosterStrengthScore * 10) / 10,
      projectionStrengthScore: Math.round(w.projectionStrengthScore * 10) / 10,
      rosterValue: w.rosterProjSum,
      expectedWins: t.projectedWins ?? t.wins,
      composite: w.powerScore,
      powerScore: w.powerScore,
      powerScoreBreakdown: w.breakdown,
    }
  })

  if (perfs.length === 0) {
    notes.push('No team_performances rows — recent form and SOS use season PF/PA only.')
  }

  return {
    output: {
      leagueId: args.leagueId,
      leagueName: args.leagueName,
      season: String(args.season),
      week: args.week,
      teams: outTeams,
      computedAt: Date.now(),
      formula: {
        recordWeight: FORMULA.recordWeight,
        recentPerformanceWeight: FORMULA.recentPerformanceWeight,
        rosterStrengthWeight: FORMULA.rosterStrengthWeight,
        projectionStrengthWeight: FORMULA.projectionStrengthWeight,
      },
    },
    notes,
  }
}
