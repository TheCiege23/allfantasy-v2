/**
 * Admin league management: by sport, largest, recent, flagged (sync error).
 * Supports all seven sports: NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER.
 */

import { prisma } from "@/lib/prisma"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import type { LeagueSport } from "@prisma/client"
import type { LeagueOverviewItem, LeagueOverviewBySport } from "./types"

const DEFAULT_PAGE_SIZE = 25

export async function getActiveLeaguesBySport(): Promise<LeagueOverviewBySport[]> {
  const sports = (SUPPORTED_SPORTS as unknown) as LeagueSport[]
  const counts = await prisma.league.groupBy({
    by: ["sport"],
    _count: { id: true },
    where: { sport: { in: sports } },
  })
  const map = new Map(counts.map((c) => [c.sport, c._count.id]))
  return sports.map((sport) => ({ sport, count: map.get(sport) ?? 0 }))
}

export async function getLargestLeagues(limit: number = DEFAULT_PAGE_SIZE): Promise<LeagueOverviewItem[]> {
  const leagues = await prisma.league.findMany({
    where: { leagueSize: { not: null } },
    orderBy: { leagueSize: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      sport: true,
      leagueSize: true,
      userId: true,
      createdAt: true,
      status: true,
      syncError: true,
    },
  })
  return leagues.map((l) => ({
    id: l.id,
    name: l.name,
    sport: l.sport,
    leagueSize: l.leagueSize,
    userId: l.userId,
    createdAt: l.createdAt,
    status: l.status,
    syncError: l.syncError,
  }))
}

export async function getRecentlyCreatedLeagues(limit: number = DEFAULT_PAGE_SIZE): Promise<LeagueOverviewItem[]> {
  const leagues = await prisma.league.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      sport: true,
      leagueSize: true,
      userId: true,
      createdAt: true,
      status: true,
      syncError: true,
    },
  })
  return leagues.map((l) => ({
    id: l.id,
    name: l.name,
    sport: l.sport,
    leagueSize: l.leagueSize,
    userId: l.userId,
    createdAt: l.createdAt,
    status: l.status,
    syncError: l.syncError,
  }))
}

export async function getFlaggedLeagues(limit: number = DEFAULT_PAGE_SIZE): Promise<LeagueOverviewItem[]> {
  const leagues = await prisma.league.findMany({
    where: { syncError: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      sport: true,
      leagueSize: true,
      userId: true,
      createdAt: true,
      status: true,
      syncError: true,
    },
  })
  return leagues.map((l) => ({
    id: l.id,
    name: l.name,
    sport: l.sport,
    leagueSize: l.leagueSize,
    userId: l.userId,
    createdAt: l.createdAt,
    status: l.status,
    syncError: l.syncError,
  }))
}
