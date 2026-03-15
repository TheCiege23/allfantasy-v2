/**
 * RecordBookEngine — run record detection and persist entries.
 */

import { prisma } from '@/lib/prisma'
import { detectRecords } from './RecordDetector'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

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
  const sport = options?.sport ?? DEFAULT_SPORT
  let created = 0
  let updated = 0

  const allSeasons = [...new Set([...seasons, 'all'])]

  for (const season of allSeasons) {
    const candidates = await detectRecords(leagueId, season, { sport })

    for (const c of candidates) {
      const existing = await prisma.recordBookEntry.findUnique({
        where: {
          uniq_record_book_league_type_season: {
            leagueId,
            recordType: c.recordType,
            season: c.season,
          },
        },
      })

      const value = c.value
      const data = {
        sport,
        leagueId,
        recordType: c.recordType,
        holderId: c.holderId,
        value,
        season: c.season,
      }

      if (existing) {
        await prisma.recordBookEntry.update({
          where: { id: existing.id },
          data: { holderId: data.holderId, value: data.value },
        })
        updated += 1
      } else {
        await prisma.recordBookEntry.create({ data })
        created += 1
      }
    }
  }

  return {
    leagueId,
    seasonsProcessed: allSeasons,
    entriesCreated: created,
    entriesUpdated: updated,
  }
}
