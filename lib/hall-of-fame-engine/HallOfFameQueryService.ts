/**
 * HallOfFameQueryService — query entries and moments by sport, league, season, category.
 */

import { prisma } from '@/lib/prisma'
import { normalizeSportForHallOfFame } from './SportHallOfFameResolver'
import type { HallOfFameQueryFilters, HallOfFameMomentQueryFilters } from './types'

export interface HallOfFameEntryRow {
  id: string
  entityType: string
  entityId: string
  sport: string
  leagueId: string | null
  season: string | null
  category: string
  title: string
  summary: string | null
  inductedAt: Date
  score: number
  metadata: unknown
}

export interface HallOfFameMomentRow {
  id: string
  leagueId: string
  sport: string
  season: string
  headline: string
  summary: string | null
  relatedManagerIds: string[]
  relatedTeamIds: string[]
  relatedMatchupId: string | null
  significanceScore: number
  createdAt: Date
}

function toEntryRow(e: {
  id: string
  entityType: string
  entityId: string
  sport: string
  leagueId: string | null
  season: string | null
  category: string
  title: string
  summary: string | null
  inductedAt: Date
  score: any
  metadata: unknown
}): HallOfFameEntryRow {
  return {
    id: e.id,
    entityType: e.entityType,
    entityId: e.entityId,
    sport: e.sport,
    leagueId: e.leagueId,
    season: e.season,
    category: e.category,
    title: e.title,
    summary: e.summary,
    inductedAt: e.inductedAt,
    score: Number(e.score),
    metadata: e.metadata,
  }
}

function toMomentRow(m: {
  id: string
  leagueId: string
  sport: string
  season: string
  headline: string
  summary: string | null
  relatedManagerIds: string[]
  relatedTeamIds: string[]
  relatedMatchupId: string | null
  significanceScore: any
  createdAt: Date
}): HallOfFameMomentRow {
  return {
    id: m.id,
    leagueId: m.leagueId,
    sport: m.sport,
    season: m.season,
    headline: m.headline,
    summary: m.summary,
    relatedManagerIds: m.relatedManagerIds ?? [],
    relatedTeamIds: m.relatedTeamIds ?? [],
    relatedMatchupId: m.relatedMatchupId,
    significanceScore: Number(m.significanceScore),
    createdAt: m.createdAt,
  }
}

export async function queryHallOfFameEntries(
  filters: HallOfFameQueryFilters
): Promise<{ entries: HallOfFameEntryRow[]; total: number }> {
  const sport = filters.sport ? normalizeSportForHallOfFame(filters.sport) : undefined
  const where: Record<string, unknown> = {}
  if (sport) where.sport = sport
  if (filters.leagueId != null) where.leagueId = filters.leagueId
  if (filters.season != null) where.season = filters.season
  if (filters.category != null) where.category = filters.category
  if (filters.entityType != null) where.entityType = filters.entityType
  if (filters.entityId != null) where.entityId = filters.entityId

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)

  const [entries, total] = await Promise.all([
    prisma.hallOfFameEntry.findMany({
      where,
      orderBy: [{ score: 'desc' }, { inductedAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.hallOfFameEntry.count({ where }),
  ])

  const rows: HallOfFameEntryRow[] = entries.map(toEntryRow)

  return { entries: rows, total }
}

export async function queryHallOfFameMoments(
  filters: HallOfFameMomentQueryFilters
): Promise<{ moments: HallOfFameMomentRow[]; total: number }> {
  const sport = filters.sport ? normalizeSportForHallOfFame(filters.sport) : undefined
  const where: Record<string, unknown> = {}
  if (filters.leagueId != null) where.leagueId = filters.leagueId
  if (sport) where.sport = sport
  if (filters.season != null) where.season = filters.season

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)

  const [moments, total] = await Promise.all([
    prisma.hallOfFameMoment.findMany({
      where,
      orderBy: [{ significanceScore: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.hallOfFameMoment.count({ where }),
  ])

  const rows: HallOfFameMomentRow[] = moments.map(toMomentRow)

  return { moments: rows, total }
}

export async function getEntryById(entryId: string): Promise<HallOfFameEntryRow | null> {
  const e = await prisma.hallOfFameEntry.findUnique({ where: { id: entryId } })
  if (!e) return null
  return toEntryRow(e)
}

export async function getEntryByIdScoped(input: {
  entryId: string
  leagueId?: string | null
}): Promise<HallOfFameEntryRow | null> {
  const e = await prisma.hallOfFameEntry.findFirst({
    where: {
      id: input.entryId,
      ...(input.leagueId != null ? { leagueId: input.leagueId } : {}),
    },
  })
  if (!e) return null
  return toEntryRow(e)
}

export async function getMomentById(momentId: string): Promise<HallOfFameMomentRow | null> {
  const m = await prisma.hallOfFameMoment.findUnique({ where: { id: momentId } })
  if (!m) return null
  return toMomentRow(m)
}

export async function getMomentByIdScoped(input: {
  momentId: string
  leagueId?: string | null
}): Promise<HallOfFameMomentRow | null> {
  const m = await prisma.hallOfFameMoment.findFirst({
    where: {
      id: input.momentId,
      ...(input.leagueId != null ? { leagueId: input.leagueId } : {}),
    },
  })
  if (!m) return null
  return toMomentRow(m)
}
