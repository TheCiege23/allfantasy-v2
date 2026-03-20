/**
 * Multi-sport stat ingestion service for schedule/stats pipeline.
 * Handles ingestion jobs, payload normalization, and fantasy point pre-computation.
 */
import { prisma } from '@/lib/prisma'
import { normalizeStatPayload } from './StatNormalizationService'
import { computeFantasyPoints } from '@/lib/scoring-defaults/FantasyPointCalculator'
import type { PlayerStatsRecord } from '@/lib/scoring-defaults/types'
import { getLeagueScoringRules, getScoringTemplate } from '@/lib/multi-sport/ScoringTemplateResolver'
import { toSportType, type SportType } from '@/lib/multi-sport/sport-types'
import { upsertGameSchedule, type GameScheduleInput } from './ScheduleIngestionService'

export interface PlayerGameStatIngestInput {
  playerId: string
  gameId: string
  statPayload: Record<string, number>
}

export interface TeamGameStatIngestInput {
  teamId: string
  gameId: string
  statPayload: Record<string, number>
}

export interface IngestSportStatsInput {
  sportType: SportType | string
  season: number
  weekOrRound: number
  source: string
  leagueId?: string
  formatType?: string
  schedules?: GameScheduleInput[]
  playerStats?: PlayerGameStatIngestInput[]
  teamStats?: TeamGameStatIngestInput[]
}

export interface IngestSportStatsResult {
  jobId: string
  gameCount: number
  playerStatCount: number
  teamStatCount: number
}

async function resolveRulesForIngestion(
  sportType: SportType,
  leagueId?: string,
  formatType?: string
) {
  if (leagueId) {
    return getLeagueScoringRules(leagueId, sportType, formatType ?? 'standard')
  }
  const template = await getScoringTemplate(sportType, formatType ?? 'standard')
  return template.rules
}

export async function startStatIngestionJob(
  sportType: SportType | string,
  season: number,
  source: string,
  weekOrRound?: number
): Promise<string> {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  const job = await prisma.statIngestionJob.create({
    data: {
      sportType: sport,
      season,
      weekOrRound,
      source,
      status: 'running',
    },
    select: { id: true },
  })
  return job.id
}

export async function completeStatIngestionJob(
  jobId: string,
  updates: {
    status: 'completed' | 'failed'
    gameCount: number
    statCount: number
    errorMessage?: string
  }
): Promise<void> {
  await prisma.statIngestionJob.update({
    where: { id: jobId },
    data: {
      status: updates.status,
      gameCount: updates.gameCount,
      statCount: updates.statCount,
      errorMessage: updates.errorMessage ?? null,
      completedAt: new Date(),
    },
  })
}

/**
 * Ingest schedules and game stats for one sport/period.
 * Normalizes payload keys and pre-computes sport-aware fantasy points for fast reads.
 */
export async function ingestSportStats(
  input: IngestSportStatsInput
): Promise<IngestSportStatsResult> {
  const sport = toSportType(typeof input.sportType === 'string' ? input.sportType : input.sportType)
  const schedules = input.schedules ?? []
  const playerStats = input.playerStats ?? []
  const teamStats = input.teamStats ?? []
  const jobId = await startStatIngestionJob(sport, input.season, input.source, input.weekOrRound)

  try {
    const rules = await resolveRulesForIngestion(sport, input.leagueId, input.formatType)

    for (const game of schedules) {
      await upsertGameSchedule({
        ...game,
        sportType: sport,
        season: input.season,
        weekOrRound: input.weekOrRound,
      })
    }

    for (const row of playerStats) {
      const normalized = normalizeStatPayload(sport, row.statPayload)
      const fantasyPoints = computeFantasyPoints(normalized as PlayerStatsRecord, rules)

      await prisma.playerGameStat.upsert({
        where: {
          uniq_player_game_stat_player_sport_game: {
            playerId: row.playerId,
            sportType: sport,
            gameId: row.gameId,
          },
        },
        update: {
          season: input.season,
          weekOrRound: input.weekOrRound,
          statPayload: row.statPayload,
          normalizedStatMap: normalized,
          fantasyPoints,
          updatedAt: new Date(),
        },
        create: {
          playerId: row.playerId,
          sportType: sport,
          gameId: row.gameId,
          season: input.season,
          weekOrRound: input.weekOrRound,
          statPayload: row.statPayload,
          normalizedStatMap: normalized,
          fantasyPoints,
        },
      })
    }

    for (const row of teamStats) {
      await prisma.teamGameStat.upsert({
        where: {
          uniq_team_game_stat_sport_game_team: {
            sportType: sport,
            gameId: row.gameId,
            teamId: row.teamId,
          },
        },
        update: {
          season: input.season,
          weekOrRound: input.weekOrRound,
          statPayload: row.statPayload,
          updatedAt: new Date(),
        },
        create: {
          sportType: sport,
          gameId: row.gameId,
          teamId: row.teamId,
          season: input.season,
          weekOrRound: input.weekOrRound,
          statPayload: row.statPayload,
        },
      })
    }

    await completeStatIngestionJob(jobId, {
      status: 'completed',
      gameCount: schedules.length,
      statCount: playerStats.length + teamStats.length,
    })

    return {
      jobId,
      gameCount: schedules.length,
      playerStatCount: playerStats.length,
      teamStatCount: teamStats.length,
    }
  } catch (error) {
    await completeStatIngestionJob(jobId, {
      status: 'failed',
      gameCount: schedules.length,
      statCount: playerStats.length + teamStats.length,
      errorMessage: error instanceof Error ? error.message : 'Unknown stat ingestion error',
    })
    throw error
  }
}
