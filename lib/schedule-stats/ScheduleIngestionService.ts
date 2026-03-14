/**
 * Schedule ingestion: create/update GameSchedule records by sport/season/week.
 * Used by stat pipeline and matchup engine to resolve games for a period.
 */
import { prisma } from '@/lib/prisma'
import type { LeagueSport } from '@prisma/client'
import { leagueSportToSportType } from '@/lib/multi-sport/SportConfigResolver'
import type { SportType } from '@/lib/scoring-defaults/types'

export interface GameScheduleInput {
  sportType: SportType | string
  season: number
  weekOrRound: number
  externalId: string
  homeTeamId?: string | null
  awayTeamId?: string | null
  homeTeam?: string | null
  awayTeam?: string | null
  startTime?: Date | null
  status?: string
}

/**
 * Upsert a single game into GameSchedule.
 */
export async function upsertGameSchedule(input: GameScheduleInput): Promise<string> {
  const sport = (input.sportType as string).toUpperCase()
  const row = await prisma.gameSchedule.upsert({
    where: {
      uniq_game_schedule_sport_season_week_external: {
        sportType: sport,
        season: input.season,
        weekOrRound: input.weekOrRound,
        externalId: input.externalId,
      },
    },
    update: {
      homeTeamId: input.homeTeamId ?? undefined,
      awayTeamId: input.awayTeamId ?? undefined,
      homeTeam: input.homeTeam ?? undefined,
      awayTeam: input.awayTeam ?? undefined,
      startTime: input.startTime ?? undefined,
      status: input.status ?? 'scheduled',
      updatedAt: new Date(),
    },
    create: {
      sportType: sport,
      season: input.season,
      weekOrRound: input.weekOrRound,
      externalId: input.externalId,
      homeTeamId: input.homeTeamId ?? null,
      awayTeamId: input.awayTeamId ?? null,
      homeTeam: input.homeTeam ?? null,
      awayTeam: input.awayTeam ?? null,
      startTime: input.startTime ?? null,
      status: input.status ?? 'scheduled',
    },
  })
  return row.id
}

/**
 * List games for a sport/season/week (or all weeks in season).
 */
export async function listGameSchedules(
  sportType: SportType | LeagueSport | string,
  season: number,
  weekOrRound?: number
): Promise<{ id: string; externalId: string; homeTeam: string | null; awayTeam: string | null; startTime: Date | null; status: string }[]> {
  const sport = typeof sportType === 'string'
    ? (sportType.toUpperCase() as SportType)
    : leagueSportToSportType(sportType)
  const where: { sportType: string; season: number; weekOrRound?: number } = {
    sportType: sport,
    season,
  }
  if (weekOrRound != null) where.weekOrRound = weekOrRound
  const rows = await prisma.gameSchedule.findMany({
    where,
    orderBy: [{ weekOrRound: 'asc' }, { startTime: 'asc' }],
    select: { id: true, externalId: true, homeTeam: true, awayTeam: true, startTime: true, status: true },
  })
  return rows
}
