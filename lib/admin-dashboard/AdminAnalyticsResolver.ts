/**
 * Resolves analytics breakdowns by sport and time for admin charts.
 * Supports all seven sports: NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER.
 */

import { prisma } from "@/lib/prisma"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import type { LeagueSport } from "@prisma/client"

export interface SportCountItem {
  sport: LeagueSport
  count: number
  label: string
}

const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL",
  NHL: "NHL",
  NBA: "NBA",
  MLB: "MLB",
  NCAAF: "NCAA Football",
  NCAAB: "NCAA Basketball",
  SOCCER: "Soccer",
}

export async function getLeaguesCountBySport(): Promise<SportCountItem[]> {
  const sports = (SUPPORTED_SPORTS as unknown) as LeagueSport[]
  const counts = await prisma.league.groupBy({
    by: ["sport"],
    _count: { id: true },
    where: { sport: { in: sports } },
  })
  const map = new Map(counts.map((c) => [c.sport, c._count.id]))
  return sports.map((sport) => ({
    sport,
    count: map.get(sport) ?? 0,
    label: SPORT_LABELS[sport] ?? sport,
  }))
}

export function getSportLabel(sport: LeagueSport): string {
  return SPORT_LABELS[sport] ?? sport
}
