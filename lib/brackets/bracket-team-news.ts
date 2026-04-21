import "server-only"

import { prisma } from "@/lib/prisma"
import { bracketSportToLeagueSport } from "@/lib/brackets/espn-playoff-sync"
import { normalizeTeamAbbrev } from "@/lib/team-abbrev"

export type BracketTeamNewsLine = {
  title: string
  url: string | null
}

function normAbbrev(s: string | null | undefined): string {
  return (normalizeTeamAbbrev(String(s ?? "").trim()) || String(s ?? "").trim()).toUpperCase()
}

function sportQueryVariants(sportRaw: string): string[] {
  const league = bracketSportToLeagueSport(sportRaw)
  const raw = String(sportRaw ?? "").trim()
  return Array.from(
    new Set(
      [league, raw.toUpperCase(), raw.toLowerCase(), league.toLowerCase()].filter(
        (s): s is string => Boolean(s && s.length > 0),
      ),
    ),
  )
}

/**
 * Latest headline per team abbrev from `SportsNews` for bracket rows (polls `/api/bracket/live` + SSR).
 */
export async function fetchTeamNewsForBracket(params: {
  sportRaw: string
  teamAbbrevs: string[]
}): Promise<Record<string, BracketTeamNewsLine>> {
  const requested = Array.from(
    new Set(params.teamAbbrevs.map(normAbbrev).filter(Boolean)),
  ).slice(0, 64)
  if (requested.length === 0) return {}

  const requestedSet = new Set(requested)
  const sportFilter = { in: sportQueryVariants(params.sportRaw) }
  const lookback = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const articles = await prisma.sportsNews.findMany({
    where: {
      sport: sportFilter,
      OR: [{ team: { in: requested } }, { teams: { hasSome: requested } }],
      publishedAt: { gte: lookback },
    },
    orderBy: { publishedAt: "desc" },
    take: 200,
    select: {
      team: true,
      teams: true,
      title: true,
      sourceUrl: true,
      publishedAt: true,
    },
  })

  const out: Record<string, BracketTeamNewsLine> = {}

  for (const a of articles) {
    const keys = new Set<string>()
    if (a.team) keys.add(normAbbrev(a.team))
    for (const t of a.teams) keys.add(normAbbrev(t))
    for (const k of keys) {
      if (requestedSet.has(k) && !out[k]) {
        out[k] = { title: a.title, url: a.sourceUrl ?? null }
      }
    }
    if (Object.keys(out).length >= requested.length) break
  }

  return out
}
