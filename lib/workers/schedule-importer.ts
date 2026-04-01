import 'server-only'

import { prisma } from '@/lib/prisma'
import { SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import { apiChain } from '@/lib/workers/api-chain'

const UPSERT_BATCH_SIZE = 100

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function currentSeason(): number {
  return new Date().getFullYear()
}

export async function runScheduleImporter(options?: {
  sports?: string[]
  season?: number
}): Promise<{ imported: number; sports: string[]; season: number }> {
  const season = options?.season ?? currentSeason()
  const sports = Array.from(
    new Set((options?.sports?.length ? options.sports : SUPPORTED_SPORTS).map((sport) => normalizeToSupportedSport(sport)))
  )
  let imported = 0

  for (const sport of sports) {
    const legacyGames = await prisma.sportsGame.findMany({
      where: { sport, season },
      orderBy: { startTime: 'asc' },
      take: 1000,
    })

    const legacyMap = new Map(
      legacyGames.map((row) => [
        `${normalizeTeamAbbrev(row.homeTeam) ?? row.homeTeam}:${normalizeTeamAbbrev(row.awayTeam) ?? row.awayTeam}:${row.startTime?.toISOString().slice(0, 10) ?? ''}`,
        row,
      ])
    )

    const response = await apiChain.fetch({
      sport,
      dataType: 'schedule',
      query: { season: String(season) },
    })
    const sourceGames = Array.isArray(response.data) && response.data.length > 0 ? response.data : legacyGames

    const rows = sourceGames.map((game: any) => {
      const homeTeam = normalizeTeamAbbrev(game.homeTeamAbbrev ?? game.homeTeam) ?? game.homeTeamAbbrev ?? game.homeTeam ?? 'TBD'
      const awayTeam = normalizeTeamAbbrev(game.awayTeamAbbrev ?? game.awayTeam) ?? game.awayTeamAbbrev ?? game.awayTeam ?? 'TBD'
      const gameDate = game.date ? new Date(game.date) : game.startTime ?? new Date()
      const legacy = legacyMap.get(`${homeTeam}:${awayTeam}:${gameDate.toISOString().slice(0, 10)}`)

      return {
        sportType: sport,
        season,
        weekOrRound: legacy?.week ?? 0,
        externalId: String(game.id ?? game.externalId ?? legacy?.externalId ?? `${sport}:${homeTeam}:${awayTeam}:${gameDate.toISOString()}`),
        homeTeamId: typeof game.homeTeamId === 'string' ? game.homeTeamId : legacy?.homeTeamId ?? null,
        awayTeamId: typeof game.awayTeamId === 'string' ? game.awayTeamId : legacy?.awayTeamId ?? null,
        homeTeam,
        awayTeam,
        startTime: gameDate,
        venue: game.venue ?? legacy?.venue ?? null,
        weather: undefined,
        status: String(game.status ?? legacy?.status ?? 'scheduled').toLowerCase(),
        homeScore: typeof legacy?.homeScore === 'number' ? legacy.homeScore : null,
        awayScore: typeof legacy?.awayScore === 'number' ? legacy.awayScore : null,
      }
    })

    for (const batch of chunk(rows, UPSERT_BATCH_SIZE)) {
      await prisma.$transaction(
        batch.map((row) =>
          prisma.gameSchedule.upsert({
            where: {
              uniq_game_schedule_sport_season_week_external: {
                sportType: row.sportType,
                season: row.season,
                weekOrRound: row.weekOrRound,
                externalId: row.externalId,
              },
            },
            update: {
              homeTeamId: row.homeTeamId,
              awayTeamId: row.awayTeamId,
              homeTeam: row.homeTeam,
              awayTeam: row.awayTeam,
              startTime: row.startTime,
              venue: row.venue,
              weather: row.weather,
              status: row.status,
              homeScore: row.homeScore,
              awayScore: row.awayScore,
            },
            create: row,
          })
        )
      )
      imported += batch.length
    }
  }

  return { imported, sports, season }
}
