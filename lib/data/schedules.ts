import 'server-only'

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { DATA_TTLS, isFreshDate, triggerBackgroundRefresh } from '@/lib/data/shared'
import { runScheduleImporter } from '@/lib/workers/schedule-importer'

function currentSeason(): number {
  return new Date().getFullYear()
}

export async function getWeekSchedule(sport: string, week: number) {
  const normalizedSport = normalizeToSupportedSport(sport)
  const season = currentSeason()
  let rows = await prisma.gameSchedule.findMany({
    where: {
      sportType: normalizedSport,
      season,
      weekOrRound: week,
    },
    orderBy: { startTime: 'asc' },
  })

  if (rows.length === 0) {
    await runScheduleImporter({ sports: [normalizedSport], season })
    rows = await prisma.gameSchedule.findMany({
      where: { sportType: normalizedSport, season, weekOrRound: week },
      orderBy: { startTime: 'asc' },
    })
  } else if (!isFreshDate(rows[0]?.updatedAt, DATA_TTLS.schedules)) {
    triggerBackgroundRefresh(`schedule:${normalizedSport}:${season}`, () =>
      runScheduleImporter({ sports: [normalizedSport], season })
    )
  }

  return rows
}

export async function getTeamSchedule(team: string, sport: string) {
  const normalizedSport = normalizeToSupportedSport(sport)
  const season = currentSeason()
  let rows = await prisma.gameSchedule.findMany({
    where: {
      sportType: normalizedSport,
      season,
      OR: [{ homeTeam: team.toUpperCase() }, { awayTeam: team.toUpperCase() }],
    },
    orderBy: { startTime: 'asc' },
  })

  if (rows.length === 0) {
    await runScheduleImporter({ sports: [normalizedSport], season })
    rows = await prisma.gameSchedule.findMany({
      where: {
        sportType: normalizedSport,
        season,
        OR: [{ homeTeam: team.toUpperCase() }, { awayTeam: team.toUpperCase() }],
      },
      orderBy: { startTime: 'asc' },
    })
  } else if (!isFreshDate(rows[0]?.updatedAt, DATA_TTLS.schedules)) {
    triggerBackgroundRefresh(`team-schedule:${normalizedSport}:${team}:${season}`, () =>
      runScheduleImporter({ sports: [normalizedSport], season })
    )
  }

  return rows
}

export async function getPlayoffSchedule(sport: string, season: number) {
  const normalizedSport = normalizeToSupportedSport(sport)
  let rows = await prisma.gameSchedule.findMany({
    where: {
      sportType: normalizedSport,
      season,
      OR: [{ weekOrRound: { gte: 15 } }, { status: 'playoff' }],
    },
    orderBy: { startTime: 'asc' },
  })

  if (rows.length === 0) {
    await runScheduleImporter({ sports: [normalizedSport], season })
    rows = await prisma.gameSchedule.findMany({
      where: {
        sportType: normalizedSport,
        season,
        OR: [{ weekOrRound: { gte: 15 } }, { status: 'playoff' }],
      },
      orderBy: { startTime: 'asc' },
    })
  } else if (!isFreshDate(rows[0]?.updatedAt, DATA_TTLS.schedules)) {
    triggerBackgroundRefresh(`playoff-schedule:${normalizedSport}:${season}`, () =>
      runScheduleImporter({ sports: [normalizedSport], season })
    )
  }

  return rows
}

export async function getUpcomingGames(sport: string, days: number = 7) {
  const normalizedSport = normalizeToSupportedSport(sport)
  const season = currentSeason()
  const now = new Date()
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  let rows = await prisma.gameSchedule.findMany({
    where: {
      sportType: normalizedSport,
      season,
      startTime: {
        gte: now,
        lte: until,
      },
    },
    orderBy: { startTime: 'asc' },
  })

  if (rows.length === 0) {
    await runScheduleImporter({ sports: [normalizedSport], season })
    rows = await prisma.gameSchedule.findMany({
      where: {
        sportType: normalizedSport,
        season,
        startTime: {
          gte: now,
          lte: until,
        },
      },
      orderBy: { startTime: 'asc' },
    })
  } else if (!isFreshDate(rows[0]?.updatedAt, DATA_TTLS.schedules)) {
    triggerBackgroundRefresh(`upcoming-games:${normalizedSport}:${season}`, () =>
      runScheduleImporter({ sports: [normalizedSport], season })
    )
  }

  return rows
}
