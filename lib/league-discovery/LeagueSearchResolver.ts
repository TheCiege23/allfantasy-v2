/**
 * LeagueSearchResolver — text search for league discovery (name, tournament name).
 */

import type { Prisma } from "@prisma/client"

/**
 * Build Prisma where for text search: league name or tournament name contains query (case-insensitive).
 */
export function buildSearchWhere(query: string | null | undefined): Prisma.BracketLeagueWhereInput | undefined {
  const q = typeof query === "string" ? query.trim() : ""
  if (!q || q.length < 2) return undefined

  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { tournament: { name: { contains: q, mode: "insensitive" } } },
    ],
  }
}

export function normalizeSearchQuery(raw: string | null | undefined): string {
  return typeof raw === "string" ? raw.trim().slice(0, 100) : ""
}
