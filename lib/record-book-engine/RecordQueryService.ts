/**
 * RecordQueryService — query record book entries by id, list by league/type/season; build explain.
 */

import { prisma } from '@/lib/prisma'
import { RECORD_LABELS } from './types'
import type { RecordType, RecordBookEntryView } from './types'
import { detectRecords } from './RecordDetector'

export async function getRecordById(recordId: string): Promise<RecordBookEntryView | null> {
  const r = await prisma.recordBookEntry.findUnique({
    where: { id: recordId },
  })
  if (!r) return null
  return {
    recordId: r.id,
    sport: r.sport,
    leagueId: r.leagueId,
    recordType: r.recordType,
    recordLabel: RECORD_LABELS[r.recordType as RecordType] ?? r.recordType,
    holderId: r.holderId,
    value: Number(r.value),
    season: r.season,
    createdAt: r.createdAt,
  }
}

export async function getRecordByIdInLeague(
  leagueId: string,
  recordId: string
): Promise<RecordBookEntryView | null> {
  const r = await prisma.recordBookEntry.findFirst({
    where: { id: recordId, leagueId },
  })
  if (!r) return null
  return {
    recordId: r.id,
    sport: r.sport,
    leagueId: r.leagueId,
    recordType: r.recordType,
    recordLabel: RECORD_LABELS[r.recordType as RecordType] ?? r.recordType,
    holderId: r.holderId,
    value: Number(r.value),
    season: r.season,
    createdAt: r.createdAt,
  }
}

export async function listRecords(options: {
  leagueId: string
  sport?: string | null
  recordType?: string | null
  season?: string | null
  limit?: number
}): Promise<RecordBookEntryView[]> {
  const where: { leagueId: string; sport?: string; recordType?: string; season?: string } = {
    leagueId: options.leagueId,
  }
  if (options.sport) where.sport = options.sport
  if (options.recordType) where.recordType = options.recordType
  if (options.season) where.season = options.season
  const limit = Math.min(options.limit ?? 100, 200)

  const rows = await prisma.recordBookEntry.findMany({
    where,
    orderBy: [{ season: 'desc' }, { value: 'desc' }],
    take: limit,
  })

  return rows.map((r) => ({
    recordId: r.id,
    sport: r.sport,
    leagueId: r.leagueId,
    recordType: r.recordType,
    recordLabel: RECORD_LABELS[r.recordType as RecordType] ?? r.recordType,
    holderId: r.holderId,
    value: Number(r.value),
    season: r.season,
    createdAt: r.createdAt,
  }))
}

export async function getSeasonsWithRecords(leagueId: string): Promise<string[]> {
  const rows = await prisma.recordBookEntry.findMany({
    where: { leagueId },
    distinct: ['season'],
    select: { season: true },
    orderBy: { season: 'desc' },
  })
  return rows.map((r) => r.season)
}

export function buildRecordExplanation(entry: RecordBookEntryView, context?: string | null): string {
  const parts: string[] = []
  parts.push(
    `${entry.recordLabel} (${entry.season}): ${entry.holderId} holds the record with value ${entry.value}.`
  )
  if (context && context.trim()) {
    parts.push(`Context: ${context.trim()}.`)
  }
  return parts.join(' ')
}

export async function resolveRecordExplanation(entry: RecordBookEntryView): Promise<string> {
  try {
    const candidates = await detectRecords(entry.leagueId, entry.season, { sport: entry.sport })
    const candidate = candidates.find(
      (row) => row.recordType === entry.recordType && row.holderId === entry.holderId
    )
    return buildRecordExplanation(entry, candidate?.context ?? null)
  } catch {
    return buildRecordExplanation(entry, null)
  }
}
