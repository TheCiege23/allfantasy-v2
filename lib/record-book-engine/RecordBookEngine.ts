/**
 * RecordBookEngine — run record detection and persist entries.
 */

import { prisma } from '@/lib/prisma'
import { detectRecords } from './RecordDetector'
import { DEFAULT_SPORT, isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

export interface RecordBookEngineResult {
  leagueId: string
  seasonsProcessed: string[]
  entriesCreated: number
  entriesUpdated: number
}

/**
 * Run record book for a league: detect records for the given seasons plus "all" for most_championships.
 * Replaces existing entries for each (leagueId, recordType, season).
 */
export async function runRecordBookEngine(
  leagueId: string,
  seasons: string[],
  options?: { sport?: string | null }
): Promise<RecordBookEngineResult> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true },
  })
  const sport =
    options?.sport && isSupportedSport(options.sport)
      ? normalizeToSupportedSport(options.sport)
      : normalizeToSupportedSport(league?.sport ?? DEFAULT_SPORT)
  let created = 0
  let updated = 0

  const allSeasons = [...new Set([...seasons, 'all'])]

  for (const season of allSeasons) {
    const candidates = await detectRecords(leagueId, season, { sport })
    const existingRows = await prisma.recordBookEntry.findMany({
      where: {
        leagueId,
        season,
        recordType: { in: candidates.map((c) => c.recordType) },
      },
      select: {
        recordType: true,
        season: true,
      },
    })
    const existingKeys = new Set(existingRows.map((row) => `${row.recordType}::${row.season}`))

    for (const c of candidates) {
      const value = c.value
      const data = {
        sport,
        leagueId,
        recordType: c.recordType,
        holderId: c.holderId,
        value,
        season: c.season,
      }
      const key = `${c.recordType}::${c.season}`

      await prisma.recordBookEntry.upsert({
        where: {
          uniq_record_book_league_type_season: {
            leagueId,
            recordType: c.recordType,
            season: c.season,
          },
        },
        create: data,
        update: {
          sport: data.sport,
          holderId: data.holderId,
          value: data.value,
        },
      })
      if (existingKeys.has(key)) updated += 1
      else created += 1
    }
  }

  return {
    leagueId,
    seasonsProcessed: allSeasons,
    entriesCreated: created,
    entriesUpdated: updated,
  }
}
