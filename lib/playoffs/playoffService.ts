import "server-only"
import { prisma } from "@/lib/prisma"
import { buildPlayoffTemplate, getPlayoffRoundOrder } from "./playoffTemplate"
import type { PlayoffChallengeView, PlayoffSport } from "./types"

type SessionUser = { id?: string | null; name?: string | null; email?: string | null }

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function defaultEntryName(user: SessionUser): string {
  if (user.name?.trim()) return `${user.name.trim()} Picks`
  if (user.email?.trim()) return `${user.email.split("@")[0]} Picks`
  return "My Playoff Bracket"
}

export async function createPlayoffBracketChallenge(input: {
  user: SessionUser
  name: string
  sport: PlayoffSport
  seasonYear?: number
  isTestMode?: boolean
}) {
  if (!input.user.id) {
    throw new Error("Authenticated user required")
  }

  const template = buildPlayoffTemplate({
    sport: input.sport,
    seasonYear: input.seasonYear ?? new Date().getUTCFullYear(),
    isTestMode: input.isTestMode,
  })

  const result = await prisma.$transaction(async (tx) => {
    const challenge = await (tx as any).playoffBracketChallenge.create({
      data: {
        ownerUserId: input.user.id,
        name: input.name,
        sport: input.sport,
        seasonYear: input.seasonYear ?? new Date().getUTCFullYear(),
        status: "open",
        isTestMode: Boolean(input.isTestMode),
      },
    })

    const entry = await (tx as any).playoffBracketEntry.create({
      data: {
        challengeId: challenge.id,
        userId: input.user.id,
        name: defaultEntryName(input.user),
      },
    })

    await (tx as any).playoffBracketSeries.createMany({
      data: template.map((series) => ({
        challengeId: challenge.id,
        round: series.round,
        roundIndex: series.roundIndex,
        seriesNumber: series.seriesNumber,
        conference: series.conference,
        homeSeed: series.homeSeed,
        awaySeed: series.awaySeed,
        homeTeamName: series.homeTeamName,
        awayTeamName: series.awayTeamName,
        winnerTeamName: series.winnerTeamName,
        bestOf: series.bestOf,
        status: series.status,
        startsAt: series.startsAt ? new Date(series.startsAt) : null,
        nextSeriesNumber: series.nextSeriesNumber,
        nextSeriesSlot: series.nextSeriesSlot,
        sourceSeriesHome: series.sourceSeriesHome,
        sourceSeriesAway: series.sourceSeriesAway,
      })),
    })

    return {
      challengeId: challenge.id as string,
      entryId: entry.id as string,
    }
  })

  return result
}

export async function getPlayoffBracketView(input: {
  challengeId: string
  user: SessionUser | null
}): Promise<PlayoffChallengeView | null> {
  const challenge = await (prisma as any).playoffBracketChallenge.findUnique({
    where: { id: input.challengeId },
    include: {
      entries: {
        orderBy: { createdAt: "asc" },
      },
      series: {
        orderBy: [{ roundIndex: "asc" }, { seriesNumber: "asc" }],
      },
    },
  })

  if (!challenge) return null

  const userId = input.user?.id ?? null
  const activeEntry =
    (userId
      ? challenge.entries.find((entry: { userId: string }) => entry.userId === userId)
      : challenge.entries[0]) ?? null

  const picks = activeEntry
    ? await (prisma as any).playoffBracketPick.findMany({
        where: { entryId: activeEntry.id },
        orderBy: [{ createdAt: "asc" }],
      })
    : []

  return {
    challenge: {
      id: challenge.id,
      name: challenge.name,
      ownerUserId: challenge.ownerUserId,
      sport: challenge.sport,
      seasonYear: challenge.seasonYear,
      status: challenge.status,
      isTestMode: challenge.isTestMode,
      createdAt: toIso(challenge.createdAt) ?? new Date().toISOString(),
      updatedAt: toIso(challenge.updatedAt) ?? new Date().toISOString(),
    },
    activeEntry: activeEntry
      ? {
          id: activeEntry.id,
          name: activeEntry.name,
          userId: activeEntry.userId,
          createdAt: toIso(activeEntry.createdAt) ?? new Date().toISOString(),
        }
      : null,
    entries: challenge.entries.map((entry: any) => ({
      id: entry.id,
      name: entry.name,
      userId: entry.userId,
      createdAt: toIso(entry.createdAt) ?? new Date().toISOString(),
    })),
    series: challenge.series.map((series: any) => ({
      id: series.id,
      round: series.round,
      roundIndex: series.roundIndex,
      seriesNumber: series.seriesNumber,
      conference: series.conference,
      homeSeed: series.homeSeed,
      awaySeed: series.awaySeed,
      homeTeamName: series.homeTeamName,
      awayTeamName: series.awayTeamName,
      winnerTeamName: series.winnerTeamName,
      bestOf: series.bestOf,
      status: series.status,
      startsAt: toIso(series.startsAt),
      nextSeriesNumber: series.nextSeriesNumber,
      nextSeriesSlot: series.nextSeriesSlot,
    })),
    picks: picks.map((pick: any) => ({
      id: pick.id,
      entryId: pick.entryId,
      seriesId: pick.seriesId,
      pickTeamName: pick.pickTeamName,
      createdAt: toIso(pick.createdAt) ?? new Date().toISOString(),
      updatedAt: toIso(pick.updatedAt) ?? new Date().toISOString(),
    })),
    rounds: getPlayoffRoundOrder(),
  }
}

export async function savePlayoffBracketPick(input: {
  challengeId: string
  entryId: string
  userId: string
  seriesId: string
  pickTeamName: string
}) {
  const entry = await (prisma as any).playoffBracketEntry.findUnique({
    where: { id: input.entryId },
    select: {
      id: true,
      userId: true,
      challengeId: true,
    },
  })

  if (!entry || entry.challengeId !== input.challengeId || entry.userId !== input.userId) {
    throw new Error("Entry not found")
  }

  const series = await (prisma as any).playoffBracketSeries.findUnique({
    where: { id: input.seriesId },
    select: {
      id: true,
      challengeId: true,
      homeTeamName: true,
      awayTeamName: true,
    },
  })

  if (!series || series.challengeId !== input.challengeId) {
    throw new Error("Series not found")
  }

  if (![series.homeTeamName, series.awayTeamName].includes(input.pickTeamName)) {
    throw new Error("Pick team must be one of the teams in this series")
  }

  const pick = await (prisma as any).playoffBracketPick.upsert({
    where: {
      entryId_seriesId: {
        entryId: input.entryId,
        seriesId: input.seriesId,
      },
    },
    create: {
      challengeId: input.challengeId,
      entryId: input.entryId,
      seriesId: input.seriesId,
      pickTeamName: input.pickTeamName,
    },
    update: {
      pickTeamName: input.pickTeamName,
    },
  })

  return pick
}
