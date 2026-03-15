/**
 * After creating a League from Sleeper import, populates LeagueTeam, Roster, and optionally
 * TeamPerformance from NormalizedImportResult. Uses imported data; no sport-defaults override.
 */

import { prisma } from '@/lib/prisma'
import type { NormalizedImportResult } from '../types'

export interface SleeperLeagueBootstrapResult {
  leagueTeamsCreated: number
  rostersCreated: number
  teamPerformancesCreated: number
}

/**
 * Create LeagueTeam and Roster records for each normalized roster; optionally create
 * TeamPerformance from schedule. Call after League record exists.
 */
export async function bootstrapLeagueFromSleeperImport(
  leagueId: string,
  normalized: NormalizedImportResult
): Promise<SleeperLeagueBootstrapResult> {
  const standingsByTeam = new Map(
    normalized.standings.map((s) => [s.source_team_id, s])
  )
  const season = normalized.league.season ?? new Date().getFullYear()

  let leagueTeamsCreated = 0
  let rostersCreated = 0

  for (const r of normalized.rosters) {
    const standing = standingsByTeam.get(r.source_team_id)
    const rank = standing?.rank ?? null
    const pointsAgainst = r.points_against ?? (standing?.points_against ?? 0)

    await prisma.leagueTeam.upsert({
      where: {
        leagueId_externalId: { leagueId, externalId: r.source_team_id },
      },
      create: {
        leagueId,
        externalId: r.source_team_id,
        ownerName: r.owner_name,
        teamName: r.team_name || r.owner_name,
        avatarUrl: r.avatar_url ?? null,
        wins: r.wins,
        losses: r.losses,
        ties: r.ties,
        pointsFor: r.points_for,
        pointsAgainst,
        currentRank: rank,
      },
      update: {
        ownerName: r.owner_name,
        teamName: r.team_name || r.owner_name,
        avatarUrl: r.avatar_url ?? null,
        wins: r.wins,
        losses: r.losses,
        ties: r.ties,
        pointsFor: r.points_for,
        pointsAgainst,
        currentRank: rank,
      },
    })
    leagueTeamsCreated++

    const playerData = {
      players: r.player_ids,
      starters: r.starter_ids,
      reserve: r.reserve_ids ?? [],
      taxi: r.taxi_ids ?? [],
      source_team_id: r.source_team_id,
      imported_at: normalized.source.imported_at,
    }

    await prisma.roster.upsert({
      where: {
        leagueId_platformUserId: { leagueId, platformUserId: r.source_manager_id },
      },
      create: {
        leagueId,
        platformUserId: r.source_manager_id,
        playerData: playerData as any,
        faabRemaining: r.faab_remaining ?? null,
        waiverPriority: r.waiver_priority ?? null,
      },
      update: {
        playerData: playerData as any,
        faabRemaining: r.faab_remaining ?? null,
        waiverPriority: r.waiver_priority ?? null,
      },
    })
    rostersCreated++
  }

  let teamPerformancesCreated = 0
  const teamIdByExternalId = new Map<string, string>()
  const teams = await prisma.leagueTeam.findMany({
    where: { leagueId },
    select: { id: true, externalId: true },
  })
  teams.forEach((t) => teamIdByExternalId.set(t.externalId, t.id))

  for (const weekData of normalized.schedule) {
    for (const mu of weekData.matchups) {
      const tid1 = teamIdByExternalId.get(mu.roster_id_1)
      const tid2 = teamIdByExternalId.get(mu.roster_id_2)
      if (tid1 && mu.points_1 != null) {
        try {
          await prisma.teamPerformance.upsert({
            where: {
              teamId_season_week: {
                teamId: tid1,
                season,
                week: weekData.week,
              },
            },
            create: {
              teamId: tid1,
              week: weekData.week,
              season,
              points: mu.points_1,
              opponent: tid2 ?? undefined,
              result: mu.points_2 != null ? (mu.points_1 > mu.points_2 ? 'W' : mu.points_1 < mu.points_2 ? 'L' : 'T') : null,
            },
            update: {
              points: mu.points_1,
              opponent: tid2 ?? undefined,
              result: mu.points_2 != null ? (mu.points_1 > mu.points_2 ? 'W' : mu.points_1 < mu.points_2 ? 'L' : 'T') : undefined,
            },
          })
          teamPerformancesCreated++
        } catch {
          // ignore duplicate or constraint errors
        }
      }
      if (tid2 && mu.points_2 != null) {
        try {
          await prisma.teamPerformance.upsert({
            where: {
              teamId_season_week: {
                teamId: tid2,
                season,
                week: weekData.week,
              },
            },
            create: {
              teamId: tid2,
              week: weekData.week,
              season,
              points: mu.points_2,
              opponent: tid1 ?? undefined,
              result: mu.points_1 != null ? (mu.points_2 > mu.points_1 ? 'W' : mu.points_2 < mu.points_1 ? 'L' : 'T') : null,
            },
            update: {
              points: mu.points_2,
              opponent: tid1 ?? undefined,
              result: mu.points_1 != null ? (mu.points_2 > mu.points_1 ? 'W' : mu.points_2 < mu.points_1 ? 'L' : 'T') : undefined,
            },
          })
          teamPerformancesCreated++
        } catch {
          // ignore
        }
      }
    }
  }

  return { leagueTeamsCreated, rostersCreated, teamPerformancesCreated }
}
